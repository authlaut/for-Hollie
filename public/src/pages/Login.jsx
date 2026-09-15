import { useState } from 'react'
import Brand from '../components/Brand'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, supabaseConfigured } = useAuth()
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [message,setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    const { error } = await signIn(email,password)
    if (error) setMessage(error.message)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Brand />
        <p className="login-tagline">Smart deals. A wardrobe she'll love.</p>
        <form onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
          <button className="primary-btn full">Sign in</button>
        </form>
        {!supabaseConfigured && <div className="setup-note">Add your Supabase URL and publishable key in Vercel before using live login.</div>}
        {message && <div className="error-note">{message}</div>}
      </div>
    </div>
  )
}