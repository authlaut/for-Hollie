import { json, requireUser } from './_lib/admin.js'

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST required'})
  try{
    await requireUser(req)
    const token=process.env.FOR_HOLLIE_ACTIONS_TOKEN
    const owner=process.env.FOR_HOLLIE_GITHUB_OWNER||'authlaut'
    const repo=process.env.FOR_HOLLIE_GITHUB_REPO||'for-Hollie'
    const ref=process.env.FOR_HOLLIE_GITHUB_REF||'main'
    const workflow=process.env.FOR_HOLLIE_SCAN_WORKFLOW||'for-hollie-browser-scan.yml'
    if(!token){
      return json(res,503,{error:'Browser scanner is not connected yet. Add FOR_HOLLIE_ACTIONS_TOKEN to Vercel.'})
    }
    const r=await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,{
      method:'POST',
      headers:{
        authorization:`Bearer ${token}`,
        accept:'application/vnd.github+json',
        'x-github-api-version':'2022-11-28',
        'user-agent':'For-Hollie-App'
      },
      body:JSON.stringify({ref})
    })
    if(!r.ok){const body=await r.text();throw new Error(`GitHub browser scan dispatch failed (${r.status}): ${body.slice(0,180)}`)}
    return json(res,202,{ok:true,accepted:true,startedAt:new Date().toISOString(),message:'Browser scan queued in GitHub Actions. You can leave or close the app.'})
  }catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Could not start browser scan'})}
}
