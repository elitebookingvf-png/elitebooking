'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const CAT_EMOJI: Record<string, string> = {
  'Coiffure':'✂️','Hammam':'🛁','Spa':'💆','Onglerie':'💅',
  'Barbier':'🪒','Institut beauté':'💄','Bien-être':'🌿','Esthétique':'✨',
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function SalonPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()

  const [salon, setSalon]     = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff]     = useState<any[]>([])
  const [tab, setTab]         = useState<'book'|'team'>('book')

  // Booking state
  const [step, setStep]       = useState(1)
  const [selectedSvc, setSvc] = useState<any>(null)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [selectedDate, setDate] = useState<string>('')
  const [selectedTime, setTime] = useState<string>('')
  const [slots, setSlots]     = useState<{time:string;free:boolean}[]>([])
  const [dates, setDates]     = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(`/api/salons/${id}`).then(r=>r.json()).then(setSalon)
    fetch(`/api/services/${id}`).then(r=>r.json()).then(setServices)
    fetch(`/api/staff/${id}`).then(r=>r.json()).then(setStaff)
  }, [id])

  // When staff selected, generate available dates
  useEffect(() => {
    if (!selectedStaff || !selectedSvc) return
    const today = new Date()
    const ds: string[] = []
    for (let i = 0; i <= 28 && ds.length < 12; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i)
      if (d.getDay() !== 0) ds.push(toISO(d))
    }
    setDates(ds)
    setDate('')
    setTime('')
    setSlots([])
  }, [selectedStaff, selectedSvc])

  // When date selected, fetch availability
  useEffect(() => {
    if (!selectedDate || !selectedStaff || !selectedSvc) return
    fetch(`/api/availability?salonId=${id}&staffId=${selectedStaff._id}&date=${selectedDate}&duration=${selectedSvc.duration}`)
      .then(r=>r.json()).then(setSlots)
  }, [selectedDate, selectedStaff, selectedSvc, id])

  async function confirm() {
    if (!session) { router.push('/auth'); return }
    setConfirming(true)
    const res = await fetch('/api/rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salonId: id, salonName: salon.name,
        serviceId: selectedSvc._id, serviceName: selectedSvc.name,
        staffId: selectedStaff._id, staffName: `${selectedStaff.firstname} ${selectedStaff.lastname}`,
        date: selectedDate, time: selectedTime,
        price: selectedSvc.price, duration: selectedSvc.duration,
      })
    })
    setConfirming(false)
    if (res.ok) { setSuccess(true); setTimeout(() => router.push('/client'), 2000) }
    else {
      const d = await res.json()
      alert(d.error || 'Erreur lors de la réservation')
    }
  }

  const eligibleStaff = selectedSvc?.staffIds?.length
    ? staff.filter(s => selectedSvc.staffIds.includes(s._id))
    : staff

  if (!salon) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>

  if (success) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="font-serif text-3xl mb-2">Réservation confirmée !</h2>
        <p className="text-gray-400">Redirection vers votre espace…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 h-16 flex items-center gap-4">
        <Link href="/" className="font-serif text-xl">Elite<em className="text-[#C17B4E]">Booking</em></Link>
        <Link href="/search" className="text-sm text-gray-400">← Retour</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Salon header */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-8">
          <div className="h-48 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-7xl">
            {CAT_EMOJI[salon.category] || '🏪'}
          </div>
          <div className="p-6">
            <h1 className="font-serif text-3xl">{salon.name}</h1>
            <p className="text-gray-400 mt-1">📍 {salon.city}{salon.address && ` · ${salon.address}`} · 📞 {salon.phone || '—'}</p>
            {salon.description && <p className="text-gray-500 text-sm mt-3">{salon.description}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={()=>setTab('book')} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab==='book'?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-gray-900'}`}>
            Réserver
          </button>
          <button onClick={()=>setTab('team')} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab==='team'?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-gray-900'}`}>
            L'équipe
          </button>
        </div>

        {/* Booking flow */}
        {tab === 'book' && (
          <div className="space-y-6">
            {/* Step 1: Prestation */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-lg mb-4">1. Choisissez une prestation</h2>
              <div className="space-y-3">
                {services.map(s => (
                  <div key={s._id} onClick={() => { setSvc(s); setStep(2); setSelectedStaff(null); setDate(''); setTime('') }}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${selectedSvc?._id===s._id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      {s.desc && <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>}
                      <div className="text-xs text-gray-400 mt-1">⏱ {s.duration} min</div>
                    </div>
                    <div className="font-bold text-[#C17B4E]">{s.price} MAD</div>
                  </div>
                ))}
                {services.length === 0 && <p className="text-gray-400 text-sm">Aucune prestation disponible.</p>}
              </div>
            </div>

            {/* Step 2: Staff */}
            {step >= 2 && selectedSvc && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-lg mb-4">2. Choisissez un employé</h2>
                <div className="flex flex-wrap gap-3">
                  {eligibleStaff.map(st => (
                    <div key={st._id} onClick={() => { setSelectedStaff(st); setStep(3) }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer w-28 transition-all
                        ${selectedStaff?._id===st._id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <div className="w-12 h-12 rounded-full bg-[#C17B4E] text-white flex items-center justify-center font-bold">
                        {st.firstname[0]}{st.lastname[0]}
                      </div>
                      <div className="text-sm font-medium text-center">{st.firstname}</div>
                      <div className="text-xs text-gray-400 text-center">{st.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date */}
            {step >= 3 && selectedStaff && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-lg mb-4">3. Choisissez une date</h2>
                <div className="grid grid-cols-4 gap-2">
                  {dates.map(iso => {
                    const d = new Date(iso+'T12:00')
                    const isToday = iso === toISO(new Date())
                    const lbl = isToday ? 'Auj.' : d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})
                    return (
                      <div key={iso} onClick={() => { setDate(iso); setStep(4); setTime('') }}
                        className={`slot-btn text-center ${selectedDate===iso?'selected':''} ${isToday?'border-[#C17B4E] text-[#C17B4E]':''}`}>
                        {lbl}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Time */}
            {step >= 4 && selectedDate && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-lg mb-4">4. Choisissez un horaire</h2>
                <div className="grid grid-cols-5 gap-2">
                  {slots.map(s => (
                    <div key={s.time}
                      onClick={() => s.free && setTime(s.time)}
                      className={`slot-btn text-center ${selectedTime===s.time?'selected':''} ${!s.free?'unavailable':''}`}
                      title={!s.free?'Employé occupé':''}>
                      {s.time}
                    </div>
                  ))}
                </div>

                {selectedTime && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm font-medium mb-2">Récapitulatif</p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>✅ {selectedSvc.name} — {selectedSvc.price} MAD</div>
                      <div>👤 {selectedStaff.firstname} {selectedStaff.lastname}</div>
                      <div>📅 {new Date(selectedDate+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
                      <div>🕐 {selectedTime} ({selectedSvc.duration} min)</div>
                    </div>
                    <button onClick={confirm} disabled={confirming}
                      className="btn-primary w-full mt-4 py-3 disabled:opacity-50">
                      {confirming ? 'Confirmation…' : 'Confirmer la réservation →'}
                    </button>
                    {!session && <p className="text-xs text-center text-gray-400 mt-2">Vous devrez vous connecter</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Team tab */}
        {tab === 'team' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {staff.map(st => (
              <div key={st._id} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 rounded-full bg-[#C17B4E] text-white flex items-center justify-center font-bold text-xl mx-auto mb-3">
                  {st.firstname[0]}{st.lastname[0]}
                </div>
                <div className="font-semibold">{st.firstname} {st.lastname}</div>
                <div className="text-sm text-gray-400 mt-0.5">{st.role}</div>
                <div className="text-xs text-gray-300 mt-1">{st.days?.join(', ')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
