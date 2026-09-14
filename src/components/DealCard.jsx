import { Heart, CheckCircle2, ArrowDownRight, Sparkles } from 'lucide-react'

export default function DealCard({ deal }) {
  return (
    <article className="deal-card">
      <div className="deal-image-wrap">
        <img src={deal.image} alt="" className="deal-image" />
        <span className={`deal-badge ${deal.level}`}>{deal.badge}</span>
        <button className="heart-btn" aria-label="Watch item"><Heart size={18}/></button>
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
        <button className="primary-btn">View Deal</button>
      </div>
    </article>
  )
}