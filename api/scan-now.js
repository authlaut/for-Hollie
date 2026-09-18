import { waitUntil } from '@vercel/functions'
import { json, requireUser } from './_lib/admin.js'
import { scanRetailers } from './_lib/scanner.js'

export const maxDuration = 300

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST required'})
  try{
    const { admin, user } = await requireUser(req)
    const startedAt = new Date().toISOString()

    // IMPORTANT: return to the phone immediately, then let Vercel own the work.
    // waitUntil keeps the function alive after the HTTP response is sent, so iOS
    // can suspend/close the PWA without aborting the retailer scan.
    waitUntil((async()=>{
      try{
        await scanRetailers(admin,{productsPerRetailer:24})
      }catch(err){
        console.error('Background retailer scan failed', { userId:user?.id, error:err?.stack||err?.message||String(err) })
      }
    })())

    return json(res,202,{ok:true,accepted:true,startedAt,message:'Scan is running in the background. You can leave or close the app.'})
  }catch(e){
    return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Could not start scan'})
  }
}
