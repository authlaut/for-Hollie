import { useState } from 'react'
import { SlidersHorizontal, Check, Search } from 'lucide-react'
import Header from '../components/Header'
import DealCard from '../components/DealCard'

const deals = [
  { store:'BloomChic', name:'Textured Long Cardigan', regular:49.90, sale:18.99, discount:62, size:'3X / 22–24', match:91, reason:'Works with 5 owned pieces', badge:'Strong Buy', level:'strong', image:'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' },
  { store:'Maurices', name:'Soft V-Neck Blouse', regular:39.90, sale:14.95, discount:63, size:'3X', match:89, reason:'Everyday + church crossover', badge:'Strong Buy', level:'strong', image:'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80' },
  { store:'Torrid', name:'Ponte Straight Pant', regular:79.90, sale:23.99, discount:70, size:'24', match:96, reason:'High-priority bottom', badge:'Exceptional', level:'exceptional', image:'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80' },
]

const categories = ['All','Tops','Bottoms','Dresses','Layers','Intimates','Active','Lounge','Shoes','Swim','Accessories']
const quick = ['70%+ Off','New','Price Drops','Verified Size','Church','Everyday','Fall','Lowest Seen']

export default function Deals() {
  const [category, setCategory] = useState('All')
  const [q, setQ] = useState('')
  return (
    <main className="page">
      <Header title="Deals" subtitle="Relevant discounts first. Everything else stays out." />
      <section className="update-strip"><div><Check size={16}/><strong>Verified feed</strong> · Last updated 7:42 PM</div><span>47 qualifying</span></section>

      <div className="search-row">
        <label className="search-box"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search deals"/></label>
        <button className="filter-btn"><SlidersHorizontal size={18}/> Filters</button>
      </div>

      <div className="chip-scroll">
        {categories.map(c => <button key={c} onClick={()=>setCategory(c)} className={`chip ${category===c?'selected':''}`}>{c}</button>)}
      </div>
      <div className="chip-scroll secondary">
        {quick.map(c => <button key={c} className="chip small">{c}</button>)}
      </div>

      <div className="sort-tabs">
        <button className="selected">Best for Hollie</button><button>Deepest Discounts</button><button>Newest</button><button>Price Drops</button>
      </div>

      <section className="deal-list">
        {deals.map((deal,i)=><DealCard key={i} deal={deal} />)}
      </section>
    </main>
  )
}