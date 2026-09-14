import { fetchProduct, sizeMatches } from './productParser.js'

function xmlLocs(xml){return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&'))}
function productish(url){return /\/p\/|product|products|\.html(?:\?|$)|\/item\//i.test(url) && !/category|collection|search|blog|help/i.test(url)}
async function textFetch(url,timeout=10000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; ForHollie/1.0)'}});if(!r.ok)throw new Error(`${r.status}`);return await r.text()}finally{clearTimeout(t)}}

export async function discoverRetailerUrls(retailer,max=180){
  const base=new URL(retailer.base_url); let sitemapUrls=[]
  try{const robots=await textFetch(new URL('/robots.txt',base).href,6000);sitemapUrls=[...robots.matchAll(/^sitemap:\s*(.+)$/gim)].map(m=>m[1].trim())}catch{}
  if(!sitemapUrls.length) sitemapUrls=[new URL('/sitemap.xml',base).href]
  const out=[]; const visited=new Set()
  for(const sm of sitemapUrls.slice(0,6)){
    if(out.length>=max)break
    try{const xml=await textFetch(sm,9000);const locs=xmlLocs(xml);for(const loc of locs){if(out.length>=max)break;if(productish(loc))out.push(loc);else if(/sitemap/i.test(loc)&&!visited.has(loc)){visited.add(loc);try{const child=await textFetch(loc,7000);for(const u of xmlLocs(child)){if(productish(u)){out.push(u);if(out.length>=max)break}}}catch{}}}}catch{}
  }
  return [...new Set(out)].slice(0,max)
}

function discountPct(sale,regular){return sale&&regular&&regular>sale?Math.round((1-sale/regular)*10000)/100:0}
function qualifies(sale,regular,category){const d=discountPct(sale,regular);const caps={Tops:25,Layers:30,Bottoms:35,Dresses:40,Intimates:30,Lounge:25,Shoes:40,Active:30,Swim:30,Accessories:30};return d>=50 || (d>=40 && sale<=(caps[category]||30))}
function quality(d){return d>=70?'exceptional':d>=55?'strong_buy':d>=40?'good_deal':'wildcard'}

async function preferredSizes(admin,retailerId,category){
  const {data:profiles}=await admin.from('fh_profiles').select('id').limit(20); if(!profiles?.length)return[]
  const ids=profiles.map(p=>p.id)
  const [{data:store},{data:generic}]=await Promise.all([
    admin.from('fh_store_sizes').select('preferred_size,alternate_size').in('profile_id',ids).eq('retailer_id',retailerId).eq('category',category),
    admin.from('fh_size_profiles').select('category,size_primary,size_secondary,bra_band,bra_cup,shoe_min,shoe_max').in('profile_id',ids).in('category',({Tops:['tops'],Layers:['layers'],Dresses:['dresses'],Bottoms:['bottoms'],Intimates:['bras','pullover_bras'],Shoes:['shoes'],Swim:['swim'],Active:['tops','bottoms'],Lounge:['tops','bottoms'],Accessories:[]}[category]||[category.toLowerCase()]))
  ])
  const values=[];(store||[]).forEach(x=>values.push(x.preferred_size,x.alternate_size));(generic||[]).forEach(x=>{values.push(x.size_primary,x.size_secondary);if(x.bra_band&&x.bra_cup)values.push(`${x.bra_band}${x.bra_cup}`);if(x.shoe_min)values.push(String(x.shoe_min));if(x.shoe_max)values.push(String(x.shoe_max))});return [...new Set(values.filter(Boolean))]
}

export async function scanOne(admin,retailer,url){
  const page=await fetchProduct(url,{timeoutMs:10000}); const p=page.parsed; if(!p?.name)return {checked:1,deals:0}
  const {data:product,error:pe}=await admin.from('fh_products').upsert({retailer_id:retailer.id,retailer_product_id:p.sku,canonical_url:page.finalUrl,product_name:p.name,brand:p.brand,primary_category:p.category,description:p.description,primary_image_url:p.images?.[0]||null,additional_images:p.images?.slice(1)||[],color_name:p.color,last_seen_at:new Date().toISOString(),active:true},{onConflict:'retailer_id,canonical_url'}).select('id').single(); if(pe)throw pe
  const preferred=await preferredSizes(admin,retailer.id,p.category)
  let found=0
  const candidates=(p.variants||[]).filter(v=>preferred.some(ps=>sizeMatches(v.size,ps,retailer.slug,p.category)))
  for(const v of candidates){
    const inStock=v.inStock
    if(inStock!==true) continue
    const sale=v.price||p.currentPrice; const regular=v.regularPrice||p.regularPrice||sale; if(!sale)continue
    const {data:variant,error:ve}=await admin.from('fh_product_variants').upsert({product_id:product.id,retailer_variant_id:v.sku||`${v.color||p.color||''}-${v.size}`,color:v.color||p.color,size:v.size,size_normalized:v.size,price:sale,regular_price:regular,in_stock:true,inventory_status:'verified_in_stock',size_verified:true,last_verified_at:new Date().toISOString()},{onConflict:'product_id,retailer_variant_id,color,size'}).select('id').single();if(ve)continue
    await admin.from('fh_price_history').insert({product_id:product.id,variant_id:variant.id,observed_price:sale,regular_price:regular})
    const pct=discountPct(sale,regular); const isDeal=qualifies(sale,regular,p.category)
    const {data:existing}=await admin.from('fh_deals').select('id').eq('product_id',product.id).eq('variant_id',variant.id).order('last_verified_at',{ascending:false}).limit(1).maybeSingle()
    const row={product_id:product.id,variant_id:variant.id,sale_price:sale,regular_price:regular,discount_percent:pct,deal_quality:quality(pct),qualifies_for_feed:isDeal,last_verified_at:new Date().toISOString()}
    if(existing?.id) await admin.from('fh_deals').update(row).eq('id',existing.id); else await admin.from('fh_deals').insert(row)
    if(isDeal)found++
  }
  return {checked:1,deals:found}
}

export async function scanRetailers(admin,{limitRetailers=11,productsPerRetailer=8}={}){
  const {data:retailers,error}=await admin.from('fh_retailers').select('*').eq('enabled',true).order('scan_priority').limit(limitRetailers);if(error)throw error
  const summary=[]
  for(const retailer of retailers||[]){
    const start=new Date().toISOString(); const {data:scan}=await admin.from('fh_retailer_scans').insert({retailer_id:retailer.id,started_at:start,status:'running'}).select('id').single(); let checked=0,deals=0,errors=[]
    try{
      let urls=[]
      const keepKnown=Math.min(2,productsPerRetailer)
      const {data:known}=await admin.from('fh_products').select('canonical_url,last_seen_at').eq('retailer_id',retailer.id).order('last_seen_at',{ascending:true}).limit(keepKnown)
      urls=(known||[]).map(x=>x.canonical_url)
      const discovered=await discoverRetailerUrls(retailer,180)
      if(discovered.length){const bucket=Math.floor(Date.now()/14400000);const offset=(bucket*7)%discovered.length;const rotated=[...discovered.slice(offset),...discovered.slice(0,offset)];urls=[...new Set([...urls,...rotated])].slice(0,productsPerRetailer)}
      for(const url of urls){try{const r=await scanOne(admin,retailer,url);checked+=r.checked;deals+=r.deals}catch(e){errors.push({url,error:String(e.message||e).slice(0,180)})}}
      await admin.from('fh_retailers').update({last_scan_at:new Date().toISOString(),last_successful_scan_at:new Date().toISOString(),scan_status:'success'}).eq('id',retailer.id)
      await admin.from('fh_retailer_scans').update({finished_at:new Date().toISOString(),products_checked:checked,deals_found:deals,new_deals:deals,errors,status:'success'}).eq('id',scan.id)
    }catch(e){errors.push({error:String(e.message||e)});await admin.from('fh_retailers').update({last_scan_at:new Date().toISOString(),scan_status:'error'}).eq('id',retailer.id);if(scan?.id)await admin.from('fh_retailer_scans').update({finished_at:new Date().toISOString(),products_checked:checked,deals_found:deals,errors,status:'error'}).eq('id',scan.id)}
    summary.push({retailer:retailer.name,checked,deals,errors:errors.length})
  }
  return summary
}
