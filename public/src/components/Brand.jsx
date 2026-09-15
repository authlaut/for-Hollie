import { Link } from 'react-router-dom'
export default function Brand({ compact = false }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="For Hollie home">
      <img src="/icon-192.png" alt="For Hollie" className="brand-mark" />
      <div><div className="brand-for">FOR</div><div className="brand-hollie">Hollie</div></div>
    </Link>
  )
}
