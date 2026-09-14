import { Sparkles, CloudSun, Shirt, ShoppingBag } from 'lucide-react'
import Header from '../components/Header'

export default function Outfits() {
  return (
    <main className="page">
      <Header title="Outfits" subtitle="Style what she owns—or complete the look with live deals." />
      <div className="segmented"><button className="selected">Owned Only</button><button>Mixed</button></div>
      <div className="weather-card"><CloudSun/><div><strong>Season-aware styling</strong><span>Weather can nudge suggestions without taking over.</span></div></div>
      <div className="occasion-grid">
        {['Everyday','Church','Date Night','Errands','Gym','Lounge','Special Occasion'].map(x=><button key={x}>{x}</button>)}
      </div>
      <section className="outfit-feature">
        <div className="outfit-copy"><span className="kicker">3 WAYS TO WEAR</span><h2>Navy polished blouse</h2><p>Church, casual and dinner ideas—built from owned pieces first.</p><button className="primary-btn"><Sparkles size={17}/> Generate ideas</button></div>
        <div className="outfit-tiles">
          <div><Shirt/>Owned</div><div><ShoppingBag/>Owned</div><div className="deal-tile"><Sparkles/>Live deal</div>
        </div>
      </section>
    </main>
  )
}