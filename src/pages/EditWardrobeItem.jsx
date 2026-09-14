import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Download, LoaderCircle, CheckCircle2 } from 'lucide-react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { taxonomy } from '../lib/taxonomy'
import { importRetailerProduct, proxiedProductImage } from '../lib/productImport'
import '../wardrobe.css'

export default function EditWardrobeItem(){
  const{id}=useParams();const{session}=useAuth();const nav=useNavigate()
  const[item,setItem]=useState(null),[retailers,setRetailers]=useState([]),[saving,setSaving]=useState(false),[importing,setImporting]=useState(false),[msg,setMsg]=useState(''),[importMsg,setImportMsg]=useState('')

  useEffect(()=>{(async()=>{
    const[{data:i,error},{data:r}]=await Promise.all([
      supabase.from('fh_wardrobe_items').select('*').eq('id',id).eq('owner_user_id',session.user.id).single(),
      supabase.from('fh_retailers').select('id,name').order('scan_priority')
    ])
    if(error)setMsg(error.message);else setItem(i);setRetailers(r||[])
  })()},[id,session?.user?.id])

  if(!item)return <main className="page"><Header title="Edit Item"/>{msg?<div className="error-note">{msg}</div>:<div className="empty-panel">Loading…</div>}</main>
  const ch=(k,v)=>setItem(p=>({...p,[k]:v}))

  async function reimport(){
    setMsg('');setImportMsg('')
    if(!item.product_url){setMsg('Add the retailer product URL first.');return}
    setImporting(true)
    try{
      const d=await importRetailerProduct(item.product_url)
      const retailer=retailers.find(r=>r.name===d.retailer)
      setItem(prev=>({...prev,
        custom_name:d.name||prev.custom_name,
        retailer_id:retailer?.id||prev.retailer_id,
        brand:d.brand||prev.brand,
        category:d.category||prev.category,
        subcategory:d.subcategory||prev.subcategory,
        color:d.color||prev.color,
        product_url:d.canonicalUrl||prev.product_url,
        image_url:d.imageUrl?proxiedProductImage(d.imageUrl):prev.image_url,
        regular_price:prev.regular_price ?? (d.price!=null?d.price:null)
      }))
      setImportMsg(d.imageUrl?'Product details and retailer image refreshed.':'Product details refreshed; this retailer did not expose a usable image.')
    }catch(err){setMsg(err.message)}
    finally{setImporting(false)}
  }

  const save=async e=>{
    e.preventDefault();setSaving(true)
    const{error}=await supabase.from('fh_wardrobe_items').update({
      custom_name:item.custom_name,retailer_id:item.retailer_id||null,brand:item.brand||null,
      category:item.category,subcategory:item.subcategory||null,color:item.color||null,size:item.size||null,
      purchase_price:item.purchase_price===''?null:Number(item.purchase_price),
      regular_price:item.regular_price===''?null:Number(item.regular_price),
      purchase_date:item.purchase_date||null,status:item.status,product_url:item.product_url||null,
      image_url:item.image_url||null,notes:item.notes||null
    }).eq('id',id).eq('owner_user_id',session.user.id)
    setSaving(false);if(error)setMsg(error.message);else nav('/wardrobe')
  }
  const del=async()=>{if(!window.confirm('Remove this item from the wardrobe?'))return;await supabase.from('fh_wardrobe_items').delete().eq('id',id).eq('owner_user_id',session.user.id);nav('/wardrobe')}
  const subs=taxonomy[item.category]||[]

  return <main className="page add-item-page">
    <Header title="Edit Wardrobe Item"/>
    <button className="back-link" onClick={()=>nav('/wardrobe')}><ArrowLeft size={17}/> Back</button>

    <form className="item-form" onSubmit={save}>
      <section className="form-card retailer-import-card">
        <h2>Retailer source</h2>
        <label>Retailer URL<input type="url" value={item.product_url||''} onChange={e=>ch('product_url',e.target.value)} placeholder="Paste the exact product page"/></label>
        <button type="button" className="secondary-btn import-btn" onClick={reimport} disabled={importing}>
          {importing?<><LoaderCircle className="spin" size={16}/> Refreshing…</>:<><Download size={16}/> Refresh Details & Image</>}
        </button>
        {importMsg&&<div className="success-note"><CheckCircle2 size={16}/>{importMsg}</div>}
      </section>

      <section className="form-card"><h2>Item</h2>
        <label>Product name<input value={item.custom_name||''} onChange={e=>ch('custom_name',e.target.value)}/></label>
        <div className="form-grid">
          <label>Retailer<select value={item.retailer_id||''} onChange={e=>ch('retailer_id',e.target.value)}><option value="">Choose retailer</option>{retailers.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label>Brand<input value={item.brand||''} onChange={e=>ch('brand',e.target.value)}/></label>
        </div>
        <div className="form-grid">
          <label>Category<select value={item.category||'Tops'} onChange={e=>{ch('category',e.target.value);ch('subcategory',taxonomy[e.target.value]?.[0]||'')}}>{Object.keys(taxonomy).map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Subcategory<select value={item.subcategory||''} onChange={e=>ch('subcategory',e.target.value)}>{subs.map(s=><option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label>Color<input value={item.color||''} onChange={e=>ch('color',e.target.value)}/></label>
          <label>Size<input value={item.size||''} onChange={e=>ch('size',e.target.value)}/></label>
        </div>
      </section>

      <section className="form-card"><h2>Purchase</h2>
        <div className="form-grid">
          <label>Price paid<input type="number" step="0.01" value={item.purchase_price??''} onChange={e=>ch('purchase_price',e.target.value)}/></label>
          <label>Regular price<input type="number" step="0.01" value={item.regular_price??''} onChange={e=>ch('regular_price',e.target.value)}/></label>
        </div>
        <div className="form-grid">
          <label>Purchase date<input type="date" value={item.purchase_date||''} onChange={e=>ch('purchase_date',e.target.value)}/></label>
          <label>Status<select value={item.status} onChange={e=>ch('status',e.target.value)}><option value="owned">Owned</option><option value="on_the_way">On the way</option><option value="returned">Returned</option><option value="donated">Donated</option><option value="retired">Retired</option></select></label>
        </div>
      </section>

      <section className="form-card"><h2>Image & notes</h2>
        {item.image_url?<div className="import-preview"><img src={item.image_url} alt="Product preview"/><div><strong>Current product image</strong><span>Refresh above if the retailer page has a better image.</span></div></div>:<p className="form-help">No image saved yet. Paste the retailer URL above and tap Refresh Details & Image.</p>}
        <label>Image URL override<input type="text" value={item.image_url||''} onChange={e=>ch('image_url',e.target.value)}/></label>
        <label>Notes<textarea value={item.notes||''} onChange={e=>ch('notes',e.target.value)}/></label>
      </section>

      {msg&&<div className="error-note">{msg}</div>}
      <div className="form-actions">
        <button className="secondary-btn danger" type="button" onClick={del}><Trash2 size={16}/> Remove</button>
        <button className="primary-btn" disabled={saving}><Save size={16}/>{saving?'Saving…':'Save Changes'}</button>
      </div>
    </form>
  </main>
}