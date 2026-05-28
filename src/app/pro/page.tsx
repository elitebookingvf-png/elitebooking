'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProOverview } from '@/components/pro/Overview'
import { ProAgenda }   from '@/components/pro/Agenda'
import { ProRdvList, ProServices, ProStaff, ProClients, ProSchedule, ProProfile } from '@/components/pro/Others'

const TABS = [
  { id:'overview',  label:"Vue d'ensemble", icon:'📊' },
  { id:'agenda',    label:'Agenda',         icon:'📅' },
  { id:'rdv',       label:'Rendez-vous',    icon:'🗓' },
  { id:'services',  label:'Prestations',    icon:'✂️' },
  { id:'staff',     label:'Employés',       icon:'👥' },
  { id:'clients',   label:'Clients',        icon:'👤' },
  { id:'schedule',  label:'Horaires',       icon:'🕐' },
  { id:'profile',   label:'Profil',         icon:'⚙️' },
]

export default function ProPage() {
  const router = useRouter()
  const [tab, setTab]       = useState('overview')
  const [salon, setSalon]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const { data: profile } = await supabase.from('profiles').select('type, salon_id').eq('id', user.id).single()
      if ((profile as any)?.type !== 'pro') { router.push('/client'); return }

      // Try /api/users/me first
      const res = await fetch('/api/users/me')
      const me = await res.json()

      if (me.salon) {
        setSalon(me.salon)
      } else {
        // Fallback: query salon by owner_id (handles race after fresh register)
        const { data: salonRow } = await supabase
          .from('salons')
          .select('*')
          .eq('owner_id', user.id)
          .eq('active', true)
          .maybeSingle()
        if (salonRow) {
          // Also patch profile.salon_id so future loads work
          await supabase.from('profiles').update({ salon_id: salonRow.id }).eq('id', user.id)
          setSalon(salonRow)
        }
      }
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

  if (!salon) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:'#aaa',padding:24}}>
      <div style={{fontSize:'3rem'}}>🏪</div>
      <h2 style={{fontFamily:'DM Serif Display,serif',fontSize:'1.4rem',color:'#111'}}>Aucun salon trouvé</h2>
      <p style={{fontSize:'0.88rem',maxWidth:340,textAlign:'center'}}>Votre salon n'a pas encore été créé ou n'est pas encore visible. Réessayez dans quelques secondes.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        <button onClick={() => window.location.reload()} style={{padding:'10px 22px',background:'#111',color:'#fff',border:'none',borderRadius:9,cursor:'pointer',fontSize:'0.88rem'}}>
          🔄 Réessayer
        </button>
        <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = '/auth'; }}
          style={{padding:'10px 22px',background:'transparent',color:'#aaa',border:'1px solid #e5e5e5',borderRadius:9,cursor:'pointer',fontSize:'0.88rem'}}>
          Se déconnecter
        </button>
      </div>
    </div>
  )

  const renderTab = () => {
    switch(tab) {
      case 'overview':  return <ProOverview salon={salon} />
      case 'agenda':    return <ProAgenda   salon={salon} />
      case 'rdv':       return <ProRdvList />
      case 'services':  return <ProServices />
      case 'staff':     return <ProStaff />
      case 'clients':   return <ProClients />
      case 'schedule':  return <ProSchedule />
      case 'profile':   return <ProProfile salon={salon} setSalon={setSalon} />
      default:          return null
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'#f7f7f7'}}>
      {/* Sidebar */}
      <aside style={{width:240,background:'#111',color:'#fff',display:'flex',flexDirection:'column',
        position:'fixed',height:'100%',zIndex:10}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div className="serif" style={{fontSize:'1.1rem',fontWeight:700}}>
            Elite<em style={{color:'#C17B4E',fontStyle:'normal'}}>Booking</em>
          </div>
          <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',marginTop:2}}>Espace Pro</div>
        </div>

        <div style={{padding:'20px 0',flex:1,overflowY:'auto'}}>
          <div style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',padding:'0 24px',marginBottom:8}}>Principal</div>
          {TABS.slice(0,6).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',
                fontSize:'0.85rem',fontWeight:500,textAlign:'left',border:'none',cursor:'pointer',
                borderRadius:8,margin:'2px 8px',width:'calc(100% - 16px)',transition:'all 0.15s',
                background: tab===t.id?'rgba(255,255,255,0.12)':'transparent',
                color: tab===t.id?'#fff':'rgba(255,255,255,0.55)'}}>
              <span style={{width:18,textAlign:'center'}}>{t.icon}</span>{t.label}
            </button>
          ))}

          <div style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',padding:'16px 24px 8px'}}>Compte</div>
          {TABS.slice(6).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',
                fontSize:'0.85rem',fontWeight:500,textAlign:'left',border:'none',cursor:'pointer',
                borderRadius:8,margin:'2px 8px',width:'calc(100% - 16px)',transition:'all 0.15s',
                background: tab===t.id?'rgba(255,255,255,0.12)':'transparent',
                color: tab===t.id?'#fff':'rgba(255,255,255,0.55)'}}>
              <span style={{width:18,textAlign:'center'}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div style={{padding:16,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{fontSize:'0.85rem',fontWeight:600,color:'#fff'}}>{salon.name}</div>
          <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',marginTop:2}}>{salon.category} · {salon.city}</div>
          <button onClick={signOut}
            style={{fontSize:'0.75rem',color:'#EB5757',background:'none',border:'none',cursor:'pointer',marginTop:8,padding:0}}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,marginLeft:240,padding:32,minHeight:'100vh'}}>
        {renderTab()}
      </main>
    </div>
  )
}
