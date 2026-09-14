const SHOPIFY_SLUGS = new Set(['glamorise','universal-standard','bloomchic'])

const clean = v => String(v ?? '').trim()
const money = v => {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/[^0-9.]/g,''))
  return Number.isFinite(n) && n > 0 ? n : null
}
const stockBool = v => {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').toLowerCase()
  if (/out.?of.?stock|sold.?out|unavailable|false|not.?available/.test(s)) return false
  if (/in.?stock|available|true|orderable|selectable/.test(s)) return true
  return null
}
const plausibleSize = v => {
  const s = clean(v)
  if (!s || s.length > 24) return false
  return /^(?:00|0|[1-6]|[1-6]X|[1-6]XL|XS|S|M|L|XL|2XL|3XL|4XL|5XL|6XL|[0-9]{1,2}(?:\.[05])?|[0-9]{1,2}[A-H]|(?:10|12|14|16|18|20|22|24|26|28|30|32|34|36|38|40)W?|(?:00-0|2-4|6-8|10-12|14-16|18-20|22-24|24-26|26-28|30-32|34-36|38-40))$/i.test(s)
}

function mergeVariants(primary=[], secondary=[]){
  const out=[]; const seen=new Set()
  for(const v of [...primary,...secondary]){
    if(!v || !plausibleSize(v.size)) continue
    const key=`${clean(v.size).toLowerCase()}|${clean(v.color).toLowerCase()}|${clean(v.sku)}`
    if(seen.has(key)) continue
    seen.add(key); out.push(v)
  }
  return out
}

async function fetchJson(url, timeout=9000){
  const c=new AbortController(), t=setTimeout(()=>c.abort(),timeout)
  try{
    const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{
      'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152 Safari/537.36',
      'accept':'application/json,text/javascript,*/*;q=0.8','accept-language':'en-US,en;q=0.9'
    }})
    if(!r.ok) return null
    const text=await r.text()
    try{return JSON.parse(text)}catch{return null}
  }catch{return null}finally{clearTimeout(t)}
}

function shopifyProductUrl(pageUrl){
  try{
    const u=new URL(pageUrl)
    const m=u.pathname.match(/^(.*\/products\/[^/?#]+)/i)
    if(!m) return null
    return `${u.origin}${m[1]}.js`
  }catch{return null}
}

function parseShopify(data, parsed){
  if(!data || !Array.isArray(data.variants)) return []
  const optionNames=(data.options||[]).map(x=>typeof x==='string'?x:(x?.name||''))
  let sizeIndex=optionNames.findIndex(x=>/size/i.test(x))
  if(sizeIndex < 0){
    // Most one-option apparel products use option1 for size.
    sizeIndex=0
  }
  let colorIndex=optionNames.findIndex(x=>/colou?r/i.test(x))
  return data.variants.map(v=>{
    const opts=[v.option1,v.option2,v.option3]
    const size=opts[sizeIndex] ?? v.title
    const color=colorIndex>=0 ? opts[colorIndex] : parsed?.color
    const rawPrice = money(v.price)
    const rawCompare = money(v.compare_at_price)
    // Shopify .js prices are usually cents.
    const price = rawPrice && rawPrice > 1000 ? rawPrice/100 : rawPrice
    const regular = rawCompare && rawCompare > 1000 ? rawCompare/100 : rawCompare
    return {
      size: clean(size),
      color: clean(color)||null,
      sku: clean(v.sku || v.id)||null,
      price: price || parsed?.currentPrice || null,
      regularPrice: regular || parsed?.regularPrice || price || null,
      inStock: typeof v.available==='boolean' ? v.available : stockBool(v.available)
    }
  }).filter(v=>plausibleSize(v.size))
}

function scriptJsonBlocks(html){
  const blocks=[]
  const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m
  while((m=re.exec(html))){
    const attrs=m[1]||'', body=(m[2]||'').trim()
    if(!body || body.length>6_000_000) continue
    if(/application\/(?:json|ld\+json)|__NEXT_DATA__|application\/json/i.test(attrs)){
      try{blocks.push(JSON.parse(body))}catch{}
    }
  }
  return blocks
}

function walk(node, fn, depth=0){
  if(node==null || depth>16) return
  fn(node)
  if(Array.isArray(node)) node.forEach(x=>walk(x,fn,depth+1))
  else if(typeof node==='object') Object.values(node).forEach(x=>walk(x,fn,depth+1))
}

function parseEmbeddedVariants(html, parsed){
  const out=[]
  const add=(n)=>{
    if(!n || typeof n!=='object' || Array.isArray(n)) return
    const keys=Object.keys(n)
    const sizeKey=keys.find(k=>/^(size|sizeName|displaySize|label|value)$/i.test(k) && typeof n[k] !== 'object') ||
                  keys.find(k=>/size/i.test(k) && typeof n[k] === 'string')
    if(!sizeKey) return
    const size=clean(n[sizeKey]).replace(/^size\s*:?\s*/i,'')
    if(!plausibleSize(size)) return
    const inStock=stockBool(n.available ?? n.inStock ?? n.orderable ?? n.selectable ?? n.inventoryStatus ?? n.stockStatus ?? n.availability)
    const p=money(n.salePrice ?? n.currentPrice ?? n.price ?? n.finalPrice ?? n.offerPrice)
    const r=money(n.regularPrice ?? n.listPrice ?? n.originalPrice ?? n.msrp ?? n.compareAtPrice ?? n.compare_at_price)
    out.push({
      size, inStock,
      sku:clean(n.sku ?? n.id ?? n.variantId ?? n.productId)||null,
      color:clean(n.color ?? n.colorName ?? parsed?.color)||null,
      price:p || parsed?.currentPrice || null,
      regularPrice:r || parsed?.regularPrice || p || null
    })
  }
  for(const block of scriptJsonBlocks(html)) walk(block,add)

  // Salesforce/commerce pages often expose variation values as JSON fragments in HTML.
  const frag=/["'](?:size|sizeName|displaySize)["']\s*:\s*["']([^"']+)["'][\s\S]{0,500}?["'](?:available|orderable|selectable|inStock)["']\s*:\s*(true|false)/gi
  let m
  while((m=frag.exec(html))) out.push({size:m[1],inStock:m[2]==='true',price:parsed?.currentPrice,regularPrice:parsed?.regularPrice,color:parsed?.color,sku:null})

  return mergeVariants([],out)
}

export async function retailerVariants(retailerSlug, page, parsed){
  let variants=[...(parsed?.variants||[])]
  let source='generic'

  if(SHOPIFY_SLUGS.has(retailerSlug)){
    const jsonUrl=shopifyProductUrl(page.finalUrl)
    if(jsonUrl){
      const data=await fetchJson(jsonUrl)
      const shopify=parseShopify(data,parsed)
      if(shopify.length){
        variants=mergeVariants(shopify,variants)
        source='shopify-product-json'
      }
    }
  }

  const embedded=parseEmbeddedVariants(page.html,parsed)
  if(embedded.length){
    variants=mergeVariants(variants,embedded)
    if(source==='generic') source='embedded-product-state'
  }

  return {variants, source, count:variants.length}
}