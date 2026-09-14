import { Bell, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from './Brand'

export default function Header({ title, subtitle }) {
  return (
    <header className="topbar">
      <Brand compact />
      <div className="topbar-copy">
        {title && <h1>{title}</h1>}
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        <button className="icon-btn"><Bell size={19}/></button>
        <Link to="/settings" className="icon-btn"><Settings size={19}/></Link>
      </div>
    </header>
  )
}