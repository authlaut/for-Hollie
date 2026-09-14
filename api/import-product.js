import crypto from 'node:crypto'
import { json, requireUser } from './_lib/admin.js'
import { fetchProduct } from './_lib/productParser.js'

async function cacheImages(admin, userId, images, referer) {
  const output=[]
  for (const imageUrl of images.slice(0,6)) {
    try {
      const r=await fetch(imageUrl,{headers:{'user-agent':'Mozilla/5.0','referer':referer}})
      if(!r.ok) continue
      const type=(r.headers.get('content-type')||'image/jpeg').split(';')[0]
      if(!type.startsWith('image/')) continue
      const bytes=Buffer.from(await r.arrayBuffer()); if(bytes.length>8*1024*1024) continue
      const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg'
      const hash=crypto.createHash('sha1').update(imageUrl).digest('hex').slice(0,12)
      const path=`${userId}/imports/${Date.now()}-${hash}.${ext}`
      const { error }=await admin.storage.from('wardrobe-images').upload(path,bytes,{contentType:type,upsert:true,cacheControl:'31536000'})
      if(error) continue
      const { data }=admin.storage.from('wardrobe-images').getPublicUrl(path)
      if(data?.publicUrl) output.push(data.publicUrl)
    } catch {}
  }
  return output
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST required'})
  try{
    const {admin,user}=await requireUser(req); const {url}=req.body||{}
    if(!url) return json(res,400,{error:'Product URL is required'})
    const u=new URL(url); if(u.protocol!=='https:') return json(res,400,{error:'Only https product URLs are supported'})
    const {data:retailers}=await admin.from('fh_retailers').select('id,name,slug,base_url').eq('enabled',true)
    const retailer=(retailers||[]).find(r=>{try{const h=new URL(r.base_url).hostname.replace(/^www\./,'');return u.hostname===h||u.hostname.endsWith(`.${h}`)}catch{return false}})
    if(!retailer) return json(res,400,{error:'That retailer is not enabled in For Hollie'})
    const page=await fetchProduct(url); const cached=await cacheImages(admin,user.id,page.parsed.images,page.finalUrl)
    return json(res,200,{retailer,canonicalUrl:page.finalUrl,...page.parsed,images:cached.length?cached:page.parsed.images,imageCached:cached.length>0})
  }catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Import failed'})}
}
