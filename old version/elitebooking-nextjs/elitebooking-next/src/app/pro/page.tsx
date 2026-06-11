'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProOverview } from '@/components/pro/Overview'
import { ProAgenda }   from '@/components/pro/Agenda'
import { ProRdvList }  from '@/components/pro/RdvList'
import { ProServices } from '@/components/pro/Services'
import { ProStaff }    from '@/components/pro/Staff'
import { ProClients }  from '@/components/pro/Clients'
import { ProSchedule } from '@/components/pro/Schedule'
import { ProProfile }  from '@/components/pro/Profile'

const TABS = [
  { id:'overview',  label:'Vue d\'ensemble', icon:'📊' },
  { id:'agenda',    label:'Agenda',          icon:'📅' },
  { id:'rdv',       label:'Rendez-vous',     icon:'🗓' },
  { id:'services',  label:'Prestations',     icon:'✂️' },
  { id:'staff',     label:'Employés',        icon:'👥' },
  { id:'clients',   label:'Clients',         icon:'👤' },
  { id:'schedule',  label:'Horaires',        icon:'🕐' },
  { id:'profile',   label:'Profil',          icon:'⚙️' },
]

export default function ProPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab]       = useState('overview')
  const [salon, setSalon]   = useState<any>(null)
  const [salonId, setSalonId] = useState<string>('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth'); return }
    if (status === 'authenticated') {
      const u = session?.user as any
      if (u?.type !== 'pro') { router.push('/client'); return }
      if (u?.salonId) {
        setSalonId(u.salonId)
        fetch(`/api/salons/${u.salonId}`).then(r => r.json()).then(setSalon)
      }
    }
  }, [status, session])

  if (!salon) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>

  const renderTab = () => {
    switch(tab) {
      case 'overview':  return <ProOverview salonId={salonId} salon={salon} />
      case 'agenda':    return <ProAgenda  salonId={salonId} salon={salon} />
      case 'rdv':       return <ProRdvList salonId={salonId} />
      case 'services':  return <ProServices salonId={salonId} />
      case 'staff':     return <ProStaff   salonId={salonId} />
      case 'clients':   return <ProClients salonId={salonId} />
      case 'schedule':  return <ProSchedule salonId={salonId} />
      case 'profile':   return <ProProfile salon={salon} setSalon={setSalon} />
      default:          return null
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="font-serif text-lg">Elite<em className="text-[#C17B4E]">Booking</em></div>
          <div className="text-xs text-gray-400 mt-0.5">Espace Pro</div>
        </div>

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 pt-5 pb-2">Principal</div>
        {TABS.slice(0,6).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium w-full text-left transition-all
              ${tab===t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 pt-5 pb-2">Compte</div>
        {TABS.slice(6).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium w-full text-left transition-all
              ${tab===t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}

        <div className="mt-auto p-4 border-t border-gray-100">
          <div className="text-sm font-medium text-gray-700">{salon.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{salon.category} · {salon.city}</div>
          <button onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-red-400 hover:text-red-600 mt-3">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {renderTab()}
      </main>
    </div>
  )
}
