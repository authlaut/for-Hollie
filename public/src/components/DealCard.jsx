import { Heart, CheckCircle2, ArrowDownRight, Sparkles, ExternalLink, ImageOff } from 'lucide-react'
import { useState } from 'react'

export default function DealCard({ deal, watched=false, onToggleWatch }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasLiveUrl = /^https:\/\//i.test(deal.url || '')
  return (
    <article className="deal-card">
      <div className="deal-image-wrap">
        {!imageFailed && deal.image ? <img src={deal.image} alt={deal.name} className="deal-image" onError={()=>setImageFailed(true)}/> :
          <div className="deal-image-fallback"><ImageOff size={26}/><span>{deal.category || 'Deal'}</span></div>}
        <span className={`deal-badge ${deal.level}`}>{deal.badge}</span>
        {onToggleWatch && <button type="button" className={`heart-btn ${watched?'watched':''}`} aria-label={watched?'Remove from watchlist':'Add to watchlist'} onClick={()=>onToggleWatch(deal)}>
          <Heart size={18} fill={watched?'currentColor':'none'}/>
        </button>}
      </div>
      <div className="deal-body">
        <div className="eyebrow">{deal.store}</div><h3>{deal.name}</h3>
        <div className="price-row">
          {deal.regular>deal.sale && <span className="regular-price">${deal.regular.toFixed(2)}</span>}
          <span className="sale-price">${deal.sale.toFixed(2)}</span>
          {deal.discount>0 && <span className="discount">{deal.discount}% OFF</span>}
        </div>
        <div className="meta-row"><CheckCircle2 size={15}/> {deal.size} verified</div>
        <div className="smart-row">
          {deal.match>0 && <span><Sparkles size={14}/> {deal.match}% match</span>}
          <span><ArrowDownRight size={14}/> {deal.reason}</span>
        </div>
        {hasLiveUrl ? <a className="primary-btn deal-link" href={deal.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> View Deal</a> :
          <button type="button" className="primary-btn disabled-btn" disabled>Retailer Link Unavailable</button>}
      </div>
    </article>
  )
}
