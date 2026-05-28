'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const CAT_EMOJI: Record<string, string> = {
  'Coiffure':'✂️','Hammam':'🛁','Spa':'💆','Onglerie':'💅',
  'Barbier':'🪒','Institut beauté':'💄','Bien-être':'🌿','Esthétique':'✨',
}
const CATEGORIES = ['Coiffure','Hammam','Spa','Onglerie','Barbier','Institut beauté','Bien-être','Esthétique']
const CITIES = ['Casablanca','Rabat','Marrakech','Fès','Tanger','Agadir','Meknès']

export default function SearchPage() {
  const params = useSearchParams()
  const [salons, setSalons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity]       = useState(params.get('city') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [q, setQ]             = useState(params.get('q') || '')

  async function search() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (city) sp.set('city', city)
    if (category) sp.set('category', category)
    if (q) sp.set('q', q)
    const res = await fetch('/api/salons?' + sp.toString())
    setSalons(await res.json())
    setLoading(false)
  }

  useEffect(() => { search() }, [city, category])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 h-16 flex items-center gap-4">
        <Link href="/" className="font-serif text-xl">Elite<em className="text-[#C17B4E]">Booking</em></Link>
        <div className="flex-1 flex gap-2 max-w-2xl">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            className="input flex-1" placeholder="Rechercher un salon…"
          />
          <select className="input max-w-[160px]" value={city} onChange={e => setCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input max-w-[160px]" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
          </select>
          <button onClick={search} className="btn-primary">Chercher</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-400 mb-6">{loading ? 'Chargement…' : `${salons.length} salon${salons.length!==1?'s':''} trouvé${salons.length!==1?'s':''}`}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {salons.map((s: any) => (
            <Link key={s._id} href={`/salon/${s._id}`}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="h-36 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-5xl">
                {CAT_EMOJI[s.category] || '🏪'}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg">{s.name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{s.category} · {s.city}</p>
                {s.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{s.description}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-amber-500 text-sm font-medium">★ {s.rating?.toFixed(1)}</span>
                  <span className="ml-auto badge-green text-xs">Disponible</span>
                </div>
              </div>
            </Link>
          ))}
          {!loading && salons.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p>Aucun salon trouvé pour ces critères</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
