import { parseMoney, cleanSize, normalizeUrl } from './utils.mjs'

export async function collectProductLinks(page,{baseUrl,pattern,limit=120}){
  const links=[]
  for(let i=0;i<6;i++){
    const batch=await page.$$eval('a[href]',els=>els.map(a=>a.href).filter(Boolean)).catch(()=>[])
    links.push(...batch)
    if(links.length>=limit*2)break
    await page.evaluate(()=>window.scrollBy(0,Math.max(window.innerHeight*1.8,1100))).catch(()=>{})
    await page.waitForTimeout(500)
  }
  const baseHost=new URL(baseUrl).hostname.replace(/^www\./,'')
  return [...new Set(links.map(normalizeUrl).filter(u=>{
    try{const h=new URL(u).hostname.replace(/^www\./,'');return (h===baseHost||h.endsWith(`.${baseHost}`))&&pattern.test(u)}catch{return false}
  }))].slice(0,limit)
}

function extractJsonLdProduct(nodes){
  const stack=[...nodes]
  while(stack.length){
    const x=stack.shift(); if(!x)continue
    if(Array.isArray(x)){stack.push(...x);continue}
    if(typeof x!=='object')continue
    const type=Array.isArray(x['@type'])?x['@type'].join(' '):String(x['@type']||'')
    if(/product/i.test(type))return x
    if(x['@graph'])stack.push(x['@graph'])
  }
  return null
}

export async function extractProduct(page){
  const result=await page.evaluate(()=>{
    const money=t=>{
      const m=String(t||'').replace(/,/g,'').match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/)
      return m?Number(m[1]):null
    }
    const json=[]
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{json.push(JSON.parse(s.textContent))}catch{}})
    const texts=[...document.querySelectorAll('[class*="price" i],[data-testid*="price" i],[id*="price" i]')].map(x=>x.textContent?.trim()).filter(Boolean).slice(0,40)
    const sizeNodes=[...document.querySelectorAll('button,option,label,[role="option"],[role="radio"]')].map(el=>({
      text:(el.textContent||el.getAttribute('aria-label')||el.getAttribute('data-value')||'').trim(),
      disabled:Boolean(el.disabled)||el.getAttribute('aria-disabled')==='true'||/disabled|unavailable|sold.?out|out.?of.?stock/i.test(`${el.className||''} ${el.getAttribute('title')||''}`),
      selected:Boolean(el.selected)||el.getAttribute('aria-checked')==='true'
    })).filter(x=>x.text&&x.text.length<45)
    return {
      json,
      title:document.querySelector('h1')?.textContent?.trim()||document.querySelector('meta[property="og:title"]')?.content||document.title,
      canonical:document.querySelector('link[rel="canonical"]')?.href||location.href,
      image:document.querySelector('meta[property="og:image"]')?.content||document.querySelector('img[src]')?.src||null,
      brand:document.querySelector('[itemprop="brand"]')?.textContent?.trim()||null,
      priceTexts:texts,
      bodyText:document.body?.innerText?.slice(0,180000)||'',
      sizeNodes
    }
  })
  const p=extractJsonLdProduct(result.json)
  const offers=p?.offers
  const offerList=Array.isArray(offers)?offers:offers?[offers]:[]
  const structuredPrices=[]
  for(const o of offerList){
    if(o?.price!=null)structuredPrices.push(Number(o.price))
    if(o?.lowPrice!=null)structuredPrices.push(Number(o.lowPrice))
    if(o?.highPrice!=null)structuredPrices.push(Number(o.highPrice))
  }
  const visiblePrices=result.priceTexts.flatMap(t=>[...String(t).matchAll(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/g)].map(m=>Number(m[1]))).filter(n=>Number.isFinite(n)&&n>0)
  const all=[...structuredPrices.filter(n=>Number.isFinite(n)&&n>0),...visiblePrices]
  const unique=[...new Set(all)].sort((a,b)=>a-b)
  let sale=unique[0]||parseMoney(p?.offers?.price)||null
  let regular=unique.length>1?unique.at(-1):sale
  const priceSpec=offerList.flatMap(o=>Array.isArray(o?.priceSpecification)?o.priceSpecification:[o?.priceSpecification]).filter(Boolean)
  for(const ps of priceSpec){const v=parseMoney(ps?.price);if(v&&v>regular)regular=v}
  const availability=offerList.map(o=>String(o?.availability||'')).join(' ')
  const structuredStock=/InStock/i.test(availability)?true:/OutOfStock|SoldOut/i.test(availability)?false:null
  const description=String(p?.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,1200)
  const sku=String(p?.sku||p?.productID||p?.mpn||'').trim()||null
  const brand=typeof p?.brand==='string'?p.brand:p?.brand?.name||result.brand||null
  const title=String(p?.name||result.title||'').replace(/\s+/g,' ').trim()
  const image=Array.isArray(p?.image)?p.image[0]:p?.image||result.image||null
  const sizes=result.sizeNodes.map(x=>({...x,size:cleanSize(x.text)})).filter(x=>{
    const s=x.size.toUpperCase()
    return /^(?:SIZE\s*)?(?:\d{1,2}(?:\.5)?(?:W|R|S|L|REGULAR|SHORT|LONG)?|[0-9]{2}\/[0-9]{2}|[0-9]{2}\s*[-–]\s*[0-9]{2}|[XSML]{1,4}|[1-6]X|[1-6]XL|[2-6]X|[0-9]{2}[A-K]{1,2})$/i.test(s)
  })
  return {title,canonical:normalizeUrl(result.canonical),image,brand,description,sku,sale,regular,structuredStock,sizes,bodyText:result.bodyText}
}
