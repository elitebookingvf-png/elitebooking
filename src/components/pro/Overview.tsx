'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toISO, formatPrice } from '@/lib/utils'
import Icon from '@/components/Icon'

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
      if (next === pin) { onSuccess(); onClose() }
      else { setErr('Code incorrect. Réessayez.'); setTimeout(() => { setEntry(''); setErr('') }, 900) }
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'32px 28px',width:320,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center'}}>
        <div style={{marginBottom:10,display:'flex',justifyContent:'center'}}><Icon name="lock" size={32} strokeWidth={1.4}/></div>
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

  // Group multi-prestation bookings (shared group_id) into a single entry with a total price.
  const upcomingRaw = confirmed
    .filter(r => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
  const groupsMap = new Map<string, any[]>()
  for (const r of upcomingRaw) {
    const key = r.group_id || `solo-${r.id}`
    if (!groupsMap.has(key)) groupsMap.set(key, [])
    groupsMap.get(key)!.push(r)
  }
  const upcoming = Array.from(groupsMap.values())
    .map(items => {
      const first = items[0]
      return {
        id: first.id,
        client_name: first.client_name,
        staff_name: first.staff_name,
        date: first.date,
        start_time: first.start_time,
        count: items.length,
        service_name: items.length > 1
          ? `${items.length} prestations`
          : first.service_name,
        total: items.reduce((a, r) => a + (Number(r.price) || 0), 0),
      }
    })
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

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <p style={{color:'#888',fontSize:'0.88rem'}}>
          <span className="serif" style={{fontStyle:'italic',fontSize:'1.05rem',color:'#111'}}>{salon.name}</span>
          {' '}· {salon.category} · {salon.city}
        </p>
        <Link href={`/salon/${salon.id}`} style={{fontSize:'0.8rem',color:'#111',textDecoration:'none',borderBottom:'1px solid #111',paddingBottom:1,fontWeight:600}}>
          Voir ma page publique →
        </Link>
      </div>

      <div className="kpi-grid" style={{marginBottom:32}}>
        {/* Total RDV */}
        <div className="card kpi-card">
          <div className="serif" style={{fontSize:'2.2rem',lineHeight:1}}>{rdvs.length}</div>
          <div style={{fontSize:'0.68rem',color:'#999',marginTop:10,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>Total RDV</div>
          <div style={{fontSize:'0.75rem',color:'#bbb',marginTop:4}}>Tous statuts</div>
        </div>

        {/* Revenue — PIN protected */}
        <div className="card kpi-card" style={{cursor: revenueVisible ? 'default' : 'pointer', position:'relative'}}
          onClick={() => { if (!revenueVisible) setShowPin(true) }}>
          {revenueVisible ? (
            <>
              <div className="serif" style={{fontSize:'2.2rem',lineHeight:1}}>{revenue.toLocaleString('fr-FR')}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
                <div style={{fontSize:'0.68rem',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>Revenus MAD</div>
                <button onClick={e => { e.stopPropagation(); setRevenueVisible(false) }}
                  style={{color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>
                  <Icon name="lock" size={11}/>
                </button>
              </div>
              <div style={{fontSize:'0.75rem',color:'#bbb',marginTop:4}}>Confirmés uniquement</div>
            </>
          ) : (
            <>
              <div className="serif" style={{fontSize:'2.2rem',letterSpacing:4,color:'#ccc',lineHeight:1}}>●●●●</div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10}}>
                <div style={{fontSize:'0.68rem',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>Revenus MAD</div>
                <Icon name="lock" size={10}/>
              </div>
              <div style={{fontSize:'0.75rem',color:'#bbb',marginTop:4}}>Cliquez pour révéler</div>
            </>
          )}
        </div>

        {/* RDV aujourd'hui */}
        <div className="card kpi-card">
          <div className="serif" style={{fontSize:'2.2rem',lineHeight:1}}>{todayRdvs.length}</div>
          <div style={{fontSize:'0.68rem',color:'#999',marginTop:10,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>RDV aujourd'hui</div>
          <div style={{fontSize:'0.75rem',color:'#bbb',marginTop:4,textTransform:'capitalize'}}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'})}
          </div>
        </div>

        {/* Note moyenne */}
        <div className="card kpi-card">
          <div className="serif" style={{fontSize:'2.2rem',lineHeight:1,display:'flex',alignItems:'center',gap:8}}>
            {rating.toFixed(1)}<Icon name="star" size={20} strokeWidth={1.5}/>
          </div>
          <div style={{fontSize:'0.68rem',color:'#999',marginTop:10,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>Note moyenne</div>
          <div style={{fontSize:'0.75rem',color:'#bbb',marginTop:4}}>{salon.review_count || 0} avis</div>
        </div>
      </div>

      <div className="card" style={{padding:'24px 26px'}}>
        <h3 className="serif" style={{fontSize:'1.3rem',marginBottom:6}}><em style={{fontStyle:'italic'}}>Prochains rendez-vous</em></h3>
        {upcoming.length === 0 ? (
          <p style={{color:'#aaa',fontSize:'0.85rem',textAlign:'center',padding:'24px 0'}}>Aucun RDV à venir</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column'}}>
            {upcoming.map(r => (
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:16,padding:'13px 0',borderBottom:'1px solid #f3f3f3'}}>
                <div style={{background:'#111',color:'#fff',borderRadius:10,padding:'7px 11px',fontSize:'0.75rem',fontWeight:700,textAlign:'center',lineHeight:1.25,flexShrink:0,minWidth:64}}>
                  <div style={{fontSize:'0.6rem',opacity:0.55,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                    {new Date(r.date+'T12:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}
                  </div>
                  <div>{r.start_time}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'0.9rem',fontWeight:600}}>{r.client_name}</div>
                  <div style={{fontSize:'0.78rem',color:'#aaa',marginTop:2}}>{r.service_name} · {r.staff_name}</div>
                </div>
                <span className="serif" style={{color:'#111',fontSize:'1.05rem',flexShrink:0}}>{formatPrice(r.total, 'fixe')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
