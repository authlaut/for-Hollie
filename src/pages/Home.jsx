import { Clock3, TrendingDown, Shirt, Sparkles, ChevronRight } from 'lucide-react'
import Header from '../components/Header'
import DealCard from '../components/DealCard'

const hotDeal = {
  store: 'Torrid',
  name: 'Soft Knit Cardigan',
  regular: 69.90,
  sale: 16.99,
  discount: 76,
  size: 'Size 3',
  match: 94,
  reason: 'High-priority layer',
  badge: 'Exceptional',
  level: 'exceptional',
  image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80'
}

export default function Home() {
  return (
    <main className="page">
      <Header title="Good evening" subtitle="A smarter wardrobe, just for Hollie." />
      <section className="update-strip">
        <div><Clock3 size={16}/><strong>Last updated:</strong> Today, 7:42 PM</div>
        <span>Next scan ~10:45 PM</span>
      </section>

      <section className="hero-card">
        <div>
          <div className="kicker">FOR HOLLIE</div>
          <h2>Beautiful finds.<br/><span>Exceptional prices.</span></h2>
          <p>Deal quality first, wardrobe need second, style match third.</p>
        </div>
        <div className="hero-orb">FH</div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Today at a glance</h2></div>
        <div className="stats-grid">
          <div className="stat-card"><strong>47</strong><span>Qualifying deals</span></div>
          <div className="stat-card"><strong>12</strong><span>New today</span></div>
          <div className="stat-card"><strong>6</strong><span>Price drops</span></div>
          <div className="stat-card accent"><strong>3</strong><span>Exceptional</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Hot deal for Hollie</h2><span className="section-link">See all <ChevronRight size={16}/></span></div>
        <DealCard deal={hotDeal} />
      </section>

      <section className="section">
        <div className="section-head"><h2>Wardrobe gaps</h2></div>
        <div className="gap-list">
          <div className="gap-card"><Shirt/><div><strong>Neutral cardigans</strong><span>0 / 2 · High priority</span></div><div className="progress"><i style={{width:'8%'}}/></div></div>
          <div className="gap-card"><TrendingDown/><div><strong>Black / neutral pants</strong><span>0 known · High priority</span></div><div className="progress"><i style={{width:'6%'}}/></div></div>
          <div className="gap-card"><Sparkles/><div><strong>Everyday tops</strong><span>2 / 10–14 · High priority</span></div><div className="progress"><i style={{width:'18%'}}/></div></div>
        </div>
      </section>
    </main>
  )
}