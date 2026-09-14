import { createClient } from '@supabase/supabase-js'

export function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } })
}

export async function requireUser(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw new Error('Unauthorized')
  const admin = adminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) throw new Error('Unauthorized')
  return { admin, user:data.user }
}

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type','application/json')
  res.end(JSON.stringify(body))
}
