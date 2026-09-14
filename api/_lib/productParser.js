const ENTITY_MAP = { '&amp;':'&', '&quot;':'"', '&#39;':"'", '&lt;':'<', '&gt;':'>' }
const decode = s => String(s||'').replace(/&(amp|quot|#39|lt|gt);/g,m=>ENTITY_MAP[m]||m)
const absolute = (value, base) => { try { return new URL(value, base).href } catch { return null } }
const arr = v => Array.isArray(v) ? v : v == null ? [] : [v]

function meta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key.replace(':','\\:')}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key.replace(':','\\:')}["'][^>]*>`, 'i')
  ]
  for (const p of patterns) { const m=html.match(p); if(m) return decode(m[1]) }
  return null
}

function jsonLdBlocks(html) {
  const out=[]; const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m
  while((m=re.exec(html))) { try { out.push(JSON.parse(m[1].trim())) } catch {} }
  return out
}

function walk(node, fn, depth=0) {
  if (depth>12 || node==null) return
  fn(node)
  if (Array.isArray(node)) node.forEach(x=>walk(x,fn,depth+1))
  else if (typeof node==='object') Object.values(node).forEach(x=>walk(x,fn,depth+1))
}

function productNode(blocks) {
  let found=null
  for (const b of blocks) walk(b, n=>{
    if(found || !n || typeof n!=='object') return
    const t=n['@type']; if(t==='Product' || (Array.isArray(t)&&t.includes('Product'))) found=n
  })
  return found
}

function collectImages(html, product, url) {
  const values=[]
  const add=v=>arr(v).forEach(x=>{ if(typeof x==='string'){const a=absolute(decode(x),url); if(a && /^https?:/.test(a)) values.push(a)} else if(x?.url) add(x.url) })
  add(product?.image)
  add(meta(html,'og:image')); add(meta(html,'twitter:image'))
  const imgRe=/<img[^>]+(?:src|data-src|data-zoom-image)=["']([^"']+)["'][^>]*>/gi; let m
  while((m=imgRe.exec(html)) && values.length<40) add(m[1])
  return [...new Set(values)].filter(x=>!x.startsWith('data:')).slice(0,12)
}

function number(v) { const n=Number(String(v??'').replace(/[^0-9.]/g,'')); return Number.isFinite(n)&&n>0?n:null }
function availability(v) { const s=String(v||'').toLowerCase(); if(s.includes('outofstock')||s.includes('out_of_stock')||s==='false') return false; if(s.includes('instock')||s.includes('in_stock')||s==='true'||s.includes('limitedavailability')) return true; return null }

function extractOffers(product) {
  const offers=[]
  walk(product?.offers, n=>{
    if(!n || typeof n!=='object' || Array.isArray(n)) return
    if(n.price!=null || n.lowPrice!=null || n.highPrice!=null) offers.push(n)
  })
  return offers
}

function extractVariants(blocks, product, html) {
  const variants=[]; const seen=new Set()
  const add=(size, price, regular, stock, sku, color)=>{
    size=String(size||'').trim(); if(!size || size.length>24) return
    const key=[size,color||'',sku||''].join('|'); if(seen.has(key)) return; seen.add(key)
    variants.push({size,price:number(price),regularPrice:number(regular),inStock:stock,sku:sku?String(sku):null,color:color?String(color):null})
  }
  const inspect=n=>{
    if(!n || typeof n!=='object' || Array.isArray(n)) return
    const keys=Object.keys(n); const sizeKey=keys.find(k=>/^(size|sizeName|displaySize|variationSize|attributeSize)$/i.test(k) || /size/i.test(k)&&typeof n[k]==='string')
    if(!sizeKey) return
    const size=n[sizeKey]
    const price=n.salePrice ?? n.currentPrice ?? n.price ?? n.offerPrice ?? n.finalPrice
    const regular=n.regularPrice ?? n.listPrice ?? n.originalPrice ?? n.msrp ?? n.standardPrice
    const stock=availability(n.availability ?? n.inventoryStatus ?? n.stockStatus ?? n.inStock ?? n.available)
    add(size,price,regular,stock,n.sku??n.id??n.productId,n.color??n.colorName)
  }
  blocks.forEach(b=>walk(b,inspect)); walk(product?.hasVariant,inspect)
  if(!variants.length) {
    const sizeRe=/["'](?:size|sizeName|displaySize)["']\s*:\s*["']([^"']{1,18})["']/gi; let m
    while((m=sizeRe.exec(html)) && variants.length<80) add(m[1],null,null,null,null,null)
  }
  return variants.slice(0,120)
}

export function inferCategory(name='', url='') {
  const s=`${name} ${url}`.toLowerCase()
  if(/bra|bralette|panty|panties|intimate|lingerie/.test(s)) return 'Intimates'
  if(/jean|pant|legging|skirt|short/.test(s)) return 'Bottoms'
  if(/dress|gown|jumpsuit|romper/.test(s)) return 'Dresses'
  if(/cardigan|jacket|coat|blazer|sweater|shacket|duster|wrap/.test(s)) return 'Layers'
  if(/sneaker|shoe|boot|flat|loafer|sandal|slipper/.test(s)) return 'Shoes'
  if(/swim|swimsuit|tankini|bikini/.test(s)) return 'Swim'
  if(/pajama|sleep|robe|lounge/.test(s)) return 'Lounge'
  if(/active|workout|yoga|performance/.test(s)) return 'Active'
  if(/bag|handbag|crossbody|belt|earring|necklace|bracelet|scarf|tights|hair/.test(s)) return 'Accessories'
  return 'Tops'
}

export function parseProductPage(html, url) {
  const blocks=jsonLdBlocks(html); const product=productNode(blocks)||{}
  const offers=extractOffers(product)
  const current=number(offers[0]?.price ?? offers[0]?.lowPrice ?? product?.offers?.price ?? meta(html,'product:price:amount'))
  const regexNumber=(...names)=>{for(const n of names){const m=html.match(new RegExp(`["']${n}["']\\s*:\\s*(?:["'])?([0-9]+(?:\\.[0-9]+)?)`,'i'));if(m)return number(m[1])}return null}
  const regular=regexNumber('regularPrice','listPrice','originalPrice','msrp') || current
  const name=decode(product?.name || meta(html,'og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Product').replace(/\s+/g,' ').trim()
  const brand=typeof product?.brand==='string'?product.brand:product?.brand?.name || meta(html,'product:brand') || null
  const images=collectImages(html,product,url)
  const variants=extractVariants(blocks,product,html)
  const color=product?.color || meta(html,'product:color') || null
  const stock=availability(offers[0]?.availability ?? product?.offers?.availability)
  const category=inferCategory(name,url)
  return { name, brand, images, currentPrice:current, regularPrice:regular, color, stock, category, variants, sku:product?.sku||product?.productID||null, description:product?.description||meta(html,'og:description')||null }
}

export async function fetchProduct(url, {timeoutMs=12000}={}) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs)
  try {
    const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; ForHollie/1.0; +https://vercel.app)','accept':'text/html,application/xhtml+xml','accept-language':'en-US,en;q=0.9'}})
    if(!r.ok) throw new Error(`Retailer returned ${r.status}`)
    const type=r.headers.get('content-type')||''; if(!type.includes('text/html')) throw new Error('URL did not return a product page')
    const html=await r.text(); return { finalUrl:r.url, html, parsed:parseProductPage(html,r.url) }
  } finally { clearTimeout(timer) }
}

export function normalizeSize(v='') { return String(v).trim().toLowerCase().replace(/\s+/g,'').replace(/xxxlarge|3xl/g,'3x').replace(/xxxl/g,'3x') }

export function sizeMatches(candidate, preferred, retailerSlug, category) {
  const c=normalizeSize(candidate), p=normalizeSize(preferred)
  if(!c||!p) return false
  if(c===p) return true
  if(retailerSlug==='torrid' && p==='3x' && (c==='3'||c==='size3')) return true
  if(retailerSlug==='torrid' && /^24(?:-26|\/26)?$/.test(p) && (c==='3'||c==='size3')) return category!=='Bottoms'
  if(p==='24' && /^24(?:\.0)?$/.test(c)) return true
  if(p==='50d' && c.replace('-','')==='50d') return true
  return false
}
