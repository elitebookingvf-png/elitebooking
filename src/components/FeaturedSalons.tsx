'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, nearestCity, distanceToCity, formatKm } from '@/lib/utils'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'

export default function FeaturedSalons({ salons, cities }: { salons: any[]; cities: string[] }) {
  const [activeCity, setActiveCity] = useState('')
  const [pos, setPos]     = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoErr, setGeoErr]     = useState('')

  function locate() {
    if (!navigator.geolocation) { setGeoErr('Géolocalisation non supportée'); return }
    setLocating(true); setGeoErr('')
    navigator.geolocation.getCurrentPosition(
      p => {
        const { latitude, longitude } = p.coords
        setPos({ lat: latitude, lng: longitude })
        const near = nearestCity(latitude, longitude)
        if (near) setActiveCity(near.city)
        setLocating(false)
      },
      () => { setGeoErr('Position indisponible'); setLocating(false) },
      { timeout: 8000 }
    )
  }

  const dist = (s: any) => (pos ? distanceToCity(s.city, pos.lat, pos.lng) : null)
  const filtered = (activeCity ? salons.filter(s => s.city === activeCity) : salons)
    .slice()
    .sort((a, b) => (dist(a) ?? 1e9) - (dist(b) ?? 1e9))

  return (
    <div>
      <div className="featured-header" style={{marginBottom:32,paddingTop:80}}>
        <div>
          <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#111',marginBottom:12}}>À la une</div>
          <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)'}}>
            Les établissements<br /><em style={{fontStyle:'italic'}}>les mieux notés</em>
          </h2>
        </div>
        <Link href="/search" className="btn btn-secondary">Voir tous →</Link>
      </div>

      {/* City filter pills + geolocation */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:geoErr?8:32,alignItems:'center'}}>
        <button onClick={locate} disabled={locating}
          style={{fontSize:'0.8rem',border:'1px solid #111',borderRadius:20,padding:'7px 16px',cursor:'pointer',transition:'all 0.2s',background:pos?'#111':'#fff',color:pos?'#fff':'#111',display:'inline-flex',alignItems:'center',gap:6,fontWeight:600}}>
          <Icon name="locate" size={13} /> {locating ? 'Localisation…' : 'Autour de moi'}
        </button>
        <button
          onClick={() => setActiveCity('')}
          style={{fontSize:'0.8rem',border:'1px solid #e5e5e5',borderRadius:20,padding:'7px 16px',cursor:'pointer',transition:'all 0.2s',background:activeCity===''?'#111':'#fff',color:activeCity===''?'#fff':'#555',borderColor:activeCity===''?'#111':'#e5e5e5'}}>
          Toutes
        </button>
        {cities.map(c => (
          <button key={c} onClick={() => setActiveCity(c)}
            style={{fontSize:'0.8rem',border:'1px solid #e5e5e5',borderRadius:20,padding:'7px 16px',cursor:'pointer',transition:'all 0.2s',background:activeCity===c?'#111':'#fff',color:activeCity===c?'#fff':'#555',borderColor:activeCity===c?'#111':'#e5e5e5'}}>
            {c}
          </button>
        ))}
      </div>
      {geoErr && <p style={{fontSize:'0.75rem',color:'#C62828',marginBottom:24}}>{geoErr}</p>}

      {/* Salon grid */}
      {filtered.length > 0 ? (
        <div className="auto-grid-md">
          {filtered.map((s: any) => {
            const cat = CATEGORIES.find(c => c.id === s.category)
            const km = dist(s)
            return (
              <Link key={s.id} href={`/salon/${s.id}`}
                style={{textDecoration:'none',color:'inherit',display:'block',background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid #efefef',cursor:'pointer',transition:'all 0.3s'}}
                className="salon-card">
                <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f4f4',position:'relative',color:'#111'}}>
                  <Icon name={(cat?.icon || 'star') as IconName} size={44} strokeWidth={1.1} />
                  <span style={{position:'absolute',top:10,left:10,background:'#fff',borderRadius:6,padding:'3px 9px',fontSize:'0.68rem',fontWeight:600}}>
                    {cat?.label || s.category}
                  </span>
                  {km !== null && (
                    <span style={{position:'absolute',top:10,right:10,background:'#111',color:'#fff',borderRadius:6,padding:'3px 9px',fontSize:'0.68rem',fontWeight:600}}>
                      {formatKm(km)}
                    </span>
                  )}
                </div>
                <div style={{padding:14}}>
                  <div style={{fontSize:'0.92rem',fontWeight:600,marginBottom:3}}>{s.name}</div>
                  <div style={{fontSize:'0.75rem',color:'#888',marginBottom:8,display:'flex',alignItems:'center',gap:4}}>
                    <Icon name="pin" size={12} /> {s.city}{s.address ? ` · ${s.address}` : ''}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'0.75rem',fontWeight:600,color:'#111',display:'inline-flex',alignItems:'center',gap:4}}>
                      <Icon name="star" size={12} /> {Number(s.rating).toFixed(1)}
                    </span>
                    <span className="badge badge-green">Disponible</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 0',color:'#aaa'}}>
          <div style={{marginBottom:12,display:'flex',justifyContent:'center'}}><Icon name="search" size={40} strokeWidth={1.2} /></div>
          <p>Aucun salon dans cette ville pour le moment.</p>
        </div>
      )}
    </div>
  )
}
