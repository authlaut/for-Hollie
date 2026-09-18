import { json, requireUser } from './_lib/admin.js'

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'GET required'})
  try{
    const { admin } = await requireUser(req)
    const since = new Date(Date.now()-15*60*1000).toISOString()
    const { data:rows, error } = await admin
      .from('fh_retailer_scans')
      .select('id,retailer_id,started_at,finished_at,status,products_checked,deals_found,new_deals,errors')
      .gte('started_at',since)
      .order('started_at',{ascending:false})
      .limit(100)
    if(error) throw error

    const recent=rows||[]
    const running=recent.filter(x=>x.status==='running'&&!x.finished_at)
    const finished=recent.filter(x=>x.finished_at)
    const newestStarted=recent[0]?.started_at||null
    const newestFinished=finished.map(x=>x.finished_at).filter(Boolean).sort().at(-1)||null
    const productsChecked=finished.reduce((n,x)=>n+(Number(x.products_checked)||0),0)
    const dealsFound=finished.reduce((n,x)=>n+(Number(x.deals_found)||0),0)
    const failed=finished.filter(x=>x.status==='error').length

    return json(res,200,{
      ok:true,
      running:running.length>0,
      runningRetailers:running.length,
      recentFinished:finished.length,
      productsChecked,
      dealsFound,
      failed,
      newestStarted,
      newestFinished
    })
  }catch(e){
    return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Could not read scan status'})
  }
}
