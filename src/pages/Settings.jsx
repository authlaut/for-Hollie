import { UserRound, Store, Gift, Bell, Palette, ShieldCheck, ChevronRight } from 'lucide-react'
import Header from '../components/Header'

const rows = [
  [UserRound,'Fit Profile','Sizes, store-specific fit and fit learning'],
  [Store,'Retailers','Choose stores and future additions'],
  [Gift,'Rewards Wallet','Store cash, points, promo codes and expirations'],
  [Bell,'Notifications','Immediate, digest and quiet alerts'],
  [Palette,'Style Preferences','Love / Like / Neutral / No learning'],
  [ShieldCheck,'Privacy','Private single-user app controls']
]

export default function Settings() {
  return (
    <main className="page">
      <Header title="Settings" subtitle="Tune For Hollie without cluttering the main experience." />
      <section className="settings-list">
        {rows.map(([Icon,title,sub])=>(
          <button className="settings-row" key={title}>
            <span className="settings-icon"><Icon size={19}/></span>
            <span><strong>{title}</strong><small>{sub}</small></span>
            <ChevronRight size={18}/>
          </button>
        ))}
      </section>
    </main>
  )
}