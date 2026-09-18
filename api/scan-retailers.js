import { json } from './_lib/admin.js'
export default async function handler(req,res){
  return json(res,410,{error:'For Hollie v8.4.1 retired the Vercel HTML scanner. Use the GitHub Actions Playwright browser scanner.'})
}
