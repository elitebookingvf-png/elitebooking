'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

export default function ClientPage() {
  const router = useRouter()
  const [rdvs, setRdvs]       = useState<any[]>([])
  const [profile, setProfile]   = useState<any>(null)
  const [tab, setTab]           = useState<'rdv'|'profile'>('rdv')
  const [loading, setLoading]   = useState(true)
  const [profileForm, setProfileForm] = useState({ firstname:'', lastname:'', phone:'' })
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const { data: prof } = await supabase.from('profiles').select('firstname,lastname,phone,type').eq('id', user.id).single()
      if ((prof as any)?.type === 'pro') { router.push('/pro'); return }
      setProfile(prof)
      setProfileForm({
        firstname: (prof as any)?.firstname || '',
        lastname:  (prof as any)?.lastname  || '',
        phone:     (prof as any)?.phone     || '',
      })
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

  async function saveProfile() {
    setSaving(true)
    setSaveMsg('')
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    })
    setSaving(false)
    if (res.ok) {
      setProfile((p: any) => ({ ...p, ...profileForm }))
      setSaveMsg('✓ Profil mis à jour')
      setTimeout(() => setSaveMsg(''), 3000)
    } else {
      setSaveMsg('Erreur lors de la sauvegarde')
    }
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
            {profile?.firstname} {profile?.lastname}
          </span>
          <Link href="/search" className="btn btn-secondary btn-sm">Réserver</Link>
          <button onClick={signOut} style={{fontSize:'0.85rem',color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="serif" style={{fontSize:'2rem',marginBottom:4}}>Bonjour, {profile?.firstname || 'vous'} !</h1>
        <p style={{color:'#aaa',fontSize:'0.88rem',marginBottom:28}}>Gérez vos rendez-vous et votre profil</p>

        {/* Tab switcher */}
        <div style={{display:'flex',gap:4,background:'#f3f3f3',padding:4,borderRadius:10,width:'fit-content',marginBottom:28}}>
          {(['rdv','profile'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{padding:'8px 20px',borderRadius:8,fontSize:'0.83rem',border:'none',cursor:'pointer',fontWeight:500,transition:'all 0.2s',
                background: tab===t ? '#fff' : 'transparent',
                color: tab===t ? '#111' : '#888',
                boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'}}>
              {t === 'rdv' ? 'Mes RDV' : 'Mon profil'}
            </button>
          ))}
        </div>

        {/* ── RDV TAB ── */}
        {tab === 'rdv' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 className="serif" style={{fontSize:'1.4rem'}}>Mes rendez-vous</h2>
              <Link href="/search" className="btn btn-primary btn-sm">+ Réserver</Link>
            </div>

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
                <h3 style={{fontWeight:600,fontSize:'0.88rem',textTransform:'uppercase',letterSpacing:'0.06em',color:'#aaa',marginBottom:12}}>À venir</h3>
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
                <h3 style={{fontWeight:600,fontSize:'0.88rem',textTransform:'uppercase',letterSpacing:'0.06em',color:'#aaa',marginBottom:12}}>Historique</h3>
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
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="card" style={{maxWidth:500}}>
            <h3 className="serif" style={{fontSize:'1.2rem',marginBottom:20}}>Mon profil</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom</label>
                <input className="form-control" value={profileForm.firstname}
                  onChange={e => setProfileForm(f => ({...f, firstname: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input className="form-control" value={profileForm.lastname}
                  onChange={e => setProfileForm(f => ({...f, lastname: e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input className="form-control" type="tel" value={profileForm.phone}
                placeholder="+212 6XX XXX XXX"
                onChange={e => setProfileForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginTop:8}}>
              <button onClick={saveProfile} disabled={saving} className="btn btn-primary"
                style={{opacity: saving ? 0.6 : 1}}>
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              {saveMsg && <span style={{fontSize:'0.85rem',color: saveMsg.startsWith('✓') ? '#27AE60' : '#eb5757'}}>{saveMsg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
