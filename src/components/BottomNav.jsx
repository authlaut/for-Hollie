import { NavLink } from 'react-router-dom'
import { Home, Tags, Shirt, Sparkles, Heart } from 'lucide-react'

const items = [
  ['/', Home, 'Home'],
  ['/deals', Tags, 'Deals'],
  ['/wardrobe', Shirt, 'Wardrobe'],
  ['/outfits', Sparkles, 'Outfits'],
  ['/watchlist', Heart, 'Watchlist'],
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(([to, Icon, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={21} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}