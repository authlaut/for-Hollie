import { Heart, CheckCircle2, ArrowDownRight, Sparkles, ExternalLink, ImageOff } from 'lucide-react'
import { useState } from 'react'

export default function DealCard({ deal }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasLiveUrl = Boolean(deal.url)

  const openDeal = () => {
    if (!hasLiveUrl) return
    window.open(deal.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className="deal-card">
      <div className="deal-image-wrap">
        {!imageFailed && deal.image ? (
          <img
            src={deal.image}
            alt={deal.name}
            className="deal-image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="deal-image-fallback">
            <ImageOff size={26} />
            <span>{deal.category || 'Deal'}</span>
          </div>
        )}

        <span className={`deal-badge ${deal.level}`}>{deal.badge}</span>
        <button className="heart-btn" aria-label="Watch item"><Heart size={18}/></button>

        {deal.demo && <span className="sample-badge">SAMPLE</span>}
      </div>

      <div className="deal-body">
        <div className="eyebrow">{deal.store}</div>
        <h3>{deal.name}</h3>

        <div className="price-row">
          <span className="regular-price">${deal.regular.toFixed(2)}</span>
          <span className="sale-price">${deal.sale.toFixed(2)}</span>
          <span className="discount">{deal.discount}% OFF</span>
        </div>

        <div className="meta-row"><CheckCircle2 size={15}/> {deal.size} verified</div>

        <div className="smart-row">
          <span><Sparkles size={14}/> {deal.match}% match</span>
          <span><ArrowDownRight size={14}/> {deal.reason}</span>
        </div>

        <button
          className={`primary-btn ${!hasLiveUrl ? 'disabled-btn' : ''}`}
          onClick={openDeal}
          disabled={!hasLiveUrl}
          title={!hasLiveUrl ? 'Live retailer link not connected yet' : `Open at ${deal.store}`}
        >
          {hasLiveUrl ? <><ExternalLink size={16}/> View Deal</> : 'Live Link Pending'}
        </button>
      </div>
    </article>
  )
}