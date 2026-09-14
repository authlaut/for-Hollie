const RETAILERS = [
  { name: 'Torrid', hosts: ['torrid.com','www.torrid.com'] },
  { name: 'Lane Bryant / Cacique', hosts: ['lanebryant.com','www.lanebryant.com'] },
  { name: 'Maurices', hosts: ['maurices.com','www.maurices.com'] },
  { name: 'ELOQUII', hosts: ['eloquii.com','www.eloquii.com'] },
  { name: "Lands' End", hosts: ['landsend.com','www.landsend.com'] },
  { name: 'Universal Standard', hosts: ['universalstandard.com','www.universalstandard.com'] },
  { name: 'Old Navy', hosts: ['oldnavy.gap.com'] },
  { name: "Kohl's", hosts: ['kohls.com','www.kohls.com'] },
  { name: 'JCPenney', hosts: ['jcpenney.com','www.jcpenney.com'] },
  { name: 'BloomChic', hosts: ['bloomchic.com','www.bloomchic.com'] },
  { name: 'Glamorise', hosts: ['glamorise.com','www.glamorise.com'] }
]

function retailerForHost(hostname) {
  const host = hostname.toLowerCase()
  return RETAILERS.find(r => r.hosts.some(h => host === h || host.endsWith('.' + h.replace(/^www\./,'')))) || null
}

function decodeHtml(value='') {
  return String(value)
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&apos;/g,"'")
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
}

function meta(html, key, attr='property') {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${esc}["'][^>]*>`, 'i')
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return decodeHtml(m[1])
  }
  return null
}

function canonical(html, fallback) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i)
  return m ? decodeHtml(m[1]) : fallback
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

function allJsonLd(html) {
  const out = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html))) {
    const parsed = safeJson(decodeHtml(m[1]).trim())
    if (parsed) out.push(parsed)
  }
  return out
}

function flattenJsonLd(node, out=[]) {
  if (!node) return out
  if (Array.isArray(node)) {
    node.forEach(x => flattenJsonLd(x,out))
    return out
  }
  if (typeof node === 'object') {
    out.push(node)
    if (node['@graph']) flattenJsonLd(node['@graph'],out)
  }
  return out
}

function isProduct(node) {
  const t = node?.['@type']
  return t === 'Product' || (Array.isArray(t) && t.includes('Product'))
}

function imageFromProduct(p) {
  const img = p?.image
  if (!img) return null
  if (typeof img === 'string') return img
  if (Array.isArray(img)) {
    const first = img[0]
    if (typeof first === 'string') return first
    return first?.url || first?.contentUrl || null
  }
  return img.url || img.contentUrl || null
}

function offerFromProduct(p) {
  const offers = p?.offers
  const list = Array.isArray(offers) ? offers : offers ? [offers] : []
  for (const offer of list) {
    if (!offer) continue
    const price = offer.price ?? offer.lowPrice
    if (price != null) return { price, currency: offer.priceCurrency || null, availability: offer.availability || null }
  }
  return {}
}

function cleanTitle(title, retailer) {
  if (!title) return null
  let out = decodeHtml(title).replace(/\s+/g,' ').trim()
  const suffixes = [
    retailer?.name, 'Torrid', 'Lane Bryant', 'Maurices', 'ELOQUII', "Lands' End",
    'Universal Standard', 'Old Navy', "Kohl's", 'JCPenney', 'BloomChic', 'Glamorise'
  ].filter(Boolean)
  suffixes.forEach(s => {
    out = out.replace(new RegExp(`\\s*[|–—-]\\s*${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}.*$`,'i'),'').trim()
  })
  return out
}

function categoryGuess(text='') {
  const s = text.toLowerCase()
  if (/(bra|bralette|panty|panties|lingerie|slip short|shapewear|cami)/.test(s)) return 'Intimates'
  if (/(dress|gown)/.test(s)) return 'Dresses'
  if (/(cardigan|jacket|coat|blazer|shacket|duster|wrap|sweater)/.test(s)) return 'Layers'
  if (/(jean|pant|trouser|legging|skirt|shorts?)/.test(s)) return 'Bottoms'
  if (/(pajama|sleep|robe|nightgown|lounge)/.test(s)) return 'Lounge'
  if (/(sneaker|shoe|boot|flat|loafer|sandal|slipper)/.test(s)) return 'Shoes'
  if (/(swim|swimsuit|tankini|bikini|cover-up|coverup)/.test(s)) return 'Swim'
  if (/(bag|handbag|crossbody|belt|earring|necklace|bracelet|scarf|tights|hosiery)/.test(s)) return 'Accessories'
  if (/(workout|active|athletic|yoga|performance)/.test(s)) return 'Active'
  return 'Tops'
}

function subcategoryGuess(category, text='') {
  const s = text.toLowerCase()
  const rules = {
    Tops: [
      [/t-?shirt|tee\b/,'T-Shirts'], [/blouse/,'Blouses'], [/tank|cami/,'Tanks & Camis'],
      [/hoodie|sweatshirt/,'Sweatshirts / Hoodies'], [/long sleeve/,'Long-Sleeve Basics']
    ],
    Bottoms: [
      [/jean/,'Jeans'], [/ponte|knit pant/,'Ponte / Knit Pants'], [/wide.?leg/,'Wide-Leg Pants'],
      [/legging/,'Leggings'], [/skirt/,'Skirts'], [/short/,'Shorts']
    ],
    Dresses: [
      [/maxi/,'Maxi Dresses'], [/sweater|knit/,'Sweater / Knit Dresses'], [/cocktail|occasion|formal/,'Special-Occasion Dresses']
    ],
    Layers: [
      [/cardigan/,'Cardigans'], [/duster|wrap/,'Wraps / Dusters'], [/shacket/,'Shackets'], [/denim jacket/,'Denim Jackets'],
      [/utility/,'Utility Jackets'], [/blazer/,'Blazers'], [/rain/,'Rain Jackets'], [/trench/,'Trench Coats'], [/coat/,'Lightweight Coats'], [/sweater/,'Sweaters']
    ],
    Intimates: [
      [/sports? bra/,'Sports Bras'], [/bralette|lounge bra/,'Lounge / Comfort Bras'], [/strapless/,'Strapless / Specialty Bras'],
      [/panty|panties/,'Everyday Panties'], [/slip short|anti.?chafe/,'Slip Shorts / Anti-Chafe'], [/slip\b/,'Slips'], [/bra/,'Everyday Bras']
    ],
    Active: [[/tee|shirt/,'Workout Tees'], [/legging/,'Workout Leggings'], [/yoga|athleisure|pant/,'Yoga / Athleisure Pants'], [/short/,'Active Shorts'], [/jacket|zip/,'Active Jackets / Zip Layers']],
    Lounge: [[/pajama|pj/,'Pajama Sets'], [/robe/,'Robes'], [/nightgown|sleep dress/,'Nightgowns / Sleep Dresses'], [/pant/,'Home Comfort Pants']],
    Shoes: [[/sneaker/,'Everyday Sneakers'], [/flat/,'Flats'], [/mary jane/,'Mary Janes'], [/loafer/,'Loafers'], [/slip.?on/,'Slip-Ons'], [/boot/,'Boots'], [/sandal/,'Sandals'], [/slipper/,'Slippers / House Shoes']],
    Swim: [[/one.?piece/,'One-Piece'], [/two.?piece|bikini/,'Two-Piece'], [/tankini/,'Tankini'], [/swim dress/,'Swim Dress'], [/cover/,'Cover-Ups']],
    Accessories: [[/crossbody/,'Crossbody Bags'], [/handbag|purse/,'Everyday Handbags'], [/belt/,'Belts'], [/earring/,'Earrings'], [/necklace/,'Necklaces'], [/bracelet/,'Bracelets'], [/scarf/,'Scarves'], [/tight|hosiery/,'Hosiery / Tights']]
  }
  const found = (rules[category] || []).find(([re]) => re.test(s))
  if (found) return found[1]
  const defaults = {
    Tops:'Casual Tops', Bottoms:'Casual Pants', Dresses:'Casual Dresses', Layers:'Sweaters',
    Intimates:'Everyday Bras', Active:'Workout Tees', Lounge:'Lounge Sets', Shoes:'Everyday Sneakers',
    Swim:'One-Piece', Accessories:'Everyday Handbags'
  }
  return defaults[category] || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' })

  const rawUrl = req.body?.url
  if (!rawUrl) return res.status(400).json({ error: 'A retailer URL is required.' })

  let url
  try { url = new URL(rawUrl) } catch { return res.status(400).json({ error: 'That does not look like a valid URL.' }) }
  if (url.protocol !== 'https:') return res.status(400).json({ error: 'Only HTTPS retailer links are supported.' })

  const retailer = retailerForHost(url.hostname)
  if (!retailer) return res.status(400).json({ error: 'That store is not enabled for automatic import yet.' })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)

  try {
    const response = await fetch(url.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ForHollie/1.0; +https://vercel.app)',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9'
      }
    })
    clearTimeout(timer)

    if (!response.ok) {
      return res.status(502).json({ error: `${retailer.name} returned ${response.status}. You can still enter the item manually.` })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) return res.status(502).json({ error: 'The retailer did not return a product page.' })

    const html = await response.text()
    const nodes = allJsonLd(html).flatMap(x => flattenJsonLd(x))
    const product = nodes.find(isProduct) || null
    const offer = offerFromProduct(product)

    const title = product?.name || meta(html,'og:title') || meta(html,'twitter:title','name') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || null)
    const description = product?.description || meta(html,'og:description') || meta(html,'description','name')
    const imageUrl = imageFromProduct(product) || meta(html,'og:image') || meta(html,'twitter:image','name')
    const brand = typeof product?.brand === 'string' ? product.brand : product?.brand?.name || retailer.name.replace(' / Cacique','')
    const color = product?.color || null
    const cleanedTitle = cleanTitle(title, retailer)
    const combined = `${cleanedTitle || ''} ${product?.category || ''} ${description || ''}`
    const category = categoryGuess(combined)
    const subcategory = subcategoryGuess(category, combined)

    return res.status(200).json({
      retailer: retailer.name,
      canonicalUrl: canonical(html, response.url || url.toString()),
      name: cleanedTitle,
      brand,
      color,
      category,
      subcategory,
      imageUrl,
      price: offer.price != null ? Number(offer.price) : null,
      currency: offer.currency || 'USD',
      availability: offer.availability || null,
      description: description ? decodeHtml(description).replace(/\s+/g,' ').trim().slice(0,600) : null
    })
  } catch (err) {
    clearTimeout(timer)
    const msg = err?.name === 'AbortError'
      ? 'The retailer took too long to respond. Try again or enter the item manually.'
      : 'The retailer blocked automatic import or the page could not be read. You can still enter the item manually.'
    return res.status(502).json({ error: msg })
  }
}