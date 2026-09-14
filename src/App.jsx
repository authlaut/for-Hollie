import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Deals from './pages/Deals'
import Wardrobe from './pages/Wardrobe'
import Outfits from './pages/Outfits'
import Watchlist from './pages/Watchlist'
import Settings from './pages/Settings'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'
import { useAuth } from './context/AuthContext'

function Shell() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/deals" element={<Deals/>}/>
        <Route path="/wardrobe" element={<Wardrobe/>}/>
        <Route path="/outfits" element={<Outfits/>}/>
        <Route path="/watchlist" element={<Watchlist/>}/>
        <Route path="/settings" element={<Settings/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { session, loading, supabaseConfigured } = useAuth()
  if (loading) return <div className="loading-screen">For Hollie</div>

  // Demo shell remains visible before Supabase is configured so Vercel can be tested immediately.
  if (!supabaseConfigured) return <Shell />
  if (!session) return <Login />
  return <Shell />
}