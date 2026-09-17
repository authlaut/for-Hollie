import { fetchProduct, sizeMatches, inferCategory } from './productParser.js'
import { retailerVariants } from './retailerAdapters.js'

function xmlLocs(xml){return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&'))}
function productish(url){return /\/product\/|\/p\/|\/products?\/|\.html(?:\?|$)|\/item\//i.test(url) && !/category|collection|search|blog|help|store|account|cart/i.test(url)}
function saleish(url){return /sale|clearance|outlet|last-chance|deals|markdown/i.test(url)}
async function textFetch(url,timeout=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152 Safari/537.36','accept':'text/html,application/xml,text/xml;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status}`);return await r.text()}finally{clearTimeout(t)}}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function normalizeRetailerUrl(retailer,url){try{const u=new URL(url);u.hash='';if(retailer.slug==='glamorise')u.pathname=u.pathname.replace(/^\/en-ca(?=\/)/i,'');for(const k of [...u.searchParams.keys()])if(/^(utm_|fbclid|gclid|variant$)/i.test(k))u.searchParams.delete(k);return u.href}catch{return url}}
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
  return [...new Set([...sale,...sitemap].map(u=>normalizeRetailerUrl(retailer,u)))].slice(0,max)
}

function discountPct(sale,regular){return sale&&regular&&regular>sale?Math.round((1-sale/regular)*10000)/100:0}
function qualifies(sale,regular,category){
  const d=discountPct(sale,regular)
  const caps={Tops:35,Layers:45,Bottoms:45,Dresses:50,Intimates:45,Lounge:35,Shoes:50,Active:40,Swim:40,Accessories:35}
  const greatPrice={Tops:25,Layers:35,Bottoms:45,Dresses:45,Intimates:40,Lounge:35,Shoes:50,Active:35,Swim:35,Accessories:30}
  const cap=caps[category]||35, target=greatPrice[category]||35
  const priority=new Set(['Bottoms','Layers','Intimates','Shoes'])
  if(!validMarkdown(sale,regular,category) || d<20) return false
  if(d>=50) return true
  if(d>=35 && sale<=cap) return true
  if(d>=25 && priority.has(category) && sale<=cap) return true
  if(d>=25 && sale<=target) return true
  if(d>=20 && sale<=target*0.78) return true
  return false
}
function quality(d){return d>=70?'exceptional':d>=50?'strong_buy':d>=35?'good_deal':'wildcard'}
function valueScore(sale,regular,category){const d=discountPct(sale,regular);const targets={Tops:25,Layers:35,Bottoms:45,Dresses:45,Intimates:40,Lounge:35,Shoes:50,Active:35,Swim:35,Accessories:30};const t=targets[category]||35;const price=Math.max(0,Math.min(100,100-(sale/t)*55));return Math.round(Math.min(100,d*.62+price*.38))}

function pricePolicy(category){
  const policies={Tops:{maxRegular:250,maxRatio:6},Layers:{maxRegular:600,maxRatio:7},Bottoms:{maxRegular:350,maxRatio:6},Dresses:{maxRegular:400,maxRatio:7},Intimates:{maxRegular:200,maxRatio:6},Lounge:{maxRegular:250,maxRatio:6},Shoes:{maxRegular:300,maxRatio:6},Active:{maxRegular:300,maxRatio:6},Swim:{maxRegular:300,maxRatio:6},Accessories:{maxRegular:500,maxRatio:8}}
  return policies[category]||{maxRegular:500,maxRatio:8}
}
function hostMatchesRetailer(retailer, rawUrl){
  try{
    const finalHost=new URL(rawUrl).hostname.toLowerCase().replace(/^www\./,'')
    const baseHost=new URL(retailer.base_url).hostname.toLowerCase().replace(/^www\./,'')
    return finalHost===baseHost || finalHost.endsWith(`.${baseHost}`)
  }catch{return false}
}

function hollieRelevantProduct(retailer,p,finalUrl){
  if(!hostMatchesRetailer(retailer,finalUrl)) return {ok:false,reason:'retailer_provenance'}
  const hay=`${p?.name||''} ${p?.brand||''} ${p?.description||''} ${finalUrl||''}`.toLowerCase()
  // Hard reject unmistakable mens/big-and-tall catalog contamination. Keep generic
  // words like "boyfriend" because they are also legitimate women's style names.
  const mens=/(?:\bmen'?s\b|\bmenswear\b|\bbig\s*&?\s*tall\b|\bking\s*size\b|\bkingsize\b|\bks\s+island\b|\bswim\s+trunks?\b|\bboard\s*shorts?\b|\bmen'?s\s+underwear\b|\bmen'?s\s+briefs?\b|\bmen'?s\s+boxers?\b)/i
  if(mens.test(hay)) return {ok:false,reason:'mens_catalog'}
  // ELOQUII must stay on its own storefront. This specifically blocks shared
  // FullBeauty/KingSize/Woman Within catalog redirects from being mislabeled ELOQUII.
  if(retailer.slug==='eloquii'){
    try{const h=new URL(finalUrl).hostname.toLowerCase();if(!(h==='eloquii.com'||h.endsWith('.eloquii.com')))return {ok:false,reason:'eloquii_provenance'}}catch{return {ok:false,reason:'eloquii_provenance'}}
    if(/\b(?:woman\s+within|roaman'?s|jessica\s+london|swimsuits?\s*for\s*all|king\s*size|kingsize)\b/i.test(hay))return {ok:false,reason:'eloquii_cross_catalog'}
  }
  return {ok:true,reason:null}
}

async function quarantineExisting(admin,retailer,canonicalUrl){
  const {data:rows}=await admin.from('fh_products').select('id').eq('retailer_id',retailer.id).eq('canonical_url',canonicalUrl)
  const ids=(rows||[]).map(x=>x.id)
  if(!ids.length)return
  await admin.from('fh_products').update({active:false,last_seen_at:new Date().toISOString()}).in('id',ids)
  await admin.from('fh_deals').update({qualifies_for_feed:false,last_verified_at:new Date().toISOString()}).in('product_id',ids)
}

function validMarkdown(sale,regular,category){
  sale=Number(sale); regular=Number(regular)
  if(!Number.isFinite(sale)||!Number.isFinite(regular)||sale<=0||regular<=sale)return false
  const policy=pricePolicy(category)
  if(regular>policy.maxRegular)return false
  if(regular/sale>policy.maxRatio)return false
  if(discountPct(sale,regular)>90)return false
  return true
}


function resolveVariantPricing(v,p){
  const vp=Number(v?.price), vr=Number(v?.regularPrice)
  const pp=Number(p?.currentPrice), pr=Number(p?.regularPrice)

  // Prefer a real variant-level markdown when the retailer exposes one.
  if(validMarkdown(vp,vr,p?.category)) return {sale:vp,regular:vr,source:'variant'}

  // Many retailers expose stock/size at the variant level but only expose
  // the sale/regular price once at product level. Use that same page-level
  // markdown for an exact-size in-stock variant rather than treating the
  // variant as full price.
  if(validMarkdown(pp,pr,p?.category)) return {sale:pp,regular:pr,source:'product'}

  // Hybrid fallbacks: variant sale + product regular, or product sale +
  // variant compare-at. These occur on several commerce platforms.
  if(validMarkdown(vp,pr,p?.category)) return {sale:vp,regular:pr,source:'variant+product-regular'}
  if(validMarkdown(pp,vr,p?.category)) return {sale:pp,regular:vr,source:'product-sale+variant-regular'}

  // No defensible markdown could be established.
  const sale = Number.isFinite(vp)&&vp>0 ? vp : (Number.isFinite(pp)&&pp>0 ? pp : null)
  const regular = Number.isFinite(vr)&&vr>0 ? vr : (Number.isFinite(pr)&&pr>0 ? pr : sale)
  return {sale,regular,source:'no-markdown'}
}

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
  const diag={checked:1,parsed:0,saleCandidates:0,sizeMatches:0,sizeVerified:0,deals:0,images:0,adapterVariants:0,adapterSource:'generic',stockTrue:0,stockFalse:0,stockUnknown:0,saleSizeOverlap:0,dealThresholdPass:0,dealThresholdFail:0,productPriceFallbacks:0,rejectedNoMarkdown:0,rejectedValue:0,rejectedRelevance:0}
  const page=await fetchProduct(url,{timeoutMs:11000}); const p=page.parsed; if(!p?.name)return diag
  diag.parsed=1;diag.images=p.images?.length||0
  const relevance=hollieRelevantProduct(retailer,p,page.finalUrl)
  if(!relevance.ok){diag.rejectedRelevance=1;await quarantineExisting(admin,retailer,page.finalUrl);return diag}
  const {data:product,error:pe}=await admin.from('fh_products').upsert({retailer_id:retailer.id,retailer_product_id:p.sku,canonical_url:page.finalUrl,product_name:p.name,brand:p.brand,primary_category:p.category,description:p.description,primary_image_url:p.images?.[0]||null,additional_images:p.images?.slice(1)||[],color_name:p.color,last_seen_at:new Date().toISOString(),active:true},{onConflict:'retailer_id,canonical_url'}).select('id').single(); if(pe)throw pe
  const productSale=p.currentPrice,productRegular=p.regularPrice||productSale
  if(productSale&&productRegular&&discountPct(productSale,productRegular)>=25)diag.saleCandidates=1
  const preferred=await preferredSizes(admin,retailer.id,p.category)
  const adapted=await retailerVariants(retailer.slug,page,p)
  diag.adapterVariants=adapted.count||0; diag.adapterSource=adapted.source||'generic'
  const candidates=(adapted.variants||[]).filter(v=>preferred.some(ps=>sizeMatches(v.size,ps,retailer.slug,p.category)))
  diag.sizeMatches=candidates.length
  diag.stockTrue=candidates.filter(v=>v.inStock===true).length
  diag.stockFalse=candidates.filter(v=>v.inStock===false).length
  diag.stockUnknown=candidates.filter(v=>v.inStock!==true&&v.inStock!==false).length
  let overlapCounted=false
  for(const v of candidates){
    const pricing=resolveVariantPricing(v,p)
    const sale=pricing.sale, regular=pricing.regular
    if(!sale)continue
    const variantKey=v.sku||`${v.color||p.color||''}-${v.size}`
    const status=v.inStock===true?'verified_in_stock':v.inStock===false?'verified_out_of_stock':'unverified'
    const verified=v.inStock===true||v.inStock===false
    const {data:variant,error:ve}=await admin.from('fh_product_variants').upsert({product_id:product.id,retailer_variant_id:variantKey,color:v.color||p.color,size:v.size,size_normalized:v.size,price:sale,regular_price:regular,in_stock:v.inStock,inventory_status:status,size_verified:verified,last_verified_at:verified?new Date().toISOString():null},{onConflict:'product_id,retailer_variant_id,color,size'}).select('id').single();if(ve)continue
    if(verified)diag.sizeVerified++
    if(v.inStock===true){
      if(!overlapCounted && validMarkdown(sale,regular,p.category)){diag.saleSizeOverlap++;overlapCounted=true}
      if(pricing.source==='product')diag.productPriceFallbacks++
      await admin.from('fh_price_history').insert({product_id:product.id,variant_id:variant.id,observed_price:sale,regular_price:regular})
      const isDeal=qualifies(sale,regular,p.category)
      if(isDeal)diag.dealThresholdPass++; else if(validMarkdown(sale,regular,p.category)){diag.dealThresholdFail++;diag.rejectedValue++} else diag.rejectedNoMarkdown++
      await upsertDeal(admin,product,variant,p,sale,regular,isDeal)
      if(isDeal)diag.deals++
    } else if(v.inStock===false) {
      await upsertDeal(admin,product,variant,p,sale,regular,false)
    }
  }
  return diag
}

async function mapLimit(items,limit,fn,delayMs=0){const out=new Array(items.length);let next=0;async function worker(workerId){if(delayMs&&workerId)await sleep(workerId*Math.ceil(delayMs/limit));while(true){const i=next++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch(e){out[i]={error:e}}if(delayMs)await sleep(delayMs)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},(_,i)=>worker(i)));return out}

const RETAILER_PACING={glamorise:{concurrency:2,delayMs:650,retries:2},bloomchic:{concurrency:2,delayMs:650,retries:2},'universal-standard':{concurrency:2,delayMs:450,retries:1}}
async function scanOneResilient(admin,retailer,url){const policy=RETAILER_PACING[retailer.slug]||{concurrency:4,delayMs:120,retries:1};let last;for(let attempt=0;attempt<=policy.retries;attempt++){try{return await scanOne(admin,retailer,url)}catch(e){last=e;const msg=String(e?.message||e);if(!/429|too many requests/i.test(msg)||attempt>=policy.retries)throw e;await sleep(900*Math.pow(2,attempt)+Math.floor(Math.random()*350))}}throw last}


function categoryFromUrl(url=''){
  const s=String(url).toLowerCase()
  if(/bra|bralette|panty|intimate|lingerie/.test(s)) return 'Intimates'
  if(/jean|denim|pant|legging|skirt|short/.test(s)) return 'Bottoms'
  if(/dress|gown|jumpsuit|romper/.test(s)) return 'Dresses'
  if(/cardigan|jacket|coat|blazer|sweater|shacket|duster|wrap/.test(s)) return 'Layers'
  if(/sneaker|shoe|boot|flat|loafer|sandal|slipper/.test(s)) return 'Shoes'
  if(/pajama|sleep|robe|lounge/.test(s)) return 'Lounge'
  if(/active|workout|yoga|performance|sport/.test(s)) return 'Active'
  if(/bag|handbag|crossbody|belt|earring|necklace|bracelet|scarf|tights|hair/.test(s)) return 'Accessories'
  if(/swim|swimsuit|tankini|bikini/.test(s)) return 'Swim'
  return 'Tops'
}

function diversifyUrls(urls,max){
  // Everyday gaps first, then church/date-night categories. Round-robin prevents a
  // retailer sitemap dominated by one category from consuming the whole scan budget.
  const order=['Bottoms','Tops','Layers','Intimates','Shoes','Lounge','Active','Dresses','Accessories','Swim']
  const buckets=Object.fromEntries(order.map(k=>[k,[]]))
  for(const url of urls){const c=categoryFromUrl(url);(buckets[c]||buckets.Tops).push(url)}
  const out=[]; let moved=true
  while(out.length<max && moved){moved=false;for(const c of order){const u=buckets[c].shift();if(u){out.push(u);moved=true;if(out.length>=max)break}}}
  return out
}

export async function scanRetailers(admin,{limitRetailers=11,productsPerRetailer=52}={}){
  const {data:retailers,error}=await admin.from('fh_retailers').select('*').eq('enabled',true).order('scan_priority').limit(limitRetailers);if(error)throw error
  const summary=[]
  for(const retailer of retailers||[]){
    const start=new Date().toISOString(); const {data:scan}=await admin.from('fh_retailer_scans').insert({retailer_id:retailer.id,started_at:start,status:'running'}).select('id').single()
    const stats={retailer:retailer.name,discovered:0,checked:0,parsed:0,saleCandidates:0,sizeMatches:0,sizeVerified:0,deals:0,images:0,adapterVariants:0,adapterSources:{},stockTrue:0,stockFalse:0,stockUnknown:0,saleSizeOverlap:0,dealThresholdPass:0,dealThresholdFail:0,productPriceFallbacks:0,rejectedNoMarkdown:0,rejectedValue:0,rejectedRelevance:0,rateLimited:0,errors:0}
    const errors=[]
    try{
      let urls=[]
      // Keep a tiny set of previously-seen products fresh, then spend most of each scan
      // moving through the retailer's broader discovered catalog. V5 accidentally put up
      // to 40 fixed preferred URLs before the rotating pool, so with an 18-20 item scan
      // the rotation could never be reached.
      const keepKnown=Math.min(2,productsPerRetailer)
      const {data:known}=await admin.from('fh_products').select('canonical_url,last_seen_at').eq('retailer_id',retailer.id).order('last_seen_at',{ascending:true}).limit(keepKnown)
      urls=(known||[]).map(x=>x.canonical_url)
      const discovered=await discoverRetailerUrls(retailer,900);stats.discovered=discovered.length
      if(discovered.length){
        const preferredCount=Math.min(10,discovered.length)
        const preferred=diversifyUrls(discovered.slice(0,Math.min(180,discovered.length)),preferredCount)
        const preferredSet=new Set(preferred)
        const rest=discovered.filter(u=>!preferredSet.has(u))
        const bucket=Math.floor(Date.now()/14400000)
        const slugSeed=[...String(retailer.slug||'')].reduce((a,c)=>a+c.charCodeAt(0),0)
        const offset=rest.length?((bucket*17)+slugSeed)%rest.length:0
        const rotated=rest.length?[...rest.slice(offset),...rest.slice(0,offset)]:[]
        urls=[...new Set([...urls,...preferred,...diversifyUrls(rotated,Math.max(0,productsPerRetailer-urls.length-preferred.length))])].slice(0,productsPerRetailer)
      }
      const pace=RETAILER_PACING[retailer.slug]||{concurrency:4,delayMs:120,retries:1}
      const results=await mapLimit(urls,pace.concurrency,async url=>{try{return await scanOneResilient(admin,retailer,url)}catch(e){const msg=String(e.message||e).slice(0,220);if(/429|too many requests/i.test(msg))stats.rateLimited++;errors.push({url,error:msg});return null}},pace.delayMs)
      for(const r of results.filter(Boolean)){for(const k of ['checked','parsed','saleCandidates','sizeMatches','sizeVerified','deals','images','adapterVariants','stockTrue','stockFalse','stockUnknown','saleSizeOverlap','dealThresholdPass','dealThresholdFail','productPriceFallbacks','rejectedNoMarkdown','rejectedValue','rejectedRelevance'])stats[k]+=r[k]||0; const src=r.adapterSource||'generic';stats.adapterSources[src]=(stats.adapterSources[src]||0)+1}
      stats.errors=errors.length
      const diagnostic={type:'diagnostic',discovered:stats.discovered,parsed:stats.parsed,saleCandidates:stats.saleCandidates,sizeMatches:stats.sizeMatches,sizeVerified:stats.sizeVerified,images:stats.images,adapterVariants:stats.adapterVariants,adapterSources:stats.adapterSources,stockTrue:stats.stockTrue,stockFalse:stats.stockFalse,stockUnknown:stats.stockUnknown,saleSizeOverlap:stats.saleSizeOverlap,dealThresholdPass:stats.dealThresholdPass,dealThresholdFail:stats.dealThresholdFail,productPriceFallbacks:stats.productPriceFallbacks,rejectedNoMarkdown:stats.rejectedNoMarkdown,rejectedValue:stats.rejectedValue,rateLimited:stats.rateLimited,scanConcurrency:pace.concurrency,scanDelayMs:pace.delayMs}
      await admin.from('fh_retailers').update({last_scan_at:new Date().toISOString(),last_successful_scan_at:new Date().toISOString(),scan_status:'success'}).eq('id',retailer.id)
      await admin.from('fh_retailer_scans').update({finished_at:new Date().toISOString(),products_checked:stats.checked,deals_found:stats.deals,new_deals:stats.deals,errors:[diagnostic,...errors].slice(0,30),status:'success'}).eq('id',scan.id)
    }catch(e){errors.push({error:String(e.message||e)});stats.errors=errors.length;await admin.from('fh_retailers').update({last_scan_at:new Date().toISOString(),scan_status:'error'}).eq('id',retailer.id);if(scan?.id)await admin.from('fh_retailer_scans').update({finished_at:new Date().toISOString(),products_checked:stats.checked,deals_found:stats.deals,errors,status:'error'}).eq('id',scan.id)}
    summary.push(stats)
  }
  return summary
}
