import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Save, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import '../wardrobe.css'

const taxonomy = {
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

const initial = {
  custom_name:'', retailer_id:'', brand:'', category:'Tops', subcategory:'T-Shirts',
  color:'', size:'', purchase_price:'', regular_price:'', purchase_date:'',
  status:'owned', product_url:'', image_url:'', notes:''
}

export default function AddWardrobeItem() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [form,setForm] = useState(initial)
  const [retailers,setRetailers] = useState([])
  const [profileId,setProfileId] = useState(null)
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured || !session?.user?.id) return
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('fh_profiles').select('id').eq('owner_user_id', session.user.id).single(),
        supabase.from('fh_retailers').select('id,name').eq('enabled', true).order('scan_priority')
      ])
      setProfileId(p?.id || null)
      setRetailers(r || [])
    }
    load()
  }, [session?.user?.id])

  const subs = useMemo(()=>taxonomy[form.category] || [],[form.category])

  const change = (key,value) => setForm(prev => ({...prev,[key]:value}))

  const categoryChanged = (value) => {
    const first = taxonomy[value]?.[0] || ''
    setForm(prev=>({...prev,category:value,subcategory:first}))
  }

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    if (!profileId || !session?.user?.id) {
      setMessage('Your For Hollie profile is not available yet.')
      return
    }
    if (!form.custom_name.trim()) {
      setMessage('Product name is required.')
      return
    }

    setSaving(true)
    const payload = {
      owner_user_id: session.user.id,
      profile_id: profileId,
      retailer_id: form.retailer_id || null,
      custom_name: form.custom_name.trim(),
      brand: form.brand.trim() || null,
      category: form.category,
      subcategory: form.subcategory || null,
      color: form.color.trim() || null,
      size: form.size.trim() || null,
      purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price),
      regular_price: form.regular_price === '' ? null : Number(form.regular_price),
      purchase_date: form.purchase_date || null,
      status: form.status,
      product_url: form.product_url.trim() || null,
      image_url: form.image_url.trim() || null,
      notes: form.notes.trim() || null,
      source: 'manual'
    }

    const { error } = await supabase.from('fh_wardrobe_items').insert(payload)
    setSaving(false)

    if (error) setMessage(error.message)
    else navigate('/wardrobe')
  }

  return (
    <main className="page add-item-page">
      <Header title="Add Wardrobe Item" subtitle="Add a purchase as soon as you buy it."/>
      <button className="back-link" onClick={()=>navigate('/wardrobe')}><ArrowLeft size={17}/> Back to wardrobe</button>

      <form className="item-form" onSubmit={submit}>
        <section className="form-card">
          <h2>Item</h2>
          <label>Product name *<input value={form.custom_name} onChange={e=>change('custom_name',e.target.value)} placeholder="e.g. Lace Trim Tie Front Blouse"/></label>

          <div className="form-grid">
            <label>Retailer
              <select value={form.retailer_id} onChange={e=>change('retailer_id',e.target.value)}>
                <option value="">Choose retailer</option>
                {retailers.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label>Brand<input value={form.brand} onChange={e=>change('brand',e.target.value)} placeholder="Optional"/></label>
          </div>

          <div className="form-grid">
            <label>Category
              <select value={form.category} onChange={e=>categoryChanged(e.target.value)}>
                {Object.keys(taxonomy).map(c=><option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Subcategory
              <select value={form.subcategory} onChange={e=>change('subcategory',e.target.value)}>
                {subs.map(s=><option key={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>Color<input value={form.color} onChange={e=>change('color',e.target.value)} placeholder="Navy"/></label>
            <label>Size<input value={form.size} onChange={e=>change('size',e.target.value)} placeholder="3, 24, 50D…"/></label>
          </div>
        </section>

        <section className="form-card">
          <h2>Purchase</h2>
          <div className="form-grid">
            <label>Price paid<input type="number" step="0.01" value={form.purchase_price} onChange={e=>change('purchase_price',e.target.value)} placeholder="20.00"/></label>
            <label>Regular price<input type="number" step="0.01" value={form.regular_price} onChange={e=>change('regular_price',e.target.value)} placeholder="Optional"/></label>
          </div>
          <div className="form-grid">
            <label>Purchase date<input type="date" value={form.purchase_date} onChange={e=>change('purchase_date',e.target.value)}/></label>
            <label>Status
              <select value={form.status} onChange={e=>change('status',e.target.value)}>
                <option value="owned">Owned</option>
                <option value="on_the_way">On the way</option>
              </select>
            </label>
          </div>
        </section>

        <section className="form-card">
          <h2>Links & image</h2>
          <label><span className="field-label"><LinkIcon size={14}/> Retailer product URL</span>
            <input type="url" value={form.product_url} onChange={e=>change('product_url',e.target.value)} placeholder="https://..."/>
          </label>
          <label><span className="field-label"><ImageIcon size={14}/> Product image URL</span>
            <input type="url" value={form.image_url} onChange={e=>change('image_url',e.target.value)} placeholder="Optional—leave blank instead of using a wrong image"/>
          </label>
          <p className="form-help">Later, live retailer imports can fill these automatically. For manual purchases, leaving the image blank will show a clean placeholder.</p>
        </section>

        <section className="form-card">
          <h2>Notes</h2>
          <label>Optional notes<textarea value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="Fit notes can be added after Hollie tries it on."/></label>
        </section>

        {message && <div className="error-note">{message}</div>}
        <button className="primary-btn save-item-btn" disabled={saving}><Save size={17}/>{saving?'Saving…':'Save to Wardrobe'}</button>
      </form>
    </main>
  )
}