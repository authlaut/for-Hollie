import { useEffect, useMemo, useState } from 'react'
import { Clock3, Shirt, Sparkles, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import DealCard from '../components/DealCard'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { loadLiveDeals, formatScanTime } from '../lib/deals'

function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}

export default function Home(){
 const {session}=useAuth(); const [deals,setDeals]=useState([]); const [lastScan,setLastScan]=useState(null); const [items,setItems]=useState([]); const [targets,setTargets]=useState([]); const [loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{if(!supabaseConfigured||!session?.user?.id){setLoading(false);return}
   const [{deals,lastScan},{data:w},{data:t}] = await Promise.all([
     loadLiveDeals(session.user.id),
     supabase.from('fh_wardrobe_items').select('category,subcategory,status').eq('owner_user_id',session.user.id).in('status',['owned','on_the_way']),
     supabase.from('fh_wardrobe_targets').select('id,category,subcategory,target_min,target_max,priority').eq('owner_user_id',session.user.id)
   ])
   setDeals(deals);setLastScan(lastScan);setItems(w||[]);setTargets(t||[]);setLoading(false)
 })()},[session?.user?.id])
 const gaps=useMemo(()=>targets.map(t=>{const count=items.filter(i=>i.category===t.category && (!t.subcategory||i.subcategory===t.subcategory)).length; return {...t,count}}).filter(x=>x.priority==='high_priority' || x.priority==='needed').sort((a,b)=>(a.count/(a.target_min||1))-(b.count/(b.target_min||1))).slice(0,3),[targets,items])
 const exceptional=deals.filter(d=>d.badge==='Exceptional').length; const newCount=deals.filter(d=>d.newDeal).length; const top=[...deals].sort((a,b)=>(b.match||0)-(a.match||0)||b.discount-a.discount)[0]
 return <main className="page">
   <Header title={greeting()} subtitle="A smarter wardrobe, just for Hollie."/>
   <section className="update-strip"><div><Clock3 size={16}/><strong>Last updated:</strong> {formatScanTime(lastScan)}</div><span>{lastScan?'Live retailer data':'Scanner not connected yet'}</span></section>
   <section className="hero-card"><div><div className="kicker">FOR HOLLIE</div><h2>Beautiful finds.<br/><span>Exceptional prices.</span></h2><p>Deal quality first, wardrobe need second, style match third.</p></div><div className="hero-orb">FH</div></section>
   <section className="section"><div className="section-head"><h2>Today at a glance</h2></div><div className="stats-grid">
     <Link to="/deals" className="stat-card stat-link"><strong>{loading?'—':deals.length}</strong><span>Qualifying deals</span></Link><Link to="/deals?quick=New" className="stat-card stat-link"><strong>{loading?'—':newCount}</strong><span>New today</span></Link><Link to="/wardrobe" className="stat-card stat-link"><strong>{loading?'—':items.length}</strong><span>Tracked wardrobe</span></Link><Link to="/deals?quality=Exceptional" className="stat-card accent stat-link"><strong>{loading?'—':exceptional}</strong><span>Exceptional</span></Link>
   </div></section>
   <section className="section"><div className="section-head"><h2>{top?'Hot deal for Hollie':'Deals'}</h2><Link to="/deals" className="section-link">See deals ›</Link></div>{top?<DealCard deal={top}/>:<div className="empty-panel"><Tags size={24}/><h3>No verified live deals yet</h3><p>Once retailer monitoring writes verified products to Supabase, they will appear here automatically.</p><Link to="/deals" className="secondary-btn">Open Deals</Link></div>}</section>
   <section className="section"><div className="section-head"><h2>Wardrobe gaps</h2></div>{gaps.length?<div className="gap-list">{gaps.map(g=><div className="gap-card" key={g.id}><Shirt/><div><strong>{g.subcategory||g.category}</strong><span>{g.count} / {g.target_min}{g.target_max&&g.target_max!==g.target_min?`–${g.target_max}`:''} · {g.priority.replace('_',' ')}</span></div><div className="progress"><i style={{width:`${Math.min(100,(g.count/(g.target_min||1))*100)}%`}}/></div></div>)}</div>:<div className="empty-panel"><Sparkles size={22}/><h3>Wardrobe targets ready for setup</h3><p>Targets will drive deal ranking as the wardrobe grows.</p></div>}</section>
 </main>
}
