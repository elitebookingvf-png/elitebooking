'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

export default function ClientPage() {
  const router = useRouter()
  const [rdvs, setRdvs]     = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const { data: prof } = await supabase.from('profiles').select('firstname,lastname,type').eq('id', user.id).single()
      if ((prof as any)?.type === 'pro') { router.push('/pro'); return }
      setProfile(prof)
      const res = await fetch('/api/rdv')
      const data = await res.json()
      setRdvs(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function cancel(id: string) {
    if (!confirm('Annuler ce rendez-vous ?')) return
    await fetch(`/api/rdv/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{color:'#aaa'}}>Chargement…</div>
  )

  const today = new Date().toISOString().split('T')[0]
  const upcoming = rdvs
    .filter((r: any) => r.date >= today && r.status !== 'cancelled')
    .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
  const past = rdvs
    .filter((r: any) => r.date < today || r.status === 'cancelled')
    .sort((a: any, b: any) => b.date.localeCompare(a.date))

  return (
    <div className="min-h-screen" style={{background:'#f7f7f7'}}>
      <nav className="bg-white border-b px-4 h-16 flex items-center justify-between" style={{borderColor:'#eee'}}>
        <Link href="/" className="serif text-xl font-bold" style={{textDecoration:'none',color:'#111'}}>
          Elite<em style={{color:'#C17B4E',fontStyle:'normal'}}>Booking</em>
        </Link>
        <div className="flex items-center gap-3">
          <span style={{fontSize:'0.85rem',color:'#aaa'}}>
            {(profile as any)?.firstname} {(profile as any)?.lastname}
          </span>
          <Link href="/search" className="btn btn-secondary btn-sm">Réserver</Link>
          <button onClick={signOut} style={{fontSize:'0.85rem',color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="serif" style={{fontSize:'2rem',marginBottom:32}}>Mes rendez-vous</h1>
        {upcoming.length === 0 && past.length === 0 && (
          <div className="card text-center" style={{padding:'64px 24px'}}>
            <div style={{fontSize:'3rem',marginBottom:16}}>📅</div>
            <h2 className="serif" style={{fontSize:'1.6rem',marginBottom:8}}>Aucun rendez-vous</h2>
            <p style={{color:'#aaa',marginBottom:24}}>Réservez votre premier soin</p>
            <Link href="/search" className="btn btn-primary">Trouver un salon →</Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <div style={{marginBottom:32}}>
            <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>À venir</h2>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {upcoming.map(r => (
                <div key={r.id} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
                  <div>
                    <div style={{fontWeight:600}}>{r.service_name}</div>
                    <div style={{fontSize:'0.85rem',color:'#aaa',marginTop:2}}>{r.salon_name} · {r.staff_name}</div>
                    <div style={{fontSize:'0.85rem',color:'#666',marginTop:4}}>
                      📅 {new Date(r.date+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} à {r.start_time}
                    </div>
                  </div>
                  <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                    <span style={{fontWeight:700,color:'#C17B4E'}}>{formatPrice(r.price, r.price_type)}</span>
                    <span className="badge badge-green">Confirmé</span>
                    <button onClick={() => cancel(r.id)}
                      style={{fontSize:'0.75rem',color:'#eb5757',background:'none',border:'none',cursor:'pointer'}}>
                      Annuler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16,color:'#aaa'}}>Historique</h2>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {past.map(r => (
                <div key={r.id} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',opacity:0.7}}>
                  <div>
                    <div style={{fontWeight:500}}>{r.service_name}</div>
                    <div style={{fontSize:'0.85rem',color:'#aaa'}}>{r.salon_name} · {r.date} à {r.start_time}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:600}}>{formatPrice(r.price, r.price_type)}</div>
                    <span className={r.status==='cancelled'?'badge badge-red':'badge badge-grey'}>
                      {r.status==='cancelled'?'Annulé':'Passé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
