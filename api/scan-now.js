import { json, requireUser } from './_lib/admin.js'
import { scanRetailers } from './_lib/scanner.js'
export const maxDuration = 300
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST required'})
  try{const{admin}=await requireUser(req);const summary=await scanRetailers(admin,{productsPerRetailer:36});return json(res,200,{ok:true,summary})}catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Scan failed'})}
}
