'use client'
import { useEffect, useState } from 'react'
import { toISO, formatPrice } from '@/lib/utils'

export function ProOverview({ salon }: { salon: any }) {
  const [rdvs, setRdvs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/rdv/pro').then(r => r.json()).then(setRdvs)
  }, [])

  const today = toISO(new Date())
  const confirmed  = rdvs.filter(r => r.status === 'confirmed')
  const revenue    = confirmed.reduce((a, r) => a + (Number(r.price) || 0), 0)
  const todayRdvs  = confirmed.filter(r => r.date === today)
  const upcoming   = confirmed
    .filter(r => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5)

  const kpis = [
    { label: 'Total RDV',       value: rdvs.length,                   sub: 'Tous statuts' },
    { label: 'Revenus MAD',     value: revenue.toLocaleString('fr-FR'), sub: 'Confirmés uniquement' },
    { label: "RDV aujourd'hui", value: todayRdvs.length,               sub: new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'}) },
  ]

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
        <div>
          <h1 className="serif" style={{fontSize:'2rem'}}>{salon.name}</h1>
          <p style={{color:'#aaa',fontSize:'0.85rem',marginTop:4}}>{salon.category} · {salon.city}</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:32}}>
        {kpis.map(k => (
          <div key={k.label} className="card">
            <div style={{fontSize:'2rem',fontWeight:700}}>{k.value}</div>
            <div style={{fontSize:'0.85rem',color:'#666',marginTop:4}}>{k.label}</div>
            <div style={{fontSize:'0.75rem',color:'#27AE60',marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>Prochains rendez-vous</h3>
        {upcoming.length === 0 ? (
          <p style={{color:'#aaa',fontSize:'0.85rem',textAlign:'center',padding:'16px 0'}}>Aucun RDV à venir</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column'}}>
            {upcoming.map(r => (
              <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #f3f3f3'}}>
                <div>
                  <div style={{fontSize:'0.88rem',fontWeight:500}}>{r.client_name}</div>
                  <div style={{fontSize:'0.78rem',color:'#aaa',marginTop:2}}>{r.service_name} · {r.staff_name} · {r.date} à {r.start_time}</div>
                </div>
                <span style={{fontWeight:700,color:'#C17B4E',fontSize:'0.88rem'}}>{formatPrice(r.price, r.price_type)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
