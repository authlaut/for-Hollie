import { BellRing, Heart, RotateCcw, Tag } from 'lucide-react'
import Header from '../components/Header'

export default function Watchlist() {
  return (
    <main className="page">
      <Header title="Watchlist" subtitle="Price drops, restocks and target-price alerts." />
      <div className="watch-card">
        <div className="watch-icon"><Heart/></div>
        <div className="watch-content">
          <span className="eyebrow">GLAMORISE</span>
          <h3>No-Bounce Camisole Sports Bra</h3>
          <p>Different color · 50D</p>
          <div className="watch-details">
            <span><Tag size={15}/> Target ≤ $25</span>
            <span><BellRing size={15}/> Restock + price alerts</span>
            <span><RotateCcw size={15}/> Useful duplicate allowed</span>
          </div>
        </div>
      </div>
      <div className="empty-panel">
        <h3>Watch what matters</h3>
        <p>Save products for a lower price, a specific color, or Hollie's exact size returning to stock.</p>
      </div>
    </main>
  )
}