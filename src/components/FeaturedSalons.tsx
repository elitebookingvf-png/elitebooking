'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/utils'

export default function FeaturedSalons({ salons, cities }: { salons: any[]; cities: string[] }) {
  const [activeCity, setActiveCity] = useState('')

  const filtered = activeCity ? salons.filter(s => s.city === activeCity) : salons

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:32,paddingTop:80}}>
        <div>
          <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#C17B4E',marginBottom:12}}>À la une</div>
          <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)'}}>
            Les établissements<br /><em style={{fontStyle:'italic'}}>les mieux notés</em>
          </h2>
        </div>
        <Link href="/search" className="btn btn-secondary">Voir tous →</Link>
      </div>

      {/* City filter pills */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:32}}>
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

      {/* Salon grid */}
      {filtered.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:18}}>
          {filtered.map((s: any) => {
            const cat = CATEGORIES.find(c => c.id === s.category)
            return (
              <Link key={s.id} href={`/salon/${s.id}`}
                style={{textDecoration:'none',color:'inherit',display:'block',background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid #efefef',cursor:'pointer',transition:'all 0.3s'}}
                className="salon-card">
                <div style={{height:160,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'3rem',background:'linear-gradient(135deg,#fef3e8,#fde8c8)',position:'relative'}}>
                  {cat?.emoji || '🏪'}
                  <span style={{position:'absolute',top:10,left:10,background:'#fff',borderRadius:6,padding:'3px 9px',fontSize:'0.68rem',fontWeight:600}}>
                    {cat?.label || s.category}
                  </span>
                </div>
                <div style={{padding:14}}>
                  <div style={{fontSize:'0.92rem',fontWeight:600,marginBottom:3}}>{s.name}</div>
                  <div style={{fontSize:'0.75rem',color:'#888',marginBottom:8}}>📍 {s.city}{s.address ? ` · ${s.address}` : ''}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'0.75rem',fontWeight:500,color:'#f59e0b'}}>★ {Number(s.rating).toFixed(1)}</span>
                    <span className="badge badge-green">Disponible</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 0',color:'#aaa'}}>
          <div style={{fontSize:'2.5rem',marginBottom:12}}>🔍</div>
          <p>Aucun salon dans cette ville pour le moment.</p>
        </div>
      )}
    </div>
  )
}
