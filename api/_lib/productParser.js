const ENTITY_MAP = { '&amp;':'&', '&quot;':'"', '&#39;':"'", '&lt;':'<', '&gt;':'>' }
const decode = s => String(s||'').replace(/&(amp|quot|#39|lt|gt);/g,m=>ENTITY_MAP[m]||m)
const absolute = (value, base) => { try { return new URL(value, base).href } catch { return null } }
const arr = v => Array.isArray(v) ? v : v == null ? [] : [v]

function meta(html, key) {
  const safe=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${safe}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${safe}["'][^>]*>`, 'i')
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
  if (depth>14 || node==null) return
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
  const add=v=>arr(v).forEach(x=>{
    if(typeof x==='string'){
      const raw=decode(x).replace(/\\u002F/g,'/').replace(/\\\//g,'/')
      const a=absolute(raw,url); if(a && /^https?:/.test(a)) values.push(a)
    } else if(x?.url) add(x.url)
  })
  add(product?.image); add(meta(html,'og:image')); add(meta(html,'twitter:image')); add(meta(html,'twitter:image:src'))
  const imgRe=/<img[^>]+(?:src|data-src|data-zoom-image|data-original)=["']([^"']+)["'][^>]*>/gi; let m
  while((m=imgRe.exec(html)) && values.length<70) add(m[1])
  const srcsetRe=/(?:srcset|data-srcset)=["']([^"']+)["']/gi
  while((m=srcsetRe.exec(html)) && values.length<90){for(const part of m[1].split(',')){add(part.trim().split(/\s+/)[0])}}
  // Many commerce sites embed image URLs in JSON state rather than <img> tags.
  const jsonImgRe=/["'](?:image|imageUrl|imageURL|largeImage|zoomImage|hiResImage)["']\s*:\s*["'](https?:\\?\/\\?\/[^"']+)["']/gi
  while((m=jsonImgRe.exec(html)) && values.length<120) add(m[1])
  return [...new Set(values)]
    .filter(x=>!x.startsWith('data:') && !/logo|sprite|icon|swatch|tracking|pixel/i.test(x))
    .slice(0,20)
}

function number(v) { const n=Number(String(v??'').replace(/[^0-9.]/g,'')); return Number.isFinite(n)&&n>0?n:null }
function availability(v) { const s=String(v||'').toLowerCase(); if(s.includes('outofstock')||s.includes('out_of_stock')||s.includes('out of stock')||s==='false'||s==='0') return false; if(s.includes('instock')||s.includes('in_stock')||s.includes('in stock')||s==='true'||s==='1'||s.includes('limitedavailability')||s.includes('available')) return true; return null }

function extractOffers(product) {
  const offers=[]
  walk(product?.offers, n=>{
    if(!n || typeof n!=='object' || Array.isArray(n)) return
    if(n.price!=null || n.lowPrice!=null || n.highPrice!=null) offers.push(n)
  })
  return offers
}

function extractTextPrices(html,current){
  const text=decode(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '))
  const pairs=[
    /\$\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:Comp\.?\s*Value|Comparable\s*Value|Regular(?:\s*Price)?|Original(?:\s*Price)?|Was)\s*:?\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:Sale(?:\s*Price)?|Now)\s*:?\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?).{0,80}?(?:Regular(?:\s*Price)?|Original(?:\s*Price)?|Was)\s*:?\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)/i
  ]
  for(const re of pairs){const m=text.match(re); if(m){const a=number(m[1]),b=number(m[2]);if(a&&b&&b>a)return{current:a,regular:b}}}
  // Torrid often renders: "$31.99 Comp. Value: $99.90".
  const comp=[...text.matchAll(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)\s*Comp\.?\s*Value\s*:?\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)/gi)]
    .map(m=>({current:number(m[1]),regular:number(m[2])})).filter(x=>x.current&&x.regular&&x.regular>x.current)
  if(comp.length) return comp.sort((a,b)=>(b.regular-b.current)-(a.regular-a.current))[0]
  const prices=[...text.matchAll(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/g)].map(m=>number(m[1])).filter(Boolean)
  const unique=[...new Set(prices)].filter(x=>x>=3&&x<1000).sort((a,b)=>a-b)
  if(current && unique.length){const regular=[...unique].reverse().find(x=>x>current*1.12);if(regular)return{current,regular}}
  return {current:null,regular:null}
}

function classifyElementStock(attrs=''){
  const s=attrs.toLowerCase()
  if(/disabled|aria-disabled\s*=\s*["']?true|data-available\s*=\s*["']?false|out[-_ ]?of[-_ ]?stock|unavailable|sold[-_ ]?out/.test(s)) return false
  if(/data-available\s*=\s*["']?true|data-in-stock\s*=\s*["']?true|in[-_ ]?stock|available/.test(s)) return true
  return null
}

function isPlausibleSize(v=''){
  const s=String(v).trim()
  if(!s || s.length>18) return false
  return /^(?:0{1,2}|[1-6]|[0-9]{1,2}(?:\.[05])?|[0-9]{1,2}[A-H]|[XSML]{1,4}|[1-6]X|[1-6]XL|(?:1X|2X|3X|4X|5X|6X)|(?:10|12|14|16|18|20|22|24|26|28|30)(?:W)?|(?:22|24|26)-(?:24|26|28)|(?:9|9\.5|10|10\.5))$/i.test(s)
}

function extractHtmlVariants(html,current,regular,color){
  const out=[]; const seen=new Set()
  const add=(size,stock,sku=null)=>{
    size=decode(String(size||'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
    if(!isPlausibleSize(size)) return
    const key=size.toLowerCase(); if(seen.has(key)) return; seen.add(key)
    out.push({size,price:current,regularPrice:regular,inStock:stock,sku,color})
  }
  let m
  const optionRe=/<option\b([^>]*)>([\s\S]*?)<\/option>/gi
  while((m=optionRe.exec(html)) && out.length<100){const attrs=m[1],txt=decode(m[2]).replace(/<[^>]+>/g,' ').trim();const val=attrs.match(/\bvalue=["']([^"']+)["']/i)?.[1]; const candidate=isPlausibleSize(txt)?txt:(isPlausibleSize(val)?val:null);if(candidate)add(candidate,classifyElementStock(attrs))}
  const tagRe=/<(?:button|label|li|div|span)\b([^>]*(?:data-size|data-variation-value|aria-label|title|data-value)[^>]*)>([\s\S]{0,220}?)<\/(?:button|label|li|div|span)>/gi
  while((m=tagRe.exec(html)) && out.length<120){const attrs=m[1],txt=decode(m[2]).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();const attrVal=attrs.match(/(?:data-size|data-variation-value|data-value|aria-label|title)=["']([^"']+)["']/i)?.[1];for(const candidate of [attrVal,txt]){const clean=String(candidate||'').replace(/^size\s*:?\s*/i,'').trim();if(isPlausibleSize(clean)){add(clean,classifyElementStock(attrs+' '+txt));break}}}
  // Product pages such as Torrid expose the selected variation as plain text: "size: 3".
  const selectedRe=/\bsize\s*:\s*(00|[0-6]|[1-6]X|[1-6]XL|[0-9]{1,2}(?:\.[05])?|[0-9]{2}[A-H])\b/gi
  while((m=selectedRe.exec(html)) && out.length<120){const size=m[1];const after=decode(html.slice(m.index,Math.min(html.length,m.index+5000))).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');let stock=null;if(/\bout of stock\b/i.test(after.slice(0,1800)))stock=false;else if(/\b(?:add to bag|add to cart|arrive by|ship it|in stock)\b/i.test(after.slice(0,2500)))stock=true;add(size,stock)}
  return out
}

function extractVariants(blocks, product, html, current, regular, color) {
  const variants=[]; const seen=new Set()
  const add=(size, price, reg, stock, sku, c)=>{
    size=String(size||'').trim(); if(!isPlausibleSize(size)) return
    const key=[size,c||'',sku||''].join('|'); if(seen.has(key)) return; seen.add(key)
    variants.push({size,price:number(price)||current,regularPrice:number(reg)||regular,inStock:stock,sku:sku?String(sku):null,color:c?String(c):color||null})
  }
  const inspect=n=>{
    if(!n || typeof n!=='object' || Array.isArray(n)) return
    const keys=Object.keys(n); const sizeKey=keys.find(k=>/^(size|sizeName|displaySize|variationSize|attributeSize|value)$/i.test(k) && typeof n[k]!=='object') || keys.find(k=>/size/i.test(k)&&typeof n[k]==='string')
    if(!sizeKey) return
    const size=n[sizeKey]
    const price=n.salePrice ?? n.currentPrice ?? n.price ?? n.offerPrice ?? n.finalPrice
    const reg=n.regularPrice ?? n.listPrice ?? n.originalPrice ?? n.msrp ?? n.standardPrice
    const stock=availability(n.availability ?? n.inventoryStatus ?? n.stockStatus ?? n.inStock ?? n.available ?? n.selectable)
    add(size,price,reg,stock,n.sku??n.id??n.productId,n.color??n.colorName)
  }
  blocks.forEach(b=>walk(b,inspect)); walk(product?.hasVariant,inspect)
  for(const v of extractHtmlVariants(html,current,regular,color)) add(v.size,v.price,v.regularPrice,v.inStock,v.sku,v.color)
  return variants.slice(0,160)
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
  let current=number(offers[0]?.price ?? offers[0]?.lowPrice ?? product?.offers?.price ?? meta(html,'product:price:amount') ?? meta(html,'og:price:amount'))
  const regexNumber=(...names)=>{for(const n of names){const m=html.match(new RegExp(`["']${n}["']\\s*:\\s*(?:["'])?([0-9]+(?:\\.[0-9]+)?)`,'i'));if(m)return number(m[1])}return null}
  let regular=regexNumber('regularPrice','listPrice','originalPrice','msrp','compareAtPrice','compare_at_price')
  const textPrices=extractTextPrices(html,current)
  if(!current) current=textPrices.current
  if(!regular) regular=textPrices.regular
  if(!regular) regular=current
  const name=decode(product?.name || meta(html,'og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Product').replace(/\s+/g,' ').trim()
  const brand=typeof product?.brand==='string'?product.brand:product?.brand?.name || meta(html,'product:brand') || null
  const images=collectImages(html,product,url)
  const color=product?.color || meta(html,'product:color') || null
  const variants=extractVariants(blocks,product,html,current,regular,color)
  const stock=availability(offers[0]?.availability ?? product?.offers?.availability)
  const category=inferCategory(name,url)
  return { name, brand, images, currentPrice:current, regularPrice:regular, color, stock, category, variants, sku:product?.sku||product?.productID||null, description:product?.description||meta(html,'og:description')||null }
}

export async function fetchProduct(url, {timeoutMs=12000}={}) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs)
  try {
    const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152 Safari/537.36','accept':'text/html,application/xhtml+xml','accept-language':'en-US,en;q=0.9','cache-control':'no-cache'}})
    if(!r.ok) throw new Error(`Retailer returned ${r.status}`)
    const type=r.headers.get('content-type')||''; if(!type.includes('text/html')) throw new Error('URL did not return a product page')
    const html=await r.text(); return { finalUrl:r.url, html, parsed:parseProductPage(html,r.url) }
  } finally { clearTimeout(timer) }
}

export function normalizeSize(v='') { return String(v).trim().toLowerCase().replace(/&nbsp;/g,' ').replace(/^(?:us\s*)?size\s*[:#-]?\s*/,'').replace(/^us\s+/,'').replace(/\s+/g,'').replace(/[–—]/g,'-').replace(/xxxlarge|xxxl|3xl/g,'3x').replace(/\//g,'-') }

export function sizeMatches(candidate, preferred, retailerSlug, category) {
  const c=normalizeSize(candidate), p=normalizeSize(preferred)
  if(!c||!p) return false
  if(c===p) return true
  if(retailerSlug==='torrid' && (p==='3x'||p==='24-26'||p==='22-24') && (c==='3'||c==='3x')) return category!=='Bottoms'
  if(retailerSlug==='bloomchic' && (p==='3x'||p==='24-26'||p==='22-24') && /^(3x|22-24|24-26)$/.test(c)) return category!=='Bottoms'
  // Universal Standard's published conversion maps conventional 24 to L and 26 to XL.
  if(retailerSlug==='universal-standard' && p==='24' && /^(24|l)$/.test(c)) return true
  if(retailerSlug==='universal-standard' && /^(3x|24-26(?:\/torrid3)?)$/.test(p) && /^(l|xl)$/.test(c)) return true
  // ELOQUII uses both numeric 24/24W and grouped 22/24 sizing depending on the product.
  if(retailerSlug==='eloquii' && p==='24' && /^(24|24w|22\/24|22-24)$/.test(c)) return true
  if(retailerSlug==='eloquii' && /^(3x|24-26(?:\/torrid3)?)$/.test(p) && /^(22\/24|22-24|24|24w)$/.test(c)) return true
  if(retailerSlug==='glamorise' && p==='50d' && c.replace(/[- ]/g,'')==='50d') return true
  if(p==='24' && /^(24|24w)$/.test(c)) return true
  if(p==='50d' && c.replace(/[- ]/g,'')==='50d') return true
  if((p==='9'||p==='9.0') && c==='9') return true
  if(p==='9.5' && c==='9.5') return true
  return false
}
