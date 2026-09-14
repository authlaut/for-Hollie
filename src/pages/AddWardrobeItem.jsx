import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Save, Link as LinkIcon, Image as ImageIcon, Download, LoaderCircle, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { taxonomy } from '../lib/taxonomy'
import { importRetailerProduct, proxiedProductImage } from '../lib/productImport'
import '../wardrobe.css'

const initial={custom_name:'',retailer_id:'',brand:'',category:'Tops',subcategory:'T-Shirts',color:'',size:'',purchase_price:'',regular_price:'',purchase_date:'',status:'owned',product_url:'',image_url:'',notes:''}

export default function AddWardrobeItem(){
  const{session}=useAuth()
  const navigate=useNavigate()
  const[form,setForm]=useState(initial)
  const[retailers,setRetailers]=useState([])
  const[profileId,setProfileId]=useState(null)
  const[saving,setSaving]=useState(false)
  const[importing,setImporting]=useState(false)
  const[message,setMessage]=useState('')
  const[importMessage,setImportMessage]=useState('')

  useEffect(()=>{(async()=>{
    if(!supabaseConfigured||!session?.user?.id)return
    const[{data:p},{data:r}]=await Promise.all([
      supabase.from('fh_profiles').select('id').eq('owner_user_id',session.user.id).single(),
      supabase.from('fh_retailers').select('id,name').order('scan_priority')
    ])
    setProfileId(p?.id||null);setRetailers(r||[])
  })()},[session?.user?.id])

  const subs=useMemo(()=>taxonomy[form.category]||[],[form.category])
  const change=(k,v)=>setForm(p=>({...p,[k]:v}))
  const categoryChanged=v=>setForm(p=>({...p,category:v,subcategory:taxonomy[v]?.[0]||''}))

  async function importFromUrl(){
    setMessage('');setImportMessage('')
    if(!form.product_url.trim()){setMessage('Paste the retailer product link first.');return}
    setImporting(true)
    try{
      const d=await importRetailerProduct(form.product_url.trim())
      const retailer=retailers.find(r=>r.name===d.retailer)
      setForm(prev=>({
        ...prev,
        custom_name:d.name||prev.custom_name,
        retailer_id:retailer?.id||prev.retailer_id,
        brand:d.brand||prev.brand,
        category:d.category||prev.category,
        subcategory:d.subcategory||prev.subcategory,
        color:d.color||prev.color,
        product_url:d.canonicalUrl||prev.product_url,
        image_url:d.imageUrl ? proxiedProductImage(d.imageUrl) : prev.image_url,
        regular_price:prev.regular_price || (d.price!=null?String(d.price):'')
      }))
      setImportMessage(d.imageUrl
        ? 'Imported product details and retailer image. Add Hollie’s size and the price you actually paid, then save.'
        : 'Imported the product details. The retailer did not expose a usable image, so you can save with the clean placeholder.')
    }catch(err){setMessage(err.message)}
    finally{setImporting(false)}
  }

  async function submit(e){
    e.preventDefault();setMessage('')
    if(!profileId||!session?.user?.id){setMessage('Your profile is unavailable.');return}
    if(!form.custom_name.trim()){setMessage('Product name is required.');return}
    setSaving(true)
    const payload={
      owner_user_id:session.user.id,profile_id:profileId,retailer_id:form.retailer_id||null,
      custom_name:form.custom_name.trim(),brand:form.brand.trim()||null,category:form.category,
      subcategory:form.subcategory||null,color:form.color.trim()||null,size:form.size.trim()||null,
      purchase_price:form.purchase_price===''?null:Number(form.purchase_price),
      regular_price:form.regular_price===''?null:Number(form.regular_price),
      purchase_date:form.purchase_date||null,status:form.status,product_url:form.product_url.trim()||null,
      image_url:form.image_url.trim()||null,notes:form.notes.trim()||null,source:'manual'
    }
    const{error}=await supabase.from('fh_wardrobe_items').insert(payload)
    setSaving(false)
    if(error)setMessage(error.message);else navigate('/wardrobe')
  }

  return <main className="page add-item-page">
    <Header title="Add Wardrobe Item" subtitle="Paste a retailer link and let For Hollie fill in the item."/>
    <button className="back-link" onClick={()=>navigate('/wardrobe')}><ArrowLeft size={17}/> Back</button>

    <section className="form-card retailer-import-card">
      <div className="import-heading"><div><h2>Import from retailer</h2><p>Paste the exact product page from one of the watched stores.</p></div><Download size={20}/></div>
      <label><span className="field-label"><LinkIcon size={14}/> Product URL</span>
        <input type="url" value={form.product_url} onChange={e=>change('product_url',e.target.value)} placeholder="https://www.torrid.com/..."/>
      </label>
      <button type="button" className="primary-btn import-btn" onClick={importFromUrl} disabled={importing}>
        {importing?<><LoaderCircle className="spin" size={17}/> Reading retailer page…</>:<><Download size={17}/> Import Product Details</>}
      </button>
      {importMessage&&<div className="success-note"><CheckCircle2 size={16}/>{importMessage}</div>}
    </section>

    <form className="item-form" onSubmit={submit}>
      <section className="form-card"><h2>Item</h2>
        <label>Product name *<input value={form.custom_name} onChange={e=>change('custom_name',e.target.value)} required/></label>
        <div className="form-grid">
          <label>Retailer<select value={form.retailer_id} onChange={e=>change('retailer_id',e.target.value)}><option value="">Choose retailer</option>{retailers.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label>Brand<input value={form.brand} onChange={e=>change('brand',e.target.value)}/></label>
        </div>
        <div className="form-grid">
          <label>Category<select value={form.category} onChange={e=>categoryChanged(e.target.value)}>{Object.keys(taxonomy).map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Subcategory<select value={form.subcategory} onChange={e=>change('subcategory',e.target.value)}>{subs.map(s=><option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label>Color<input value={form.color} onChange={e=>change('color',e.target.value)}/></label>
          <label>Size<input value={form.size} onChange={e=>change('size',e.target.value)} placeholder="3, 24, 50D…"/></label>
        </div>
      </section>

      <section className="form-card"><h2>Purchase</h2>
        <div className="form-grid">
          <label>Price paid<input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e=>change('purchase_price',e.target.value)}/></label>
          <label>Regular / listed price<input type="number" min="0" step="0.01" value={form.regular_price} onChange={e=>change('regular_price',e.target.value)}/></label>
        </div>
        <div className="form-grid">
          <label>Purchase date<input type="date" value={form.purchase_date} onChange={e=>change('purchase_date',e.target.value)}/></label>
          <label>Status<select value={form.status} onChange={e=>change('status',e.target.value)}><option value="owned">Owned</option><option value="on_the_way">On the way</option></select></label>
        </div>
      </section>

      <section className="form-card"><h2>Retailer image</h2>
        {form.image_url?<div className="import-preview"><img src={form.image_url} alt="Imported product preview" onError={e=>{e.currentTarget.style.display='none'}}/><div><strong>Image imported</strong><span>Saved from the retailer page through For Hollie.</span></div></div>:<p className="form-help">No retailer image has been imported yet. The wardrobe will use a clean category placeholder if you save it this way.</p>}
        <label><span className="field-label"><ImageIcon size={14}/> Image URL override</span><input type="text" value={form.image_url} onChange={e=>change('image_url',e.target.value)} placeholder="Filled automatically when available"/></label>
      </section>

      <section className="form-card"><h2>Notes</h2><label>Optional notes<textarea value={form.notes} onChange={e=>change('notes',e.target.value)}/></label></section>
      {message&&<div className="error-note">{message}</div>}
      <button className="primary-btn save-item-btn" disabled={saving}><Save size={17}/>{saving?'Saving…':'Save to Wardrobe'}</button>
    </form>
  </main>
}