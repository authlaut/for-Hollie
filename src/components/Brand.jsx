export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img src="/icon.svg" alt="" className="brand-mark" />
      <div>
        <div className="brand-for">FOR</div>
        <div className="brand-hollie">Hollie</div>
      </div>
    </div>
  )
}