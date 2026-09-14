import { Search, Plus, SlidersHorizontal } from 'lucide-react'
import Header from '../components/Header'

const items = [
  {name:'Lace Trim Tie Front Blouse', store:'Torrid', color:'Whisper White', size:'3', fit:'Great fit', style:'Love', image:'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'},
  {name:'Lace Trim Tie Front Blouse', store:'Torrid', color:'Navy', size:'3', fit:'Great fit', style:'Love', image:'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80'},
  {name:'No-Bounce Camisole Sports Bra', store:'Glamorise', color:'Black', size:'50D', fit:'Not tested yet', style:'New', image:'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80'}
]

export default function Wardrobe() {
  return (
    <main className="page">
      <Header title="Wardrobe" subtitle="The new closet we're building for Hollie." />
      <div className="search-row">
        <label className="search-box"><Search size={18}/><input placeholder="Search wardrobe"/></label>
        <button className="filter-btn"><SlidersHorizontal size={18}/></button>
      </div>
      <div className="chip-scroll">
        {['All','Tops','Bottoms','Dresses','Layers','Intimates','Active','Lounge','Shoes','Swim','Accessories'].map((c,i)=><button key={c} className={`chip ${i===0?'selected':''}`}>{c}</button>)}
      </div>
      <button className="add-btn"><Plus size={17}/> Add item</button>
      <section className="wardrobe-grid">
        {items.map((item,i)=>(
          <article className="wardrobe-card" key={i}>
            <img src={item.image} alt=""/>
            <div className="wardrobe-body">
              <span className="eyebrow">{item.store}</span>
              <h3>{item.name}</h3>
              <p>{item.color} · Size {item.size}</p>
              <div className="tiny-tags"><span>{item.fit}</span><span>{item.style}</span></div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}