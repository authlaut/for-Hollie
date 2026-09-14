import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, SlidersHorizontal, PackageCheck, Truck, ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import '../wardrobe.css'

const categories = ['All','Tops','Bottoms','Dresses','Layers','Intimates','Active','Lounge','Shoes','Swim','Accessories']

function ItemImage({ item }) {
  const [failed, setFailed] = useState(false)
  if (!item.image_url || failed) {
    return (
      <div className="wardrobe-placeholder">
        <ImageOff size={26}/>
        <span>{item.category || 'Wardrobe'}</span>
      </div>
    )
  }
  return <img src={item.image_url} alt={item.custom_name || 'Wardrobe item'} onError={()=>setFailed(true)} />
}

export default function Wardrobe() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured || !session?.user?.id) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('fh_wardrobe_items')
        .select(`
          id, custom_name, image_url, category, subcategory, brand, color, size,
          purchase_price, regular_price, purchase_date, status, product_url, notes,
          retailer:fh_retailers(name)
        `)
        .eq('owner_user_id', session.user.id)
        .in('status', ['owned','on_the_way'])
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setItems(data || [])
      setLoading(false)
    }
    load()
  }, [session?.user?.id])

  const filtered = useMemo(() => items.filter(item => {
    if (category !== 'All' && item.category !== category) return false
    if (q) {
      const hay = `${item.custom_name || ''} ${item.brand || ''} ${item.color || ''} ${item.subcategory || ''}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }), [items, category, q])

  return (
    <main className="page">
      <Header title="Wardrobe" subtitle="Hollie's real closet—no demo products." />

      <div className="wardrobe-summary">
        <div><strong>{items.length}</strong><span>Tracked items</span></div>
        <div><strong>{items.filter(x=>x.status==='on_the_way').length}</strong><span>On the way</span></div>
        <div><strong>{items.filter(x=>x.status==='owned').length}</strong><span>Owned</span></div>
      </div>

      <div className="search-row">
        <label className="search-box">
          <Search size={18}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search wardrobe"/>
        </label>
        <button className="filter-btn" title="Category filters are below"><SlidersHorizontal size={18}/></button>
      </div>

      <div className="chip-scroll">
        {categories.map(c => (
          <button key={c} onClick={()=>setCategory(c)} className={`chip ${category===c?'selected':''}`}>{c}</button>
        ))}
      </div>

      <Link to="/wardrobe/add" className="add-btn wardrobe-add-btn"><Plus size={17}/> Add item</Link>

      {loading && <div className="empty-panel"><h3>Loading wardrobe…</h3></div>}
      {error && <div className="error-note">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-panel">
          <h3>{items.length ? 'No items match this filter' : 'Start Hollie’s updated wardrobe'}</h3>
          <p>{items.length ? 'Try another category or search.' : 'Add new purchases here. Older clothes do not need to be cataloged unless you want them included.'}</p>
          <Link to="/wardrobe/add" className="primary-btn"><Plus size={16}/> Add first item</Link>
        </div>
      )}

      <section className="wardrobe-grid">
        {filtered.map(item => (
          <article className="wardrobe-card" key={item.id}>
            <div className="wardrobe-image-wrap">
              <ItemImage item={item}/>
              <span className={`owned-status ${item.status}`}>
                {item.status === 'on_the_way' ? <><Truck size={13}/> On the way</> : <><PackageCheck size={13}/> Owned</>}
              </span>
            </div>
            <div className="wardrobe-body">
              <span className="eyebrow">{item.retailer?.name || item.brand || 'Wardrobe'}</span>
              <h3>{item.custom_name || 'Untitled item'}</h3>
              <p>{[item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ')}</p>
              <div className="wardrobe-meta">
                {item.purchase_price != null && <span>${Number(item.purchase_price).toFixed(2)} paid</span>}
                {item.subcategory && <span>{item.subcategory}</span>}
              </div>
              {item.product_url && (
                <a className="item-source-link" href={item.product_url} target="_blank" rel="noreferrer">Retailer page</a>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}