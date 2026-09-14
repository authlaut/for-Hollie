import { useMemo, useState } from 'react'
import { SlidersHorizontal, Check, Search, X } from 'lucide-react'
import Header from '../components/Header'
import DealCard from '../components/DealCard'

const deals = [
  { store:'BloomChic', name:'Textured Long Cardigan', regular:49.90, sale:18.99, discount:62, size:'3X / 22–24', match:91, reason:'Works with 5 owned pieces', badge:'Strong Buy', level:'strong', category:'Layers', subcategory:'Cardigans', occasion:['Church','Everyday'], season:['Fall','Winter'], verified:true, newDeal:true, priceDrop:true, lowestSeen:true, image:'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80' },
  { store:'Maurices', name:'Soft V-Neck Blouse', regular:39.90, sale:14.95, discount:63, size:'3X', match:89, reason:'Everyday + church crossover', badge:'Strong Buy', level:'strong', category:'Tops', subcategory:'Blouses', occasion:['Church','Everyday'], season:['Year-Round'], verified:true, newDeal:true, priceDrop:false, lowestSeen:false, image:'https://images.unsplash.com/photo-1564257577054-8e5f4f3502d0?auto=format&fit=crop&w=800&q=80' },
  { store:'Torrid', name:'Ponte Straight Pant', regular:79.90, sale:23.99, discount:70, size:'24', match:96, reason:'High-priority bottom', badge:'Exceptional', level:'exceptional', category:'Bottoms', subcategory:'Ponte / Knit Pants', occasion:['Church','Everyday'], season:['Year-Round'], verified:true, newDeal:false, priceDrop:true, lowestSeen:true, image:'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80' },
  { store:'ELOQUII', name:'Soft Wrap Midi Dress', regular:99.95, sale:29.99, discount:70, size:'24', match:90, reason:'Versatile church + dinner dress', badge:'Exceptional', level:'exceptional', category:'Dresses', subcategory:'Church / Versatile Dresses', occasion:['Church','Date Night'], season:['Fall','Spring'], verified:true, newDeal:true, priceDrop:true, lowestSeen:false, image:'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80' },
  { store:'Lane Bryant', name:'Wireless Lift & Shape Bra', regular:59.95, sale:24.98, discount:58, size:'50D', match:88, reason:'Needed lift & shape category', badge:'Strong Buy', level:'strong', category:'Intimates', subcategory:'Lift & Shape Bras', occasion:['Church','Date Night'], season:['Year-Round'], verified:true, newDeal:false, priceDrop:true, lowestSeen:true, image:'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80' },
  { store:'Old Navy', name:'High-Waisted PowerSoft Leggings', regular:44.99, sale:19.99, discount:56, size:'24', match:85, reason:'High-priority gym bottom', badge:'Strong Buy', level:'strong', category:'Active', subcategory:'Workout Leggings', occasion:['Gym'], season:['Year-Round'], verified:true, newDeal:true, priceDrop:false, lowestSeen:false, image:'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80' },
  { store:'Kohl’s', name:'Everyday Slip-On Sneaker', regular:64.99, sale:29.99, discount:54, size:'9.5', match:82, reason:'Everyday shoe gap', badge:'Strong Buy', level:'strong', category:'Shoes', subcategory:'Slip-Ons', occasion:['Everyday','Errands'], season:['Year-Round'], verified:true, newDeal:false, priceDrop:true, lowestSeen:false, image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' },
  { store:'JCPenney', name:'Soft Knit Pajama Set', regular:52.00, sale:19.99, discount:62, size:'3X', match:84, reason:'High-priority sleepwear gap', badge:'Strong Buy', level:'strong', category:'Lounge', subcategory:'Pajama Sets', occasion:['Lounge'], season:['Fall','Winter'], verified:true, newDeal:true, priceDrop:true, lowestSeen:true, image:'https://images.unsplash.com/photo-1617952385804-7b71d0d4f94f?auto=format&fit=crop&w=800&q=80' },
  { store:'Torrid', name:'Everyday Crossbody Bag', regular:49.90, sale:17.49, discount:65, size:'One Size', match:86, reason:'High-priority accessory gap', badge:'Strong Buy', level:'strong', category:'Accessories', subcategory:'Crossbody Bags', occasion:['Everyday','Church'], season:['Year-Round'], verified:true, newDeal:true, priceDrop:false, lowestSeen:false, image:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80' },
  { store:'BloomChic', name:'Ruched One-Piece Swimsuit', regular:49.90, sale:14.99, discount:70, size:'3X', match:70, reason:'Low-priority wildcard', badge:'Wildcard', level:'strong', category:'Swim', subcategory:'One-Piece', occasion:['Swim'], season:['Summer'], verified:true, newDeal:false, priceDrop:true, lowestSeen:true, image:'https://images.unsplash.com/photo-1560088939-3f6d61a2d04d?auto=format&fit=crop&w=800&q=80' }
]

const categories = ['All','Tops','Bottoms','Dresses','Layers','Intimates','Active','Lounge','Shoes','Swim','Accessories']
const quick = ['70%+ Off','New','Price Drops','Verified Size','Church','Everyday','Fall','Lowest Seen']
const sortTabs = ['Best for Hollie','Deepest Discounts','Newest','Price Drops']
const subcategories = {
  Tops:['T-Shirts','Casual Tops','Blouses','Polished / Church Tops','Knit Tops','Tanks & Camis','Long-Sleeve Basics','Sweatshirts / Hoodies'],
  Bottoms:['Jeans','Casual Pants','Black / Neutral Pants','Ponte / Knit Pants','Wide-Leg Pants','Leggings','Shorts','Skirts'],
  Dresses:['Casual Dresses','Church / Versatile Dresses','Date-Night Dresses','Special-Occasion Dresses','Sweater / Knit Dresses','Maxi Dresses'],
  Layers:['Cardigans','Wraps / Dusters','Sweaters','Shackets','Denim Jackets','Utility Jackets','Blazers','Rain Jackets','Trench Coats','Lightweight Coats','Midweight Coats'],
  Intimates:['Everyday Bras','Lift & Shape Bras','Sports Bras','Lounge / Comfort Bras','Strapless / Specialty Bras','Everyday Panties','Romantic / Fancier Intimates','Smoothing Camis','Slips','Slip Shorts / Anti-Chafe'],
  Active:['Workout Tees','Active Tanks','Workout Leggings','Yoga / Athleisure Pants','Active Shorts','Active Jackets / Zip Layers'],
  Lounge:['Pajama Sets','Sleep Tops','Sleep Bottoms','Lounge Sets','Home Comfort Pants','Robes','Nightgowns / Sleep Dresses'],
  Shoes:['Everyday Sneakers','Walking / Gym Sneakers','Flats','Mary Janes','Loafers','Slip-Ons','Church / Dress Shoes','Boots','Sandals','Slippers / House Shoes'],
  Swim:['One-Piece','Two-Piece','Tankini','Swim Dress','Swim Shorts / Bottoms','Cover-Ups'],
  Accessories:['Crossbody Bags','Everyday Handbags','Church / Polished Handbags','Belts','Earrings','Necklaces','Bracelets','Scarves','Hosiery / Tights','Hair Accessories']
}

export default function Deals() {
  const [category, setCategory] = useState('All')
  const [quickFilters, setQuickFilters] = useState([])
  const [sortBy, setSortBy] = useState('Best for Hollie')
  const [q, setQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [subcategory, setSubcategory] = useState('All')
  const [season, setSeason] = useState('Any')
  const [occasion, setOccasion] = useState('Any')
  const [minDiscount, setMinDiscount] = useState(0)

  const toggleQuick = (name) => setQuickFilters(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  const resetAll = () => { setCategory('All'); setQuickFilters([]); setSubcategory('All'); setSeason('Any'); setOccasion('Any'); setMinDiscount(0); setQ('') }

  const filteredDeals = useMemo(() => {
    let rows = deals.filter(d => {
      if (category !== 'All' && d.category !== category) return false
      if (subcategory !== 'All' && d.subcategory !== subcategory) return false
      if (season !== 'Any' && !d.season.includes(season)) return false
      if (occasion !== 'Any' && !d.occasion.includes(occasion)) return false
      if (d.discount < minDiscount) return false
      if (q && !`${d.store} ${d.name} ${d.category} ${d.subcategory}`.toLowerCase().includes(q.toLowerCase())) return false
      if (quickFilters.includes('70%+ Off') && d.discount < 70) return false
      if (quickFilters.includes('New') && !d.newDeal) return false
      if (quickFilters.includes('Price Drops') && !d.priceDrop) return false
      if (quickFilters.includes('Verified Size') && !d.verified) return false
      if (quickFilters.includes('Church') && !d.occasion.includes('Church')) return false
      if (quickFilters.includes('Everyday') && !d.occasion.includes('Everyday')) return false
      if (quickFilters.includes('Fall') && !d.season.includes('Fall')) return false
      if (quickFilters.includes('Lowest Seen') && !d.lowestSeen) return false
      return true
    })
    if (sortBy === 'Deepest Discounts') rows = [...rows].sort((a,b) => b.discount-a.discount || b.match-a.match)
    if (sortBy === 'Best for Hollie') rows = [...rows].sort((a,b) => b.match-a.match || b.discount-a.discount)
    if (sortBy === 'Newest') rows = [...rows].sort((a,b) => Number(b.newDeal)-Number(a.newDeal) || b.match-a.match)
    if (sortBy === 'Price Drops') rows = [...rows].sort((a,b) => Number(b.priceDrop)-Number(a.priceDrop) || b.discount-a.discount)
    return rows
  }, [category, subcategory, season, occasion, minDiscount, quickFilters, q, sortBy])

  const activeCount = quickFilters.length + (category !== 'All' ? 1 : 0) + (subcategory !== 'All' ? 1 : 0) + (season !== 'Any' ? 1 : 0) + (occasion !== 'Any' ? 1 : 0) + (minDiscount ? 1 : 0)
  const availableSubcategories = category === 'All' ? [] : (subcategories[category] || [])

  return (
    <main className="page">
      <Header title="Deals" subtitle="Relevant discounts first. Everything else stays out." />
      <section className="update-strip">
        <div><Check size={16}/><strong>Verified feed</strong> · Last updated 7:42 PM</div>
        <span>{filteredDeals.length} shown</span>
      </section>

      <div className="search-row">
        <label className="search-box"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search deals"/></label>
        <button className={`filter-btn ${activeCount ? 'has-filters' : ''}`} onClick={()=>setFiltersOpen(true)}>
          <SlidersHorizontal size={18}/> Filters {activeCount ? `(${activeCount})` : ''}
        </button>
      </div>

      <div className="chip-scroll">
        {categories.map(c => <button key={c} onClick={() => { setCategory(c); setSubcategory('All') }} className={`chip ${category===c?'selected':''}`}>{c}</button>)}
      </div>

      {availableSubcategories.length > 0 && (
        <div className="chip-scroll subcategory-row">
          <button onClick={()=>setSubcategory('All')} className={`chip small ${subcategory==='All'?'selected':''}`}>All {category}</button>
          {availableSubcategories.map(s => <button key={s} onClick={()=>setSubcategory(s)} className={`chip small ${subcategory===s?'selected':''}`}>{s}</button>)}
        </div>
      )}

      <div className="chip-scroll secondary">
        {quick.map(c => <button key={c} onClick={()=>toggleQuick(c)} className={`chip small ${quickFilters.includes(c)?'selected':''}`}>{c}</button>)}
      </div>

      <div className="sort-tabs">
        {sortTabs.map(tab => <button key={tab} onClick={()=>setSortBy(tab)} className={sortBy===tab?'selected':''}>{tab}</button>)}
      </div>

      <section className="deal-list">
        {filteredDeals.map((deal,i)=><DealCard key={`${deal.store}-${deal.name}-${i}`} deal={deal} />)}
        {filteredDeals.length === 0 && (
          <div className="empty-panel">
            <h3>No matching demo deals</h3>
            <p>Try clearing a filter. Live retailer monitoring will replace these examples later.</p>
            <button className="secondary-btn" onClick={resetAll}>Clear filters</button>
          </div>
        )}
      </section>

      {filtersOpen && (
        <div className="modal-backdrop" onClick={()=>setFiltersOpen(false)}>
          <section className="filter-sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <div className="filter-sheet-head">
              <div><h2>Filters</h2><p>Narrow Hollie's qualifying deals.</p></div>
              <button className="sheet-close" onClick={()=>setFiltersOpen(false)}><X size={20}/></button>
            </div>

            <div className="filter-group">
              <label>Item type</label>
              <select value={category} onChange={e=>{setCategory(e.target.value);setSubcategory('All')}}>
                {categories.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>

            {availableSubcategories.length > 0 && (
              <div className="filter-group">
                <label>Subcategory</label>
                <select value={subcategory} onChange={e=>setSubcategory(e.target.value)}>
                  <option>All</option>
                  {availableSubcategories.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="filter-grid-2">
              <div className="filter-group">
                <label>Season</label>
                <select value={season} onChange={e=>setSeason(e.target.value)}>
                  {['Any','Year-Round','Spring','Summer','Fall','Winter'].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Use</label>
                <select value={occasion} onChange={e=>setOccasion(e.target.value)}>
                  {['Any','Everyday','Church','Date Night','Errands','Gym','Lounge','Swim'].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
            </div>

            <div className="filter-group">
              <label>Minimum discount</label>
              <div className="discount-options">
                {[0,50,60,70].map(n=><button key={n} onClick={()=>setMinDiscount(n)} className={minDiscount===n?'selected':''}>{n===0?'Any':`${n}%+`}</button>)}
              </div>
            </div>

            <div className="sheet-actions">
              <button className="secondary-btn" onClick={resetAll}>Reset</button>
              <button className="primary-btn" onClick={()=>setFiltersOpen(false)}>Show {filteredDeals.length} Deals</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}