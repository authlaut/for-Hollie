import { createClient } from '@supabase/supabase-js'
import { discountPct, quality, qualifies, inferCategory, sizeMatchesBrowser, normalizeSize } from './utils.mjs'

export function adminClient(){
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key)throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}

export async function loadRetailers(admin){
  const {data,error}=await admin.from('fh_retailers').select('*').eq('enabled',true).order('scan_priority')
  if(error)throw error
  return data||[]
}

export async function loadSizeContext(admin){
  const {data:profiles}=await admin.from('fh_profiles').select('id').limit(20)
  const ids=(profiles||[]).map(x=>x.id)
  const out={generic:[],store:[]}
  if(!ids.length)return out
  const [{data:g},{data:s}]=await Promise.all([
    admin.from('fh_size_profiles').select('*').in('profile_id',ids),
    admin.from('fh_store_sizes').select('*').in('profile_id',ids)
  ])
  out.generic=g||[]; out.store=s||[]; return out
}

export function desiredSizes(sizeCtx,retailer,category){
  const map={Tops:['tops'],Layers:['layers','tops'],Dresses:['dresses'],Bottoms:['bottoms'],Intimates:['bras','pullover_bras'],Shoes:['shoes'],Swim:['swim'],Active:['tops','bottoms'],Lounge:['tops','bottoms'],Accessories:[]}
  const values=[]
  for(const r of sizeCtx.store.filter(x=>x.retailer_id===retailer.id && (!x.category||x.category===category))){values.push(r.preferred_size,r.alternate_size)}
  for(const r of sizeCtx.generic.filter(x=>(map[category]||[]).includes(r.category))){
    values.push(r.size_primary,r.size_secondary)
    if(r.bra_band&&r.bra_cup)values.push(`${r.bra_band}${r.bra_cup}`)
    if(r.shoe_min)values.push(String(r.shoe_min));if(r.shoe_max)values.push(String(r.shoe_max))
  }
  // Safety fallbacks match Hollie's current known profile if a table is incomplete.
  if(category==='Bottoms')values.push('24','24W')
  if(['Tops','Layers','Dresses'].includes(category))values.push('3X','3XL','24-26','24/26',...(retailer.slug==='torrid'?['3']:[]))
  if(category==='Intimates')values.push('50D','3X','3XL')
  if(category==='Shoes')values.push('9','9.5')
  return [...new Set(values.filter(Boolean).map(String))]
}

export async function startRetailerScan(admin,retailer){
  const {data,error}=await admin.from('fh_retailer_scans').insert({retailer_id:retailer.id,started_at:new Date().toISOString(),status:'running'}).select('id,started_at').single()
  if(error)throw error
  await admin.from('fh_retailers').update({last_scan_at:data.started_at,scan_status:'running'}).eq('id',retailer.id)
  return data
}

export async function finishRetailerScan(admin,retailer,scan,stats,errors=[],status='success'){
  const diagnostic={type:'diagnostic',scanner:'browser-playwright',discovered:stats.discovered||0,parsed:stats.parsed||0,saleCandidates:stats.saleCandidates||0,sizeMatches:stats.sizeMatches||0,sizeVerified:stats.sizeVerified||0,images:stats.images||0,adapterVariants:stats.adapterVariants||0,adapterSources:{'browser-playwright':stats.checked||0},stockTrue:stats.stockTrue||0,stockFalse:stats.stockFalse||0,stockUnknown:stats.stockUnknown||0,saleSizeOverlap:stats.saleSizeOverlap||0,dealThresholdPass:stats.dealThresholdPass||0,dealThresholdFail:stats.dealThresholdFail||0,rejectedNoMarkdown:stats.rejectedNoMarkdown||0,rejectedValue:stats.rejectedValue||0,rejectedRelevance:stats.rejectedRelevance||0,rateLimited:stats.rateLimited||0}
  const finished=new Date().toISOString()
  const scanStatus=status==='error'?'error':((stats.discovered||0)===0?'error':(stats.checked||0)===0?'attention':'success')
  await admin.from('fh_retailers').update({last_scan_at:finished,scan_status:scanStatus,...(scanStatus==='success'?{last_successful_scan_at:finished}:{})}).eq('id',retailer.id)
  await admin.from('fh_retailer_scans').update({finished_at:finished,products_checked:stats.checked||0,deals_found:stats.deals||0,new_deals:stats.deals||0,errors:[diagnostic,...errors].slice(0,30),status}).eq('id',scan.id)
}

export async function saveVerifiedProduct(admin,{retailer,product,sizeNode,category,scanStarted}){
  const sale=Number(product.sale),regular=Number(product.regular||product.sale)
  const {data:p,error:pe}=await admin.from('fh_products').upsert({
    retailer_id:retailer.id,
    retailer_product_id:product.sku||product.canonical,
    canonical_url:product.canonical,
    product_name:product.title,
    brand:product.brand,
    primary_category:category,
    description:product.description,
    primary_image_url:product.image,
    additional_images:[],
    color_name:null,
    last_seen_at:new Date().toISOString(),
    active:true
  },{onConflict:'retailer_id,canonical_url'}).select('id').single()
  if(pe)throw pe
  const key=`browser-${normalizeSize(sizeNode.size)}`
  const {data:v,error:ve}=await admin.from('fh_product_variants').upsert({
    product_id:p.id,retailer_variant_id:key,color:null,size:sizeNode.size,size_normalized:normalizeSize(sizeNode.size),price:sale||null,regular_price:regular||sale||null,in_stock:true,inventory_status:'verified_in_stock',size_verified:true,last_verified_at:new Date().toISOString()
  },{onConflict:'product_id,retailer_variant_id,color,size'}).select('id').single()
  if(ve)throw ve
  if(sale)await admin.from('fh_price_history').insert({product_id:p.id,variant_id:v.id,observed_price:sale,regular_price:regular||sale})
  const pct=discountPct(sale,regular),isDeal=qualifies(sale,regular,category)
  const {data:existing}=await admin.from('fh_deals').select('id').eq('product_id',p.id).eq('variant_id',v.id).order('last_verified_at',{ascending:false}).limit(1).maybeSingle()
  const row={product_id:p.id,variant_id:v.id,sale_price:sale,regular_price:regular,discount_percent:pct,deal_quality:quality(pct),qualifies_for_feed:isDeal,clearance:pct>=50,last_verified_at:new Date().toISOString()}
  if(existing?.id)await admin.from('fh_deals').update(row).eq('id',existing.id);else await admin.from('fh_deals').insert(row)
  return {deal:isDeal,productId:p.id,variantId:v.id}
}

export async function deactivateStaleRetailerDeals(admin,retailer,scanStarted){
  const {data:products}=await admin.from('fh_products').select('id').eq('retailer_id',retailer.id)
  const ids=(products||[]).map(x=>x.id)
  for(let i=0;i<ids.length;i+=100){
    const chunk=ids.slice(i,i+100)
    await admin.from('fh_deals').update({qualifies_for_feed:false}).in('product_id',chunk).lt('last_verified_at',scanStarted)
  }
}
