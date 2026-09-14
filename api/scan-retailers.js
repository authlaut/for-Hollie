import { adminClient, json } from './_lib/admin.js'
import { scanRetailers } from './_lib/scanner.js'
export const maxDuration = 300
export default async function handler(req,res){
  const secret=process.env.CRON_SECRET
  const auth=req.headers.authorization||''
  if(secret && auth!==`Bearer ${secret}`) return json(res,401,{error:'Unauthorized'})
  try{const summary=await scanRetailers(adminClient(),{productsPerRetailer:20});return json(res,200,{ok:true,summary})}catch(e){return json(res,500,{error:e.message||'Scan failed'})}
}
