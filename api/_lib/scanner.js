import { fetchProduct, sizeMatches } from './productParser.js'
import { retailerVariants } from './retailerAdapters.js'

function xmlLocs(xml){return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&'))}
function productish(url){return /\/product\/|\/p\/|\/products?\/|\.html(?:\?|$)|\/item\//i.test(url) && !/category|collection|search|blog|help|store|account|cart/i.test(url)}
function saleish(url){return /sale|clearance|outlet|last-chance|deals|markdown/i.test(url)}
async function textFetch(url,timeout=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152 Safari/537.36','accept':'text/html,application/xml,text/xml;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status}`);return await r.text()}finally{clearTimeout(t)}}
function linksFromHtml(html,base){const out=[];for(const m of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)){try{const u=new URL(m[1].replace(/&amp;/g,'&'),base);if(/^https?:$/.test(u.protocol))out.push(u.href)}catch{}}return [...new Set(out)]}

const SALE_PATHS={
  'torrid':['/sale/clearance/','/sale/','/shop-all/'],
  'lane-bryant':['/clearance','/sale'],
  'maurices':['/sale','/clearance'],
  'eloquii':['/zq/clearance','/sale'],
  'lands-end':['/sale','/shop/womens-sale'],
  'universal-standard':['/collections/sale','/collections/final-sale'],
  'old-navy':['/browse/category.do?cid=26190','/browse/category.do?cid=1185233'],
  'kohls':['/catalog/clearance.jsp','/catalog/sale.jsp'],
  'jcpenney':['/g/clearance','/g/sale'],
  'bloomchic':['/collections/sale','/collections/clearance'],
  'glamorise':['/collections/sale','/collections/clearance']
}

async function discoverFromSalePages(retailer,max=140){
  const base=new URL(retailer.base_url); const candidates=[]; const pages=[]
  for(const path of SALE_PATHS[retailer.slug]||['/sale','/clearance']){try{pages.push(new URL(path,base).href)}catch{}}
  try{const home=await textFetch(base.href,6000);for(const link of linksFromHtml(home,base.href)){if(saleish(link))pages.push(link)}}catch{}
  for(const page of [...new Set(pages)].slice(0,6)){
    if(candidates.length>=max)break
    try{
      const html=await textFetch(page,9000); const links=linksFromHtml(html,page)
      for(const u of links){if(productish(u)){candidates.push(u);if(candidates.length>=max)break}}
      // Follow one pagination/category layer when it is clearly a sale/clearance page.
      for(const child of links.filter(x=>saleish(x)&&!productish(x)).slice(0,2)){
        if(candidates.length>=max)break
        try{const h=await textFetch(child,7000);for(const u of linksFromHtml(h,child)){if(productish(u)){candidates.push(u);if(candidates.length>=max)break}}}catch{}
      }
    }catch{}
  }
  return [...new Set(candidates)].slice(0,max)
}

async function discoverFromSitemaps(retailer,max=500){
  const base=new URL(retailer.base_url); let sitemapUrls=[]
  try{const robots=await textFetch(new URL('/robots.txt',base).href,6000);sitemapUrls=[...robots.matchAll(/^sitemap:\s*(.+)$/gim)].map(m=>m[1].trim())}catch{}
  if(!sitemapUrls.length) sitemapUrls=[new URL('/sitemap.xml',base).href]
  const out=[]; const queue=sitemapUrls.slice(0,8); const visited=new Set()
  while(queue.length && out.length<max && visited.size<30){const sm=queue.shift();if(visited.has(sm))continue;visited.add(sm);try{const xml=await textFetch(sm,9000);for(const loc of xmlLocs(xml)){if(out.length>=max)break;if(productish(loc))out.push(loc);else if(/sitemap/i.test(loc)&&queue.length<30)queue.push(loc)}}catch{}}
  return [...new Set(out)].slice(0,max)
}

export async function discoverRetailerUrls(retailer,max=260){
  const [sale,sitemap]=await Promise.all([discoverFromSalePages(retailer,Math.min(160,max)),discoverFromSitemaps(retailer,Math.min(600,max*3))])
  // Sale-page discoveries are intentionally first; sitemap entries provide breadth/fallback.
  return [...new Set([...sale,...sitemap])].slice(0,max)
}

function discountPct(sale,regular){return sale&&regular&&regular>sale?Math.round((1-sale/regular)*10000)/100:0}
function qualifies(sale,regular,category){const d=discountPct(sale,regular);const caps={Tops:25,Layers:30,Bottoms:35,Dresses:40,Intimates:30,Lounge:25,Shoes:40,Active:30,Swim:30,Accessories:30};return d>=50 || (d>=40 && sale<=(caps[category]||30))}
function quality(d){return d>=70?'exceptional':d>=55?'strong_buy':d>=40?'good_deal':'wildcard'}

async function preferredSizes(admin,retailerId,category){
  const {data:profiles}=await admin.from('fh_profiles').select('id').limit(20); if(!profiles?.length)return[]
  const ids=profiles.map(p=>p.id)
  const categoryMap={Tops:['tops'],Layers:['layers'],Dresses:['dresses'],Bottoms:['bottoms'],Intimates:['bras','pullover_bras'],Shoes:['shoes'],Swim:['swim'],Active:['tops','bottoms'],Lounge:['tops','bottoms'],Accessories:[]}
  const genericCats=categoryMap[category]||[category.toLowerCase()]
  const storePromise=admin.from('fh_store_sizes').select('preferred_size,alternate_size').in('profile_id',ids).eq('retailer_id',retailerId).eq('category',category)
  const genericPromise=genericCats.length?admin.from('fh_size_profiles').select('category,size_primary,size_secondary,bra_band,bra_cup,shoe_min,shoe_max').in('profile_id',ids).in('category',genericCats):Promise.resolve({data:[]})
  const [{data:store},{data:generic}]=await Promise.all([storePromise,genericPromise])
  const values=[];(store||[]).forEach(x=>values.push(x.preferred_size,x.alternate_size));(generic||[]).forEach(x=>{values.push(x.size_primary,x.size_secondary);if(x.bra_band&&x.bra_cup)values.push(`${x.bra_band}${x.bra_cup}`);if(x.shoe_min)values.push(String(x.shoe_min));if(x.shoe_max)values.push(String(x.shoe_max))});return [...new Set(values.filter(Boolean))]
}

async function upsertDeal(admin,product,variant,p,sale,regular,isDeal){
  const pct=discountPct(sale,regular)
  const {data:existing}=await admin.from('fh_deals').select('id').eq('product_id',product.id).eq('variant_id',variant.id).order('last_verified_at',{ascending:false}).limit(1).maybeSingle()
  const row={product_id:product.id,variant_id:variant.id,sale_price:sale,regular_price:regular,discount_percent:pct,deal_quality:quality(pct),qualifies_for_feed:isDeal,clearance:pct>=50,last_verified_at:new Date().toISOString()}
  if(existing?.id) await admin.from('fh_deals').update(row).eq('id',existing.id); else await admin.from('fh_deals').insert(row)
}

export async function scanOne(admin,retailer,url){
  const diag={checked:1,parsed:0,saleCandidates:0,sizeMatches:0,sizeVerified:0,deals:0,images:0,adapterVariants:0,adapterSource:'generic'}
  const page=await fetchProduct(url,{timeoutMs:11000}); const p=page.parsed; if(!p?.name)return diag
  diag.parsed=1;diag.images=p.images?.length||0
  const {data:product,error:pe}=await admin.from('fh_products').upsert({retailer_id:retailer.id,retailer_product_id:p.sku,canonical_url:page.finalUrl,product_name:p.name,brand:p.brand,primary_category:p.category,description:p.description,primary_image_url:p.images?.[0]||null,additional_images:p.images?.slice(1)||[],color_name:p.color,last_seen_at:new Date().toISOString(),active:true},{onConflict:'retailer_id,canonical_url'}).select('id').single(); if(pe)throw pe
  const productSale=p.currentPrice,productRegular=p.regularPrice||productSale
  if(productSale&&productRegular&&discountPct(productSale,productRegular)>=35)diag.saleCandidates=1
  const preferred=await preferredSizes(admin,retailer.id,p.category)
  const adapted=await retailerVariants(retailer.slug,page,p)
  diag.adapterVariants=adapted.count||0; diag.adapterSource=adapted.source||'generic'
  const candidates=(adapted.variants||[]).filter(v=>preferred.some(ps=>sizeMatches(v.size,ps,retailer.slug,p.category)))
  diag.sizeMatches=candidates.length
  for(const v of candidates){
    const sale=v.price||p.currentPrice; const regular=v.regularPrice||p.regularPrice||sale; if(!sale)continue
    const variantKey=v.sku||`${v.color||p.color||''}-${v.size}`
    const status=v.inStock===true?'verified_in_stock':v.inStock===false?'verified_out_of_stock':'unverified'
    const verified=v.inStock===true||v.inStock===false
    const {data:variant,error:ve}=await admin.from('fh_product_variants').upsert({product_id:product.id,retailer_variant_id:variantKey,color:v.color||p.color,size:v.size,size_normalized:v.size,price:sale,regular_price:regular,in_stock:v.inStock,inventory_status:status,size_verified:verified,last_verified_at:verified?new Date().toISOString():null},{onConflict:'product_id,retailer_variant_id,color,size'}).select('id').single();if(ve)continue
    if(verified)diag.sizeVerified++
    if(v.inStock===true){
      await admin.from('fh_price_history').insert({product_id:product.id,variant_id:variant.id,observed_price:sale,regular_price:regular})
      const isDeal=qualifies(sale,regular,p.category);await upsertDeal(admin,product,variant,p,sale,regular,isDeal);if(isDeal)diag.deals++
    } else if(v.inStock===false) {
      await upsertDeal(admin,product,variant,p,sale,regular,false)
    }
  }
  return diag
}

async function mapLimit(items,limit,fn){const out=new Array(items.length);let next=0;async function worker(){while(true){const i=next++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch(e){out[i]={error:e}}}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out}

export async function scanRetailers(admin,{limitRetailers=11,productsPerRetailer=12}={}){
  const {data:retailers,error}=await admin.from('fh_retailers').select('*').eq('enabled',true).order('scan_priority').limit(limitRetailers);if(error)throw error
  const summary=[]
  for(const retailer of retailers||[]){
    const start=new Date().toISOString(); const {data:scan}=await admin.from('fh_retailer_scans').insert({retailer_id:retailer.id,started_at:start,status:'running'}).select('id').single()
    const stats={retailer:retailer.name,discovered:0,checked:0,parsed:0,saleCandidates:0,sizeMatches:0,sizeVerified:0,deals:0,images:0,adapterVariants:0,adapterSources:{},errors:0}
    const errors=[]
    try{
      let urls=[]
      const keepKnown=Math.min(3,productsPerRetailer)
      const {data:known}=await admin.from('fh_products').select('canonical_url,last_seen_at').eq('retailer_id',retailer.id).order('last_seen_at',{ascending:true}).limit(keepKnown)
      urls=(known||[]).map(x=>x.canonical_url)
      const discovered=await discoverRetailerUrls(retailer,320);stats.discovered=discovered.length
      if(discovered.length){
        // Rotate the broad fallback portion every scan, but retain sale-page URLs at the front.
        const preferred=discovered.slice(0,Math.min(40,discovered.length)); const rest=discovered.slice(preferred.length); const bucket=Math.floor(Date.now()/14400000);const offset=rest.length?(bucket*13)%rest.length:0;const rotated=rest.length?[...rest.slice(offset),...rest.slice(0,offset)]:[]
        urls=[...new Set([...urls,...preferred,...rotated])].slice(0,productsPerRetailer)
      }
      const results=await mapLimit(urls,4,async url=>{try{return await scanOne(admin,retailer,url)}catch(e){errors.push({url,error:String(e.message||e).slice(0,220)});return null}})
      for(const r of results.filter(Boolean)){for(const k of ['checked','parsed','saleCandidates','sizeMatches','sizeVerified','deals','images','adapterVariants'])stats[k]+=r[k]||0; const src=r.adapterSource||'generic';stats.adapterSources[src]=(stats.adapterSources[src]||0)+1}
      stats.errors=errors.length
      const diagnostic={type:'diagnostic',discovered:stats.discovered,parsed:stats.parsed,saleCandidates:stats.saleCandidates,sizeMatches:stats.sizeMatches,sizeVerified:stats.sizeVerified,images:stats.images,adapterVariants:stats.adapterVariants,adapterSources:stats.adapterSources}
      await admin.from('fh_retailers').update({last_scan_at:new Date().toISOString(),last_successful_scan_at:new Date().toISOString(),scan_status:'success'}).eq('id',retailer.id)
      await admin.from('fh_retailer_scans').update({finished_at:new Date().toISOString(),products_checked:stats.checked,deals_found:stats.deals,new_deals:stats.deals,errors:[diagnostic,...errors].slice(0,30),status:'success'}).eq('id',scan.id)
    }catch(e){errors.push({error:String(e.message||e)});stats.errors=errors.length;await admin.from('fh_retailers').update({last_scan_at:new Date().toISOString(),scan_status:'error'}).eq('id',retailer.id);if(scan?.id)await admin.from('fh_retailer_scans').update({finished_at:new Date().toISOString(),products_checked:stats.checked,deals_found:stats.deals,errors,status:'error'}).eq('id',scan.id)}
    summary.push(stats)
  }
  return summary
}
