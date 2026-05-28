'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toISO, formatPrice } from '@/lib/utils'

function PinModal({ action, pin, onSuccess, onClose }: {
  action: string; pin: string; onSuccess: () => void; onClose: () => void
}) {
  const [entry, setEntry] = useState('')
  const [err, setErr]     = useState('')

  function press(k: string) {
    if (k === '⌫') { setEntry(e => e.slice(0,-1)); return }
    if (entry.length >= 4) return
    const next = entry + k
    setEntry(next)
    if (next.length === 4) {
      if (next === pin) { onClose(); onSuccess() }
      else { setErr('Code incorrect. Réessayez.'); setTimeout(() => { setEntry(''); setErr('') }, 900) }
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'32px 28px',width:320,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:8}}>🔒</div>
        <div className="serif" style={{fontSize:'1.3rem',marginBottom:4}}>Code PIN requis</div>
        <div style={{fontSize:'0.82rem',color:'#aaa',marginBottom:20}}>{action}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:20}}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{width:14,height:14,borderRadius:'50%',border:'2px solid #ccc',
              background: i < entry.length ? '#111' : '#fff'}} />
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
          {[1,2,3,4,5,6,7,8,9,'','0','⌫'].map((k,i) => (
            k === '' ? <div key={i} /> :
            <button key={i} onClick={() => press(String(k))}
              style={{height:52,border:'1.5px solid #eee',borderRadius:12,fontSize:k==='⌫'?'1.2rem':'1.1rem',
                fontWeight:600,background:'#fff',cursor:'pointer'}}>
              {k}
            </button>
          ))}
        </div>
        {err && <div style={{color:'#e53e3e',fontSize:'0.8rem',marginBottom:8}}>{err}</div>}
        <button onClick={onClose} style={{color:'#aaa',fontSize:'0.82rem',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Annuler</button>
      </div>
    </div>
  )
}

export function ProOverview({ salon }: { salon: any }) {
  const [rdvs, setRdvs]           = useState<any[]>([])
  const [pin, setPin]             = useState('0000')
  const [revenueVisible, setRevenueVisible] = useState(false)
  const [showPin, setShowPin]     = useState(false)

  useEffect(() => {
    fetch('/api/rdv/pro').then(r => r.json()).then(d => setRdvs(Array.isArray(d) ? d : []))
    fetch('/api/users/me').then(r => r.json()).then(d => { if (d?.salon?.pin) setPin(d.salon.pin) })
  }, [])

  const today = toISO(new Date())
  const confirmed  = rdvs.filter(r => r.status === 'confirmed')
  const revenue    = confirmed.reduce((a, r) => a + (Number(r.price) || 0), 0)
  const todayRdvs  = confirmed.filter(r => r.date === today)
  const upcoming   = confirmed
    .filter(r => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5)

  const rating = Number(salon.rating) || 5.0

  return (
    <div>
      {showPin && (
        <PinModal
          action="Voir le chiffre d'affaires"
          pin={pin}
          onSuccess={() => setRevenueVisible(true)}
          onClose={() => setShowPin(false)}
        />
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 className="serif" style={{fontSize:'2rem'}}>{salon.name}</h1>
          <p style={{color:'#aaa',fontSize:'0.85rem',marginTop:4}}>{salon.category} · {salon.city}</p>
        </div>
        <Link href={`/salon/${salon.id}`} className="btn btn-secondary btn-sm" style={{textDecoration:'none'}}>
          Voir ma page publique →
        </Link>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:32}}>
        {/* Total RDV */}
        <div className="card">
          <div style={{fontSize:'2rem',fontWeight:700}}>{rdvs.length}</div>
          <div style={{fontSize:'0.85rem',color:'#666',marginTop:4}}>Total RDV</div>
          <div style={{fontSize:'0.75rem',color:'#27AE60',marginTop:2}}>Tous statuts</div>
        </div>

        {/* Revenue — PIN protected */}
        <div className="card" style={{cursor: revenueVisible ? 'default' : 'pointer', position:'relative'}}
          onClick={() => { if (!revenueVisible) setShowPin(true) }}>
          {revenueVisible ? (
            <>
              <div style={{fontSize:'2rem',fontWeight:700}}>{revenue.toLocaleString('fr-FR')}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                <div style={{fontSize:'0.85rem',color:'#666'}}>Revenus MAD</div>
                <button onClick={e => { e.stopPropagation(); setRevenueVisible(false) }}
                  style={{fontSize:'0.72rem',color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>
                  🔒
                </button>
              </div>
              <div style={{fontSize:'0.75rem',color:'#27AE60',marginTop:2}}>Confirmés uniquement</div>
            </>
          ) : (
            <>
              <div style={{fontSize:'2rem',fontWeight:700,letterSpacing:4,color:'#ccc'}}>●●●●</div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                <div style={{fontSize:'0.85rem',color:'#666'}}>Revenus MAD</div>
                <span style={{fontSize:'0.72rem',color:'#aaa'}}>🔒</span>
              </div>
              <div style={{fontSize:'0.75rem',color:'#aaa',marginTop:2}}>Cliquez pour révéler</div>
            </>
          )}
        </div>

        {/* RDV aujourd'hui */}
        <div className="card">
          <div style={{fontSize:'2rem',fontWeight:700}}>{todayRdvs.length}</div>
          <div style={{fontSize:'0.85rem',color:'#666',marginTop:4}}>RDV aujourd'hui</div>
          <div style={{fontSize:'0.75rem',color:'#27AE60',marginTop:2}}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'})}
          </div>
        </div>

        {/* Note moyenne */}
        <div className="card">
          <div style={{fontSize:'2rem',fontWeight:700}}>{rating.toFixed(1)}★</div>
          <div style={{fontSize:'0.85rem',color:'#666',marginTop:4}}>Note moyenne</div>
          <div style={{fontSize:'0.75rem',color:'#27AE60',marginTop:2}}>{salon.category} · {salon.city}</div>
        </div>
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
