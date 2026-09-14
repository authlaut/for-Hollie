import { supabase } from './supabase'
export async function importProductUrl(url){
  const {data:{session}}=await supabase.auth.getSession(); if(!session)throw new Error('Please sign in again.')
  const r=await fetch('/api/import-product',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${session.access_token}`},body:JSON.stringify({url})})
  const body=await r.json().catch(()=>({})); if(!r.ok)throw new Error(body.error||'Could not import product')
  return body
}
export async function uploadWardrobeImage(file,userId){
  if(!file)throw new Error('Choose an image first.')
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase(); const path=`${userId}/uploads/${crypto.randomUUID()}.${ext}`
  const {error}=await supabase.storage.from('wardrobe-images').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false,cacheControl:'31536000'}); if(error)throw error
  const {data}=supabase.storage.from('wardrobe-images').getPublicUrl(path); return data.publicUrl
}
export async function runRetailerScan(){
  const {data:{session}}=await supabase.auth.getSession(); if(!session)throw new Error('Please sign in again.')
  const r=await fetch('/api/scan-now',{method:'POST',headers:{'authorization':`Bearer ${session.access_token}`}}); const body=await r.json().catch(()=>({})); if(!r.ok)throw new Error(body.error||'Scan failed'); return body
}
