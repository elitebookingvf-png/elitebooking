'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProOverview } from '@/components/pro/Overview'
import { ProAgenda }   from '@/components/pro/Agenda'
import { ProRdvList, ProServices, ProStaff, ProClients, ProSchedule, ProProfile } from '@/components/pro/Others'

const SECTIONS = [
  {
    label: 'Principal',
    tabs: [
      { id:'overview', label:"Vue d'ensemble", icon:'📊' },
      { id:'agenda',   label:'Agenda',         icon:'📅' },
      { id:'rdv',      label:'Rendez-vous',    icon:'�️' },
    ]
  },
  {
    label: 'Gestion',
    tabs: [
      { id:'services', label:'Prestations', icon:'✂️' },
      { id:'staff',    label:'Employés',    icon:'👥' },
      { id:'clients',  label:'Clients',     icon:'👤' },
      { id:'schedule', label:'Horaires',    icon:'🕐' },
    ]
  },
  {
    label: 'Compte',
    tabs: [
      { id:'salon',   label:'Mon salon', icon:'🏪' },
      { id:'profile', label:'Profil',    icon:'👤' },
    ]
  },
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

      // All queries via browser client — session is already in memory, no cookie race
      const { data: profile } = await supabase
        .from('profiles').select('type, salon_id').eq('id', user.id).single()

      if ((profile as any)?.type !== 'pro') { router.push('/client'); return }

      // Try to load salon via salon_id first (fast path)
      let salonRow: any = null
      if ((profile as any)?.salon_id) {
        const { data } = await supabase
          .from('salons').select('*').eq('id', (profile as any).salon_id).single()
        salonRow = data
      }

      // Fallback: find by owner_id (handles first login after register race)
      if (!salonRow) {
        const { data } = await supabase
          .from('salons').select('*').eq('owner_id', user.id).maybeSingle()
        salonRow = data
        // Patch the profile so next load is instant
        if (salonRow) {
          await supabase.from('profiles').update({ salon_id: salonRow.id }).eq('id', user.id)
        }
      }

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
      case 'salon':     return <ProProfile salon={salon} setSalon={setSalon} />
      case 'profile':   return <ProProfile salon={salon} setSalon={setSalon} />
      default:          return null
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'#f7f7f7'}}>
      {/* Sidebar — white bg + gold active border (matches HTML exactly) */}
      <aside style={{width:240,background:'#fff',borderRight:'1px solid #efefef',display:'flex',flexDirection:'column',
        position:'fixed',height:'100%',zIndex:10}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #efefef'}}>
          <div className="serif" style={{fontSize:'1.1rem',fontWeight:700,color:'#111'}}>
            Elite<em style={{color:'#C17B4E',fontStyle:'italic'}}>Booking</em>
          </div>
          <div style={{fontSize:'0.72rem',color:'#aaa',marginTop:2}}>Espace Pro</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 0'}}>
          {SECTIONS.map(section => (
            <div key={section.label} style={{marginBottom:20}}>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'#bbb',textTransform:'uppercase',letterSpacing:'0.1em',padding:'0 20px',marginBottom:6}}>{section.label}</div>
              {section.tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{display:'flex',alignItems:'center',gap:10,
                    padding:'10px 20px',width:'100%',border:'none',
                    borderRight: tab===t.id ? '2px solid #C17B4E' : '2px solid transparent',
                    background: tab===t.id ? '#fdf3ec' : 'transparent',
                    color: tab===t.id ? '#C17B4E' : '#555',
                    fontSize:'0.85rem',fontWeight:500,textAlign:'left',cursor:'pointer',transition:'all 0.15s'}}>
                  <span style={{width:18,textAlign:'center',fontSize:'0.95rem'}}>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{padding:16,borderTop:'1px solid #efefef'}}>
          <div style={{fontSize:'0.85rem',fontWeight:600,color:'#111'}}>{salon.name}</div>
          <div style={{fontSize:'0.72rem',color:'#aaa',marginTop:2}}>{salon.category} · {salon.city}</div>
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
