const ALLOWED = [
  'torrid.com','lanebryant.com','maurices.com','eloquii.com','landsend.com',
  'universalstandard.com','gap.com','oldnavy.gap.com','kohls.com','jcpenney.com',
  'bloomchic.com','glamorise.com',
  'cloudfront.net','scene7.com','akamaihd.net','shopifycdn.com','cdn.shopify.com',
  'images.ctfassets.net','imgix.net','fastly.net'
]

function allowedHost(hostname) {
  const h = hostname.toLowerCase()
  return ALLOWED.some(base => h === base || h.endsWith('.' + base))
}

export default async function handler(req, res) {
  const raw = req.query?.url
  if (!raw) return res.status(400).end('Missing image URL')
  let url
  try { url = new URL(raw) } catch { return res.status(400).end('Bad URL') }
  if (url.protocol !== 'https:' || !allowedHost(url.hostname)) return res.status(403).end('Image host not allowed')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const r = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'user-agent':'Mozilla/5.0 (compatible; ForHollie/1.0)', 'accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' }
    })
    clearTimeout(timer)
    if (!r.ok) return res.status(r.status).end('Image unavailable')
    const type = r.headers.get('content-type') || ''
    if (!type.startsWith('image/')) return res.status(415).end('Not an image')
    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000')
    return res.status(200).send(buf)
  } catch {
    clearTimeout(timer)
    return res.status(502).end('Image unavailable')
  }
}