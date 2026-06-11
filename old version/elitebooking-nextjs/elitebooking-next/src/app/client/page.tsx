'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ClientPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rdvs, setRdvs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
    if (status === 'authenticated') {
      const u = session?.user as any
      if (u?.type === 'pro') { router.push('/pro'); return }
      fetch(`/api/rdv?clientId=${u?.id}`)
        .then(r => r.json()).then(setRdvs).finally(() => setLoading(false))
    }
  }, [status, session])

  async function cancel(id: string) {
    if (!confirm('Annuler ce rendez-vous ?')) return
    await fetch(`/api/rdv/${id}`, { method: 'DELETE' })
    setRdvs(prev => prev.map(r => r._id === id ? { ...r, status: 'cancelled' } : r))
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = rdvs.filter(r => r.date >= today && r.status !== 'cancelled').sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const past     = rdvs.filter(r => r.date < today  || r.status === 'cancelled').sort((a,b) => b.date.localeCompare(a.date))

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl">Elite<em className="text-[#C17B4E]">Booking</em></Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{session?.user?.name}</span>
          <Link href="/search" className="btn-secondary text-sm">Réserver</Link>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-gray-700">Déconnexion</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-serif text-3xl mb-8">Mes rendez-vous</h1>

        {upcoming.length === 0 && past.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="font-serif text-2xl mb-2">Aucun rendez-vous</h2>
            <p className="text-gray-400 mb-6">Réservez votre premier soin</p>
            <Link href="/search" className="btn-primary">Trouver un salon →</Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-lg mb-4">À venir</h2>
            <div className="space-y-3">
              {upcoming.map(r => (
                <div key={r._id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{r.serviceName}</div>
                    <div className="text-sm text-gray-400 mt-0.5">{r.salonName} · {r.staffName}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      📅 {new Date(r.date+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} à {r.time}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="font-bold text-[#C17B4E]">{r.price} MAD</span>
                    <span className="badge-green">Confirmé</span>
                    <button onClick={() => cancel(r._id)} className="text-xs text-red-400 hover:text-red-600">Annuler</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="font-semibold text-lg mb-4 text-gray-500">Historique</h2>
            <div className="space-y-3">
              {past.map(r => (
                <div key={r._id} className="card flex items-center justify-between opacity-70">
                  <div>
                    <div className="font-medium">{r.serviceName}</div>
                    <div className="text-sm text-gray-400">{r.salonName} · {r.date} à {r.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{r.price} MAD</div>
                    <span className={r.status==='cancelled'?'badge-red':'badge-grey'}>
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
