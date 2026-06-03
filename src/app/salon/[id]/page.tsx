'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toISO, formatPrice, CATEGORIES, tMin } from '@/lib/utils'

type CartItem = {
  serviceId: string; serviceName: string; servicePrice: number; servicePriceType: string
  serviceDuration: number; staffId: string; staffName: string; date: string; time: string
}

export default function SalonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData]     = useState<any>(null)
  const [user, setUser]     = useState<any>(null)
  const [tab, setTab]       = useState<'book'|'team'>('book')

  // Cart
  const [cart, setCart]     = useState<CartItem[]>([])

  // Current selection (resets after each add-to-cart)
  const [step, setStep]           = useState(1)
  const [selectedSvc, setSvc]     = useState<any>(null)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [selectedDate, setDate]   = useState('')
  const [selectedTime, setTime]   = useState('')
  const [slots, setSlots]         = useState<string[]>([])
  const [dates, setDates]         = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    fetch(`/api/salons/${id}`).then(r => r.json()).then(setData)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [id])

  // Generate available dates when staff + service selected
  useEffect(() => {
    if (!selectedStaff || !selectedSvc || !data?.schedule) return
    const today = new Date()
    const ds: string[] = []
    for (let i = 0; i <= 28 && ds.length < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i)
      const iso = toISO(d)
      const dayKeys = ['di','lu','ma','me','je','ve','sa']
      const dk = dayKeys[d.getDay()]
      const sched = data.schedule || {}
      if (sched[`${dk}_open`] !== false) ds.push(iso)
    }
    setDates(ds); setDate(''); setTime(''); setSlots([])
  }, [selectedStaff, selectedSvc, data])

  // Fetch slots when date selected, filter out cart-occupied times
  useEffect(() => {
    if (!selectedDate || !selectedStaff || !selectedSvc) return
    fetch(`/api/availability?salonId=${id}&staffId=${selectedStaff.id}&serviceId=${selectedSvc.id}&date=${selectedDate}`)
      .then(r => r.json()).then(d => {
        const raw: string[] = d.slots ?? []
        const blocked = cart.filter(c => c.staffId === selectedStaff!.id && c.date === selectedDate)
        const filtered = raw.filter(slot => {
          const slotStart = tMin(slot)
          const slotEnd = slotStart + selectedSvc!.duration
          return !blocked.some(c => slotStart < tMin(c.time) + c.serviceDuration && slotEnd > tMin(c.time))
        })
        setSlots(filtered)
      })
  }, [selectedDate, selectedStaff, selectedSvc, id, cart])

  function addToCart() {
    if (!selectedSvc || !selectedStaff || !selectedDate || !selectedTime) return
    // Check overlap with existing cart items for same staff+date
    const newStart = tMin(selectedTime)
    const newEnd   = newStart + selectedSvc.duration
    const conflict = cart.some(item =>
      item.staffId === selectedStaff.id && item.date === selectedDate &&
      newStart < tMin(item.time) + item.serviceDuration && newEnd > tMin(item.time)
    )
    if (conflict) { setBookingError('Ce créneau chevauche une prestation déjà dans votre panier pour cet employé.'); return }
    const newItem: CartItem = {
      serviceId: selectedSvc.id, serviceName: selectedSvc.name,
      servicePrice: Number(selectedSvc.price) || 0, servicePriceType: selectedSvc.price_type,
      serviceDuration: selectedSvc.duration,
      staffId: selectedStaff.id, staffName: `${selectedStaff.firstname} ${selectedStaff.lastname}`,
      date: selectedDate, time: selectedTime,
    }
    setCart(prev => [...prev, newItem].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
    setSvc(null); setSelectedStaff(null); setDate(''); setTime(''); setSlots([]); setDates([])
    setStep(1)
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_,i) => i !== idx))
  }

  async function confirmAll() {
    if (!user) { router.push('/auth'); return }
    if (cart.length === 0) return
    setConfirming(true)
    try {
      const res = await fetch('/api/rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            salon_id: id,
            service_id: item.serviceId,
            staff_id: item.staffId,
            date: item.date,
            start_time: item.time,
          }))
        }),
      })
      const result = await res.json()
      if (!res.ok) { setBookingError(result.error || 'Erreur lors de la réservation'); setConfirming(false); return }
      setBookingError('')
      setSuccess(true)
      setTimeout(() => router.push('/client'), 2000)
    } catch {
      setBookingError('Erreur réseau, veuillez réessayer.')
    }
    setConfirming(false)
  }

  const eligibleStaff = selectedSvc?.staff_ids?.length
    ? (data?.staff || []).filter((s: any) => selectedSvc.staff_ids.includes(s.id))
    : (data?.staff || [])

  const cartTotal = cart.reduce((a, i) => a + i.servicePrice, 0)

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{color:'#aaa'}}>Chargement…</div>
  )

  if (success) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div style={{fontSize:'4rem',marginBottom:16}}>🎉</div>
        <h2 className="serif" style={{fontSize:'2rem',marginBottom:8}}>Réservation confirmée !</h2>
        <p style={{color:'#aaa'}}>Redirection vers votre espace…</p>
      </div>
    </div>
  )

  const { salon, categories, services, staff } = data
  const catInfo = CATEGORIES.find(c => c.id === salon.category)

  const grouped: { cat: any; svcs: any[] }[] = []
  const uncategorized = services.filter((s: any) => !s.cat_id)
  categories.forEach((cat: any) => {
    const svcs = services.filter((s: any) => s.cat_id === cat.id)
    if (svcs.length) grouped.push({ cat, svcs })
  })
  if (uncategorized.length) grouped.push({ cat: null, svcs: uncategorized })

  return (
    <div className="min-h-screen" style={{background:'#f7f7f7'}}>
      <nav className="bg-white border-b px-4 h-16 flex items-center gap-4" style={{borderColor:'#eee'}}>
        <Link href="/" className="serif text-xl font-bold" style={{textDecoration:'none',color:'#111'}}>
          Elite<em style={{color:'#C17B4E',fontStyle:'normal'}}>Booking</em>
        </Link>
        <Link href="/search" style={{fontSize:'0.85rem',color:'#aaa',textDecoration:'none'}}>← Retour</Link>
        {user && <Link href="/client" className="btn btn-secondary btn-sm ml-auto">Mon espace</Link>}
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Salon header */}
        <div className="bg-white rounded-3xl overflow-hidden border mb-8" style={{borderColor:'#eee'}}>
          <div className="h-48 flex items-center justify-center text-7xl"
            style={{background:'linear-gradient(135deg,#fef3e8,#fde8c8)'}}>
            {catInfo?.emoji || '🏪'}
          </div>
          <div className="p-6">
            <h1 className="serif" style={{fontSize:'2rem'}}>{salon.name}</h1>
            <p style={{color:'#aaa',marginTop:4}}>
              📍 {salon.city}{salon.address && ` · ${salon.address}`}
              {salon.phone && ` · 📞 ${salon.phone}`}
            </p>
            <div className="flex gap-3 mt-3 flex-wrap">
              {salon.whatsapp && (
                <a href={`https://wa.me/${salon.whatsapp}`} target="_blank" rel="noopener noreferrer"
                  className="btn btn-sm" style={{background:'#25D366',color:'#fff',border:'none'}}>
                  💬 WhatsApp
                </a>
              )}
              {salon.instagram && (
                <a href={`https://instagram.com/${salon.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm">📸 Instagram</a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['book','team'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="btn"
              style={{background:tab===t?'#111':'#fff',color:tab===t?'#fff':'#666',border:tab===t?'none':'1px solid #eee'}}>
              {t === 'book' ? 'Réserver' : "L'équipe"}
            </button>
          ))}
        </div>

        {tab === 'book' && (
          <div style={{display:'flex',flexDirection:'column',gap:24}}>

            {/* ── Error banner ── */}
            {bookingError && (
              <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <span style={{fontSize:'0.88rem',color:'#dc2626',fontWeight:500}}>⚠️ {bookingError}</span>
                <button onClick={() => setBookingError('')} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',fontSize:'1.1rem',lineHeight:1}}>✕</button>
              </div>
            )}

            {/* ── Cart summary ── */}
            {cart.length > 0 && (
              <div className="card" style={{background:'#f7f7f7',border:'1px solid #e0e0e0'}}>
                <div style={{fontWeight:700,fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em',color:'#aaa',marginBottom:12}}>
                  Mes sélections ({cart.length})
                </div>
                {cart.map((item, idx) => (
                  <div key={idx} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'10px 0',borderBottom:'1px solid #e8e8e8'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:'0.88rem'}}>{item.serviceName}</div>
                      <div style={{fontSize:'0.78rem',color:'#aaa',marginTop:2}}>
                        👤 {item.staffName} · 📅 {new Date(item.date+'T12:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} à {item.time}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontWeight:700,color:'#C17B4E'}}>
                        {formatPrice(item.servicePrice, item.servicePriceType)}
                      </span>
                      <button onClick={() => removeFromCart(idx)}
                        style={{color:'#eb5757',background:'none',border:'none',cursor:'pointer',fontSize:'0.8rem'}}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16,gap:12,flexWrap:'wrap'}}>
                  <div style={{fontSize:'0.88rem',fontWeight:700}}>
                    Total : <span style={{color:'#C17B4E'}}>{cartTotal > 0 ? `${cartTotal} MAD` : 'Sur devis'}</span>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={() => setStep(1)} className="btn btn-secondary btn-sm">
                      + Ajouter une prestation
                    </button>
                    <button onClick={confirmAll} disabled={confirming} className="btn btn-primary btn-sm"
                      style={{opacity:confirming?0.6:1}}>
                      {confirming ? 'Confirmation…' : `Confirmer (${cart.length}) →`}
                    </button>
                  </div>
                </div>
                {!user && <p style={{fontSize:'0.75rem',color:'#aaa',marginTop:8,textAlign:'center'}}>Vous devrez vous connecter pour confirmer</p>}
              </div>
            )}

            {/* ── Step 1: Service ── */}
            <div className="card">
              <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>
                {cart.length > 0 ? '+ Ajouter une autre prestation' : '1. Choisissez une prestation'}
              </h2>
              {grouped.length === 0 && <p style={{color:'#aaa',fontSize:'0.88rem'}}>Aucune prestation disponible.</p>}
              {grouped.map(({ cat, svcs }) => (
                <div key={cat?.id || 'uncat'} style={{marginBottom:16}}>
                  {cat && (
                    <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',
                      letterSpacing:'0.05em',color:cat.color||'#888',marginBottom:8}}>
                      {cat.name}
                    </div>
                  )}
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {svcs.map((s: any) => (
                      <div key={s.id}
                        onClick={() => { setSvc(s); setStep(2); setSelectedStaff(null); setDate(''); setTime('') }}
                        className="service-item"
                        style={{borderColor:selectedSvc?.id===s.id?'#C17B4E':undefined,
                          background:selectedSvc?.id===s.id?'#fdf0e6':undefined}}>
                        <div style={{flex:1}}>
                          <div className="service-name">{s.name}</div>
                          <div style={{fontSize:'0.78rem',color:'#aaa',marginTop:2}}>⏱ {s.duration} min</div>
                        </div>
                        <div className="service-price">{formatPrice(s.price, s.price_type)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Step 2: Staff ── */}
            {step >= 2 && selectedSvc && (
              <div className="card">
                <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>2. Choisissez un employé</h2>
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  {eligibleStaff.map((st: any) => (
                    <div key={st.id} onClick={() => { setSelectedStaff(st); setStep(3) }}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px',
                        borderRadius:12,border:selectedStaff?.id===st.id?'2px solid #111':'2px solid #eee',
                        background:selectedStaff?.id===st.id?'#f7f7f7':'#fff',
                        cursor:'pointer',width:112,transition:'all 0.15s'}}>
                      <div style={{width:48,height:48,borderRadius:'50%',background:'#C17B4E',color:'#fff',
                        display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'1rem'}}>
                        {st.firstname[0]}{st.lastname[0]}
                      </div>
                      <div style={{fontSize:'0.85rem',fontWeight:600,textAlign:'center'}}>{st.firstname}</div>
                      <div style={{fontSize:'0.75rem',color:'#aaa',textAlign:'center'}}>{st.role}</div>
                    </div>
                  ))}
                  {eligibleStaff.length === 0 && <p style={{color:'#aaa',fontSize:'0.88rem'}}>Aucun employé disponible.</p>}
                </div>
              </div>
            )}

            {/* ── Step 3: Date ── */}
            {step >= 3 && selectedStaff && (
              <div className="card">
                <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>3. Choisissez une date</h2>
                <div className="slots-grid">
                  {dates.map(iso => {
                    const d = new Date(iso + 'T12:00')
                    const isToday = iso === toISO(new Date())
                    const lbl = isToday ? 'Auj.' : d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})
                    return (
                      <div key={iso} onClick={() => { setDate(iso); setStep(4); setTime('') }}
                        className={`slot-btn${selectedDate===iso?' selected':''}`}
                        style={isToday && selectedDate!==iso ? {borderColor:'#C17B4E',color:'#C17B4E'} : {}}>
                        {lbl}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Step 4: Time ── */}
            {step >= 4 && selectedDate && (
              <div className="card">
                <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>4. Choisissez un horaire</h2>
                <div className="slots-grid">
                  {slots.map((t: string) => (
                    <div key={t} onClick={() => setTime(t)}
                      className={`slot-btn${selectedTime===t?' selected':''}`}>
                      {t}
                    </div>
                  ))}
                  {slots.length === 0 && <p style={{color:'#aaa',fontSize:'0.88rem',gridColumn:'span 4'}}>Aucun créneau disponible ce jour.</p>}
                </div>

                {selectedTime && (
                  <div style={{background:'#f7f7f7',border:'1px solid #eee',borderRadius:12,padding:16,marginTop:20}}>
                    <p style={{fontWeight:600,fontSize:'0.88rem',marginBottom:8}}>Récapitulatif</p>
                    <div style={{fontSize:'0.85rem',color:'#555',display:'flex',flexDirection:'column',gap:4}}>
                      <div>✅ {selectedSvc.name} — {formatPrice(selectedSvc.price, selectedSvc.price_type)}</div>
                      <div>👤 {selectedStaff.firstname} {selectedStaff.lastname}</div>
                      <div>📅 {new Date(selectedDate+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
                      <div>🕐 {selectedTime} ({selectedSvc.duration} min)</div>
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
                      <button onClick={addToCart} className="btn btn-secondary" style={{flex:1}}>
                        + Ajouter au panier
                      </button>
                      <button onClick={async () => {
                        if (!user) { router.push('/auth'); return }
                        if (!selectedSvc || !selectedStaff || !selectedDate || !selectedTime) return
                        const newItem: CartItem = {
                          serviceId: selectedSvc.id, serviceName: selectedSvc.name,
                          servicePrice: Number(selectedSvc.price)||0, servicePriceType: selectedSvc.price_type,
                          serviceDuration: selectedSvc.duration,
                          staffId: selectedStaff.id, staffName: `${selectedStaff.firstname} ${selectedStaff.lastname}`,
                          date: selectedDate, time: selectedTime,
                        }
                        const finalCart = [...cart, newItem]
                        setConfirming(true)
                        const res = await fetch('/api/rdv', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ items: finalCart.map(item => ({ salon_id: id, service_id: item.serviceId, staff_id: item.staffId, date: item.date, start_time: item.time })) })
                        })
                        const result = await res.json()
                        if (!res.ok) { setBookingError(result.error || 'Erreur lors de la réservation'); setConfirming(false); return }
                        setConfirming(false); setSuccess(true)
                        setTimeout(() => router.push('/client'), 2000)
                      }} disabled={confirming} className="btn btn-primary" style={{flex:1,opacity:confirming?0.6:1}}>
                        {confirming ? 'Confirmation…' : 'Confirmer →'}
                      </button>
                    </div>
                    {!user && <p style={{fontSize:'0.75rem',textAlign:'center',color:'#aaa',marginTop:8}}>Vous devrez vous connecter</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Team tab */}
        {tab === 'team' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {staff.map((st: any) => (
              <div key={st.id} className="card text-center">
                <div style={{width:64,height:64,borderRadius:'50%',background:'#C17B4E',color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'1.2rem',
                  margin:'0 auto 12px'}}>
                  {st.firstname[0]}{st.lastname[0]}
                </div>
                <div style={{fontWeight:600}}>{st.firstname} {st.lastname}</div>
                <div style={{fontSize:'0.85rem',color:'#aaa',marginTop:2}}>{st.role}</div>
                <div style={{fontSize:'0.75rem',color:'#ccc',marginTop:4}}>{st.days?.join(', ')}</div>
              </div>
            ))}
            {staff.length === 0 && <p style={{color:'#aaa',gridColumn:'span 4'}}>Aucun employé.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
