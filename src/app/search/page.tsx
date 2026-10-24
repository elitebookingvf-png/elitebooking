'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES, CITIES, nearestCity, distanceToCity, formatKm } from '@/lib/utils'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'

function SearchResults() {
  const params = useSearchParams()
  const [salons, setSalons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity]         = useState(params.get('city') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [q, setQ]               = useState(params.get('q') || '')
  const [sort, setSort]         = useState('rating')
  const [pos, setPos]           = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoErr, setGeoErr]     = useState('')

  async function search() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (city) sp.set('city', city)
    if (category) sp.set('category', category)
    if (q) sp.set('q', q)
    const res = await fetch('/api/salons?' + sp.toString())
    if (res.ok) setSalons(await res.json())
    else setSalons([])
    setLoading(false)
  }

  useEffect(() => { search() }, [city, category])

  function locate() {
    if (!navigator.geolocation) { setGeoErr('Géolocalisation non supportée'); return }
    setLocating(true); setGeoErr('')
    navigator.geolocation.getCurrentPosition(
      p => {
        const { latitude, longitude } = p.coords
        setPos({ lat: latitude, lng: longitude })
        const near = nearestCity(latitude, longitude)
        if (near) setCity(near.city)
        setSort('distance')
        setLocating(false)
      },
      () => { setGeoErr('Position indisponible'); setLocating(false) },
      { timeout: 8000 }
    )
  }

  const dist = (s: any) => (pos ? distanceToCity(s.city, pos.lat, pos.lng) : null)

  const displayed = [...salons].sort((a, b) =>
    sort === 'distance' ? (dist(a) ?? 1e9) - (dist(b) ?? 1e9)
    : sort === 'name'   ? a.name.localeCompare(b.name)
    : Number(b.rating) - Number(a.rating)
  )

  return (
    <div className="min-h-screen" style={{background:'#f7f7f7'}}>
      <nav className="bg-white border-b px-4 h-16 flex items-center gap-4 flex-wrap" style={{borderColor:'#eee',height:'auto',paddingTop:12,paddingBottom:12}}>
        <Link href="/" className="serif text-xl font-bold" style={{textDecoration:'none',color:'#111'}}>
          Elite<em style={{fontStyle:'italic'}}>Booking</em>
        </Link>
        <div className="flex-1 flex gap-2 flex-wrap" style={{maxWidth:820,minWidth:200}}>
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            className="form-control flex-1" placeholder="Rechercher un salon…" />
          <select className="form-control" style={{maxWidth:160}} value={city} onChange={e => setCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-control" style={{maxWidth:180}} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="form-control" style={{maxWidth:150}} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="rating">Mieux notés</option>
            <option value="name">A → Z</option>
            <option value="distance" disabled={!pos}>Plus proches</option>
          </select>
          <button onClick={locate} disabled={locating} className="btn btn-secondary" title="Autour de moi"
            style={{display:'inline-flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
            <Icon name="locate" size={14} /> {locating ? '…' : 'Autour de moi'}
          </button>
          <button onClick={search} className="btn btn-primary">Chercher</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <p className="text-sm mb-6" style={{color:'#aaa'}}>
          {geoErr
            ? <span style={{color:'#C62828'}}>{geoErr}</span>
            : loading ? 'Chargement…' : `${displayed.length} salon${displayed.length !== 1 ? 's' : ''} trouvé${displayed.length !== 1 ? 's' : ''}${pos ? ' — triés par distance' : ''}`}
        </p>
        <div className="auto-grid-md">
          {displayed.map((s: any) => {
            const cat = CATEGORIES.find(c => c.id === s.category)
            const km = dist(s)
            return (
              <Link key={s.id} href={`/salon/${s.id}`}
                style={{textDecoration:'none',color:'inherit'}}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 block">
                <div className="h-36 flex items-center justify-center"
                  style={{background:'#f4f4f4',color:'#111',position:'relative'}}>
                  <Icon name={(cat?.icon || 'star') as IconName} size={44} strokeWidth={1.1} />
                  {km !== null && (
                    <span style={{position:'absolute',top:10,right:10,background:'#111',color:'#fff',borderRadius:6,padding:'3px 9px',fontSize:'0.68rem',fontWeight:600}}>
                      {formatKm(km)}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 style={{fontWeight:600,fontSize:'1.1rem'}}>{s.name}</h3>
                  <p style={{fontSize:'0.85rem',color:'#aaa',marginTop:2}}>{cat?.label || s.category} · {s.city}</p>
                  {s.address && (
                    <p style={{fontSize:'0.8rem',color:'#bbb',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                      <Icon name="pin" size={12} /> {s.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span style={{color:'#111',fontSize:'0.85rem',fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}>
                      <Icon name="star" size={13} /> {Number(s.rating).toFixed(1)}
                    </span>
                    <span className="badge badge-green ml-auto">Disponible</span>
                  </div>
                </div>
              </Link>
            )
          })}
          {!loading && displayed.length === 0 && (
            <div className="text-center py-20 col-span-full" style={{color:'#aaa'}}>
              <div style={{marginBottom:16,display:'flex',justifyContent:'center'}}><Icon name="search" size={44} strokeWidth={1.2} /></div>
              <p>Aucun salon trouvé pour ces critères</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
