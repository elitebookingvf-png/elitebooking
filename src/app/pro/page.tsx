'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProOverview } from '@/components/pro/Overview'
import { ProAgenda }   from '@/components/pro/Agenda'
import { ProRdvList, ProServices, ProStaff, ProClients, ProSchedule, ProSalonSettings, ProProfile } from '@/components/pro/Others'
import { CITIES, CATEGORIES } from '@/lib/utils'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'

function CreateSalonScreen({ onCreated, onSignOut }: { onCreated: (s: any) => void; onSignOut: () => void }) {
  const [name, setName]     = useState('')
  const [city, setCity]     = useState('Casablanca')
  const [cat, setCat]       = useState('coiffure')
  const [addr, setAddr]     = useState('')
  const [desc, setDesc]     = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  async function create() {
    if (!name.trim()) { setErr('Le nom du salon est requis'); return }
    setSaving(true); setErr('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/pro/create-salon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ name, city, category: cat, address: addr, description: desc }),
    })
    const data = await res.json()
    if (!res.ok) { setErr(data.error || 'Erreur'); setSaving(false); return }
    onCreated(data.salon)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f7f7',padding:24}}>
      <div style={{background:'#fff',borderRadius:20,padding:36,width:'100%',maxWidth:460,boxShadow:'0 8px 40px rgba(0,0,0,0.08)'}}>
        <div style={{fontFamily:'DM Serif Display,serif',fontSize:'1.6rem',marginBottom:6}}>Créez votre salon</div>
        <p style={{color:'#aaa',fontSize:'0.85rem',marginBottom:24}}>Configurez votre établissement pour accéder à votre espace pro.</p>
        {err && <div style={{background:'#fef2f2',color:'#e53e3e',padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:'0.83rem'}}>{err}</div>}
        <div className="form-group">
          <label>Nom du salon *</label>
          <input className="form-control" value={name} onChange={e=>setName(e.target.value)} placeholder="Mon Super Salon" />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label>Catégorie</label>
            <select className="form-control" value={cat} onChange={e=>setCat(e.target.value)}>
              {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Ville</label>
            <select className="form-control" value={city} onChange={e=>setCity(e.target.value)}>
              {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Adresse</label>
          <input className="form-control" value={addr} onChange={e=>setAddr(e.target.value)} placeholder="123 Boulevard Mohamed V" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea className="form-control" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Décrivez votre établissement…" style={{minHeight:72}} />
        </div>
        <button onClick={create} disabled={saving}
          style={{width:'100%',padding:'13px',background:'#111',color:'#fff',border:'none',borderRadius:10,fontSize:'0.92rem',fontWeight:600,cursor:'pointer',marginTop:8}}>
          {saving ? 'Création…' : 'Créer mon salon →'}
        </button>
        <button onClick={onSignOut} style={{width:'100%',marginTop:10,background:'none',border:'none',color:'#aaa',fontSize:'0.82rem',cursor:'pointer'}}>Se déconnecter</button>
      </div>
    </div>
  )
}

const SECTIONS = [
  {
    label: 'Principal',
    tabs: [
      { id:'overview', label:"Vue d'ensemble", icon:'chart' },
      { id:'agenda',   label:'Agenda',         icon:'calendar' },
      { id:'rdv',      label:'Rendez-vous',    icon:'check' },
    ]
  },
  {
    label: 'Gestion',
    tabs: [
      { id:'services', label:'Prestations', icon:'scissors' },
      { id:'staff',    label:'Employés',    icon:'users' },
      { id:'clients',  label:'Clients',     icon:'user' },
      { id:'schedule', label:'Horaires',    icon:'clock' },
    ]
  },
  {
    label: 'Compte',
    tabs: [
      { id:'salon',   label:'Mon salon', icon:'home' },
      { id:'profile', label:'Profil',    icon:'settings' },
    ]
  },
]

const TAB_META: Record<string, { title: string; sub: string }> = {
  overview: { title: "Vue d'ensemble",  sub: 'Votre activité en un coup d’œil' },
  agenda:   { title: 'Agenda',          sub: 'Vos journées, employé par employé' },
  rdv:      { title: 'Rendez-vous',     sub: 'Toutes vos réservations' },
  services: { title: 'Prestations',     sub: 'Votre carte de soins et tarifs' },
  staff:    { title: 'Employés',        sub: 'Votre équipe et leurs horaires' },
  clients:  { title: 'Clients',         sub: 'Votre fichier clientèle' },
  schedule: { title: 'Horaires',        sub: 'Ouverture, fermeture et blocages' },
  salon:    { title: 'Mon salon',       sub: 'Votre vitrine publique' },
  profile:  { title: 'Profil',          sub: 'Vos informations personnelles' },
}

export default function ProPage() {
  const router = useRouter()
  const [tab, setTab]       = useState('overview')
  const [salon, setSalon]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }

      // All queries via browser client — session is already in memory, no cookie race
      const { data: profile } = await supabase
        .from('profiles').select('type, salon_id').eq('id', user.id).single()

      if ((profile as any)?.type !== 'pro') { router.push('/client'); return }

      // Resolve strictly by ownership — profile.salon_id is a writable cache
      // and must never be the source of salon access
      const { data: salonRow } = await supabase
        .from('salons').select('*').eq('owner_id', user.id).maybeSingle()

      setSalon(salonRow)
      setLoading(false)
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#aaa'}}>Chargement…</div>
  )

  if (!salon) return <CreateSalonScreen onCreated={setSalon} onSignOut={signOut} />

  const renderTab = () => {
    switch(tab) {
      case 'overview':  return <ProOverview salon={salon} />
      case 'agenda':    return <ProAgenda   salon={salon} />
      case 'rdv':       return <ProRdvList />
      case 'services':  return <ProServices />
      case 'staff':     return <ProStaff />
      case 'clients':   return <ProClients />
      case 'schedule':  return <ProSchedule />
      case 'salon':     return <ProSalonSettings salon={salon} setSalon={setSalon} />
      case 'profile':   return <ProProfile salon={salon} setSalon={setSalon} />
      default:          return null
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'#f7f7f7'}}>
      {/* Mobile top bar — only visible on small screens */}
      <header className="pro-topbar">
        <button onClick={() => setSidebarOpen(true)} aria-label="Menu"
          style={{background:'none',border:'none',fontSize:'1.5rem',cursor:'pointer',lineHeight:1,padding:4,color:'#fff'}}>☰</button>
        <div className="serif" style={{fontSize:'1.05rem',fontWeight:700,color:'#fff'}}>
          Elite<em style={{fontStyle:'italic'}}>Booking</em>
        </div>
        <div style={{width:32}} />
      </header>

      {/* Backdrop for mobile drawer */}
      <div className={`pro-backdrop${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar — black, luxury feel (drawer on mobile) */}
      <aside className={`pro-aside${sidebarOpen ? ' open' : ''}`} style={{background:'#0e0e0e',borderRight:'none'}}>
        <div style={{padding:'22px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div className="serif" style={{fontSize:'1.15rem',fontWeight:700,color:'#fff'}}>
              Elite<em style={{fontStyle:'italic'}}>Booking</em>
            </div>
            <div style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.35)',marginTop:3,textTransform:'uppercase',letterSpacing:'0.12em'}}>Espace Pro</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="pro-aside-close" aria-label="Fermer"
            style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'rgba(255,255,255,0.6)',lineHeight:1}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 10px'}}>
          {SECTIONS.map(section => (
            <div key={section.label} style={{marginBottom:22}}>
              <div style={{fontSize:'0.62rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.14em',padding:'0 14px',marginBottom:6}}>{section.label}</div>
              {section.tabs.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false) }}
                  style={{display:'flex',alignItems:'center',gap:11,
                    padding:'10px 14px',width:'100%',border:'none',borderRadius:10,margin:'1px 0',
                    background: tab===t.id ? '#fff' : 'transparent',
                    color: tab===t.id ? '#111' : 'rgba(255,255,255,0.55)',
                    fontSize:'0.85rem',fontWeight: tab===t.id ? 600 : 500,textAlign:'left',cursor:'pointer',transition:'all 0.15s'}}>
                  <span style={{width:18,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name={t.icon as IconName} size={15} /></span>{t.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{padding:18,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontSize:'0.85rem',fontWeight:600,color:'#fff'}}>{salon.name}</div>
          <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)',marginTop:3}}>{salon.category} · {salon.city}</div>
          <button onClick={signOut}
            style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.45)',background:'none',border:'none',cursor:'pointer',marginTop:10,padding:0}}>
            Déconnexion →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="pro-content">
        <div className="pro-page-header">
          <div>
            <h1 className="pro-page-title"><em style={{fontStyle:'italic'}}>{TAB_META[tab]?.title}</em></h1>
            <div className="pro-page-sub">
              {TAB_META[tab]?.sub} · {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
        </div>
        {renderTab()}
      </main>
    </div>
  )
}
