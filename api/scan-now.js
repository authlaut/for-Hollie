import { json, requireUser } from './_lib/admin.js'

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST required'})
  try{
    await requireUser(req)
    const token=process.env.GITHUB_ACTIONS_TOKEN
    const owner=process.env.GITHUB_OWNER
    const repo=process.env.GITHUB_REPO
    const ref=process.env.GITHUB_REF||'main'
    const workflow=process.env.GITHUB_SCAN_WORKFLOW||'for-hollie-browser-scan.yml'
    if(!token||!owner||!repo){
      return json(res,503,{error:'Browser scanner is not connected yet. Add GITHUB_ACTIONS_TOKEN, GITHUB_OWNER, and GITHUB_REPO to Vercel.'})
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
