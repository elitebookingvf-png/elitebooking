'use client'
import { useState, useEffect, useRef } from 'react'
import { formatPrice, CATEGORIES, CITIES, toISO, tMin } from '@/lib/utils'

// ─── Shared Add-RDV modal (multi-prestations) ────────────────
type ProCartItem = {
  service_id: string; service_name: string; duration: number; price: number; price_type: string
  staff_id: string; staff_name: string; date: string; start_time: string
}

function RdvAddModal({ staff, services, onClose, onSaved, defaultDate }: {
  staff: any[]; services: any[]; onClose: () => void; onSaved: () => void; defaultDate?: string
}) {
  const today = toISO(new Date())
  const [clientName, setClientName]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes]             = useState('')
  const [cart, setCart]               = useState<ProCartItem[]>([])
  // Current line being configured
  const [form, setForm] = useState({ service_id: '', staff_id: 'any', date: defaultDate || today, start_time: '' })
  const [slots, setSlots]   = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const selectedSvc    = services.find(s => s.id === form.service_id)
  const eligibleStaff  = selectedSvc?.staff_ids?.length
    ? staff.filter(s => selectedSvc.staff_ids.includes(s.id))
    : staff

  useEffect(() => {
    if (!form.service_id || !form.date) { setSlots([]); return }
    const sid = form.staff_id === 'any' ? (eligibleStaff[0]?.id || '') : form.staff_id
    if (!sid) { setSlots([]); return }
    fetch(`/api/availability?staffId=${sid}&serviceId=${form.service_id}&date=${form.date}`)
      .then(r => r.json()).then(d => {
        const raw: string[] = Array.isArray(d.slots) ? d.slots : []
        // Block times already in the cart on this date (client can't be in two services at once)
        const blocked = cart.filter(c => c.date === form.date)
        const svcDur = selectedSvc?.duration || 0
        const filtered = raw.filter(slot => {
          const s = tMin(slot), e = s + svcDur
          return !blocked.some(c => s < tMin(c.start_time) + c.duration && e > tMin(c.start_time))
        })
        setSlots(filtered)
        // Consecutive scheduling: pre-select first slot after last booked service
        if (blocked.length) {
          const lastEnd = Math.max(...blocked.map(c => tMin(c.start_time) + c.duration))
          const next = filtered.find(slot => tMin(slot) >= lastEnd)
          if (next) setForm(f => ({ ...f, start_time: next }))
        }
      })
  }, [form.service_id, form.staff_id, form.date, cart])

  function addLine() {
    setErr('')
    if (!form.service_id)  { setErr('Choisissez une prestation'); return }
    if (!form.start_time)  { setErr('Choisissez une heure');      return }
    const svc = services.find(s => s.id === form.service_id)
    if (!svc) return
    const staffId = form.staff_id === 'any' ? (eligibleStaff[0]?.id || '') : form.staff_id
    const st = staff.find(s => s.id === staffId)
    if (!staffId || !st) { setErr('Aucun employé disponible'); return }
    // Conflict against existing cart (any employee, same date)
    const s = tMin(form.start_time), e = s + svc.duration
    const conflict = cart.some(c => c.date === form.date && s < tMin(c.start_time) + c.duration && e > tMin(c.start_time))
    if (conflict) { setErr('Ce créneau chevauche une prestation déjà ajoutée'); return }
    const item: ProCartItem = {
      service_id: svc.id, service_name: svc.name, duration: svc.duration,
      price: Number(svc.price) || 0, price_type: svc.price_type,
      staff_id: staffId, staff_name: `${st.firstname} ${st.lastname}`,
      date: form.date, start_time: form.start_time,
    }
    setCart(prev => [...prev, item].sort((a,b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)))
    // Reset service line but keep date for consecutive booking
    setForm(f => ({ service_id: '', staff_id: 'any', date: f.date, start_time: '' }))
    setSlots([])
  }

  function removeLine(idx: number) { setCart(prev => prev.filter((_, i) => i !== idx)) }

  async function save() {
    setErr('')
    if (!clientName.trim()) { setErr('Nom du client requis'); return }
    // Include any line currently being configured but not yet added
    let finalCart = cart
    if (form.service_id && form.start_time) {
      const svc = services.find(s => s.id === form.service_id)
      const staffId = form.staff_id === 'any' ? (eligibleStaff[0]?.id || '') : form.staff_id
      const st = staff.find(s => s.id === staffId)
      if (svc && st) {
        finalCart = [...cart, {
          service_id: svc.id, service_name: svc.name, duration: svc.duration,
          price: Number(svc.price) || 0, price_type: svc.price_type,
          staff_id: staffId, staff_name: `${st.firstname} ${st.lastname}`,
          date: form.date, start_time: form.start_time,
        }]
      }
    }
    if (finalCart.length === 0) { setErr('Ajoutez au moins une prestation'); return }
    setSaving(true)
    const res = await fetch('/api/rdv/pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: finalCart.map(c => ({
          client_name: clientName, client_phone: clientPhone || null,
          service_id: c.service_id, staff_id: c.staff_id,
          date: c.date, start_time: c.start_time, notes: notes || null,
        })),
      }),
    })
    setSaving(false)
    if (res.ok) { onSaved(); onClose() }
    else { const d = await res.json(); setErr(d.error || 'Erreur') }
  }

  const cartTotal = cart.reduce((a, c) => a + c.price, 0)

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#fff',borderRadius:20,padding:32,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <h2 className="serif" style={{fontSize:'1.5rem'}}>Ajouter un rendez-vous</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'#aaa',lineHeight:1}}>✕</button>
        </div>
        {err && <div style={{background:'#fef2f2',color:'#e53e3e',padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:'0.83rem'}}>{err}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Nom du client *</label>
            <input className="form-control" placeholder="Fatima Benali" value={clientName}
              onChange={e=>setClientName(e.target.value)} />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Téléphone client</label>
            <input className="form-control" type="tel" placeholder="+212 6XX XXX XXX" value={clientPhone}
              onChange={e=>setClientPhone(e.target.value)} />
          </div>
        </div>

        {/* Cart of added prestations */}
        {cart.length > 0 && (
          <div style={{background:'#f7f7f7',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginTop:16}}>
            <div style={{fontWeight:700,fontSize:'0.72rem',textTransform:'uppercase',letterSpacing:'0.06em',color:'#aaa',marginBottom:10}}>
              Prestations ({cart.length})
            </div>
            {cart.map((c, idx) => (
              <div key={idx} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:idx<cart.length-1?'1px solid #e8e8e8':'none'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:'0.85rem'}}>{c.service_name}</div>
                  <div style={{fontSize:'0.75rem',color:'#999',marginTop:2}}>
                    👤 {c.staff_name} · {new Date(c.date+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} à {c.start_time} · {c.duration} min
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:'0.8rem',fontWeight:600,color:'#C17B4E'}}>{formatPrice(c.price, c.price_type)}</span>
                  <button onClick={()=>removeLine(idx)} style={{background:'none',border:'none',cursor:'pointer',color:'#eb5757',fontSize:'1rem'}}>✕</button>
                </div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid #ddd',fontWeight:700,fontSize:'0.85rem'}}>
              <span>Total</span><span style={{color:'#C17B4E'}}>{formatPrice(cartTotal, 'fixe')}</span>
            </div>
          </div>
        )}

        {/* New prestation line */}
        <div style={{border:'1px dashed #ddd',borderRadius:12,padding:16,marginTop:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Prestation</label>
              <select className="form-control" value={form.service_id}
                onChange={e=>setForm(f=>({...f,service_id:e.target.value,start_time:''}))}>
                <option value="">— Choisir —</option>
                {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Employé</label>
              <select className="form-control" value={form.staff_id}
                onChange={e=>setForm(f=>({...f,staff_id:e.target.value,start_time:''}))}>
                <option value="any">N'importe qui</option>
                {eligibleStaff.map(s=><option key={s.id} value={s.id}>{s.firstname} {s.lastname}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Date</label>
              <input type="date" className="form-control" min={today} value={form.date}
                onChange={e=>setForm(f=>({...f,date:e.target.value,start_time:''}))} />
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Heure</label>
              <select className="form-control" value={form.start_time}
                onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}>
                <option value="">— Choisir —</option>
                {slots.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {selectedSvc && form.start_time && (
            <div style={{background:'#fafafa',borderRadius:10,padding:'10px 14px',marginTop:14,fontSize:'0.83rem',color:'#555'}}>
              {selectedSvc.name} · {selectedSvc.duration} min · <strong style={{color:'#C17B4E'}}>{formatPrice(selectedSvc.price, selectedSvc.price_type)}</strong>
            </div>
          )}
          <button onClick={addLine} className="btn btn-secondary" style={{width:'100%',marginTop:14}}>
            + Ajouter cette prestation
          </button>
        </div>

        <div className="form-group" style={{marginTop:16}}>
          <label>Notes internes (optionnel)</label>
          <textarea className="form-control" placeholder="Préférences, allergies, rappels…" value={notes}
            onChange={e=>setNotes(e.target.value)} style={{minHeight:64}} />
        </div>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          <button onClick={onClose} className="btn btn-secondary" style={{flex:1}}>Annuler</button>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{flex:1,opacity:saving?0.6:1}}>
            {saving ? 'Enregistrement…' : 'Enregistrer le RDV'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PIN Modal ──────────────────────────────────────────────
function PinModal({ action, pin, onSuccess, onClose }: {
  action: string; pin: string; onSuccess: () => void; onClose: () => void
}) {
  const [entry, setEntry] = useState('')
  const [err, setErr]     = useState('')

  function press(k: string) {
    if (k === '⌫') { setEntry(e => e.slice(0,-1)); return }
    if (entry.length >= 4) return
    const next = entry + k
    setEntry(next)
    if (next.length === 4) {
      if (next === pin) { onSuccess(); onClose() }
      else { setErr('Code incorrect. Réessayez.'); setTimeout(() => { setEntry(''); setErr('') }, 900) }
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'32px 28px',width:320,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:8}}>🔒</div>
        <div className="serif" style={{fontSize:'1.3rem',marginBottom:4}}>Code PIN requis</div>
        <div style={{fontSize:'0.82rem',color:'#aaa',marginBottom:20}}>{action}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:20}}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{width:14,height:14,borderRadius:'50%',border:'2px solid #ccc',
              background: i < entry.length ? '#111' : '#fff'}} />
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
          {[1,2,3,4,5,6,7,8,9,'','0','⌫'].map((k,i) => (
            k === '' ? <div key={i} /> :
            <button key={i} onClick={() => press(String(k))}
              style={{height:52,border:'1.5px solid #eee',borderRadius:12,fontSize:k==='⌫'?'1.2rem':'1.1rem',
                fontWeight:600,background:'#fff',cursor:'pointer'}}>
              {k}
            </button>
          ))}
        </div>
        {err && <div style={{color:'#e53e3e',fontSize:'0.8rem',marginBottom:8}}>{err}</div>}
        <button onClick={onClose} style={{color:'#aaa',fontSize:'0.82rem',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Annuler</button>
      </div>
    </div>
  )
}

// ─── Client Fiche Modal ───────────────────────────────────────
function ClientFicheModal({ clientKey, clientRdvs, isBlocked, onToggleBlock, onClose }: {
  clientKey: string; clientRdvs: any[]; isBlocked: boolean
  onToggleBlock: () => void; onClose: () => void
}) {
  const sample  = clientRdvs[0]
  const name    = sample?.client_name || 'Client'
  const phone   = clientRdvs.find((r: any) => r.client_phone)?.client_phone || ''
  const waPhone = phone.replace(/\D/g,'')
  const sorted  = [...clientRdvs].sort((a: any,b: any) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))
  const total   = clientRdvs.filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => s + (Number(r.price)||0), 0)
  const noShows = clientRdvs.filter((r: any) => r.status === 'no-show').length
  const visits  = clientRdvs.filter((r: any) => r.status === 'completed').length
  const statusBg: Record<string,string>  = { completed:'#EFF6FF', cancelled:'#FEF2F2', 'no-show':'#FFFBEB', confirmed:'#F0FDF4' }
  const statusFg: Record<string,string>  = { completed:'#3B82F6', cancelled:'#EB5757', 'no-show':'#F59E0B', confirmed:'#27AE60' }
  const statusLbl: Record<string,string> = { completed:'Terminé', cancelled:'Annulé', 'no-show':'Pas venu', confirmed:'Confirmé' }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={onClose}>
      <div style={{background:'#fff',borderRadius:24,width:'100%',maxWidth:480,maxHeight:'90vh',overflow:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.22)'}}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'24px 24px 0',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background: isBlocked?'#EB5757':'#C17B4E',color:'#fff',
              display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'1.3rem',flexShrink:0}}>
              {name[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:'1.15rem',display:'flex',alignItems:'center',gap:8}}>
                {name}
                {isBlocked && <span style={{fontSize:'0.68rem',background:'#EB5757',color:'#fff',padding:'2px 8px',borderRadius:8,fontWeight:600}}>Bloqué</span>}
              </div>
              {phone
                ? <div style={{fontSize:'0.85rem',color:'#444',marginTop:3}}>📞 {phone}</div>
                : <div style={{fontSize:'0.8rem',color:'#aaa',marginTop:3}}>Aucun numéro enregistré</div>
              }
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'#aaa',padding:4}}>✕</button>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,padding:'20px 24px'}}>
          {[
            { label:'Visites', value: visits, color:'#3B82F6' },
            { label:'No-shows', value: noShows, color:'#F59E0B' },
            { label:'Total dépensé', value: total > 0 ? `${total} MAD` : '—', color:'#C17B4E' },
          ].map(s => (
            <div key={s.label} style={{background:'#f7f7f7',borderRadius:14,padding:'12px 10px',textAlign:'center'}}>
              <div style={{fontWeight:800,fontSize:'1.15rem',color:s.color}}>{s.value}</div>
              <div style={{fontSize:'0.72rem',color:'#aaa',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{padding:'0 24px 16px',display:'flex',gap:10}}>
          {waPhone && (
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:'#25D366',color:'#fff',
                borderRadius:12,padding:'10px',fontWeight:700,fontSize:'0.85rem',textDecoration:'none'}}>
              💬 WhatsApp
            </a>
          )}
          <button onClick={onToggleBlock}
            style={{flex:1,padding:'10px',borderRadius:12,border:'none',cursor:'pointer',fontWeight:700,fontSize:'0.85rem',
              background: isBlocked?'#F0FDF4':'#FEF2F2', color: isBlocked?'#27AE60':'#EB5757'}}>
            {isBlocked ? '✓ Débloquer' : '🚫 Bloquer'}
          </button>
        </div>

        {/* RDV History */}
        <div style={{borderTop:'1px solid #f3f3f3',padding:'12px 24px 24px'}}>
          <div style={{fontWeight:700,fontSize:'0.82rem',color:'#aaa',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>
            Historique ({clientRdvs.length} RDV)
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {sorted.map((r: any) => (
              <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                background:'#f9f9f9',borderRadius:12,padding:'10px 14px',fontSize:'0.83rem'}}>
                <div>
                  <div style={{fontWeight:700}}>{r.service_name}</div>
                  <div style={{color:'#aaa',marginTop:2}}>📅 {r.date} à {r.start_time} · {r.staff_name}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                  <div style={{fontWeight:700,color:'#C17B4E'}}>{formatPrice(r.price, r.price_type)}</div>
                  <span style={{display:'inline-block',marginTop:3,fontSize:'0.7rem',padding:'2px 7px',borderRadius:8,
                    background: statusBg[r.status]||'#f3f3f3', color: statusFg[r.status]||'#888',fontWeight:600}}>
                    {statusLbl[r.status]||r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Client History Section ───────────────────────────────────
function ClientHistorySection({ rdvs }: { rdvs: any[] }) {
  const [blockedClients, setBlockedClients] = useState<string[]>([])
  const [salonId, setSalonId]               = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(d => {
      if (d?.salon?.id) setSalonId(d.salon.id)
      if (Array.isArray(d?.salon?.blocked_clients)) setBlockedClients(d.salon.blocked_clients)
    })
  }, [])

  async function toggleBlock(key: string) {
    const isBlocked = blockedClients.includes(key)
    const next = isBlocked ? blockedClients.filter(c => c !== key) : [...blockedClients, key]
    setBlockedClients(next)
    if (salonId) {
      await fetch('/api/salons/' + salonId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_clients: next }),
      })
    }
  }

  if (rdvs.length === 0) return null

  const clientMap: Record<string, any[]> = {}
  rdvs.forEach(r => {
    const key = r.client_id || r.client_name || 'Client'
    if (!clientMap[key]) clientMap[key] = []
    clientMap[key].push(r)
  })
  const clients = Object.entries(clientMap).sort((a, b) => {
    return (a[1][0]?.client_name || '').localeCompare(b[1][0]?.client_name || '')
  })

  return (
    <div style={{marginTop:40}}>
      {selectedClient && clientMap[selectedClient] && (
        <ClientFicheModal
          clientKey={selectedClient}
          clientRdvs={clientMap[selectedClient]}
          isBlocked={blockedClients.includes(selectedClient)}
          onToggleBlock={() => toggleBlock(selectedClient)}
          onClose={() => setSelectedClient(null)}
        />
      )}
      <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:16}}>Historique clients</h2>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {clients.map(([key, clientRdvs]) => {
          const name     = clientRdvs[0]?.client_name || 'Client'
          const phone    = clientRdvs.find((r: any) => r.client_phone)?.client_phone || ''
          const sorted   = [...clientRdvs].sort((a: any,b: any) => b.date.localeCompare(a.date))
          const total    = clientRdvs.filter((r: any) => r.status !== 'cancelled').reduce((s: number,r: any) => s + (Number(r.price)||0), 0)
          const noShows  = clientRdvs.filter((r: any) => r.status === 'no-show').length
          const isBlocked = blockedClients.includes(key)
          return (
            <div key={key} onClick={() => setSelectedClient(key)}
              style={{background: isBlocked?'#fff8f8':'#fff', border:`1px solid ${isBlocked?'#fcd4d4':'#eee'}`,
                borderRadius:16,padding:'14px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,
                transition:'box-shadow 0.15s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <div style={{width:44,height:44,borderRadius:'50%',background: isBlocked?'#EB5757':'#C17B4E',color:'#fff',
                display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'1rem',flexShrink:0}}>
                {name[0]?.toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'0.92rem',display:'flex',alignItems:'center',gap:6}}>
                  {name}
                  {isBlocked && <span style={{fontSize:'0.65rem',background:'#EB5757',color:'#fff',padding:'1px 6px',borderRadius:6,fontWeight:600}}>Bloqué</span>}
                </div>
                {phone && <div style={{fontSize:'0.78rem',color:'#555',marginTop:2}}>📞 {phone}</div>}
                <div style={{fontSize:'0.74rem',color:'#aaa',marginTop:2}}>
                  {clientRdvs.length} RDV{noShows > 0 ? ` · ${noShows} no-show` : ''} · dernier : {sorted[0]?.date}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontWeight:700,color:'#C17B4E',fontSize:'0.88rem'}}>{total > 0 ? `${total} MAD` : '—'}</div>
                <div style={{fontSize:'0.72rem',color:'#bbb',marginTop:4}}>Voir fiche →</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── RDV List ────────────────────────────────────────────────
export function ProRdvList() {
  const [rdvs, setRdvs]         = useState<any[]>([])
  const [filter, setFilter]     = useState('confirmed')
  const [showAdd, setShowAdd]   = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff2]      = useState<any[]>([])
  const [pin, setPin]          = useState('0000')
  const [pinLabel2, setPinLabel2] = useState<string | null>(null)
  const pinCbRef2               = useRef<(() => void) | null>(null)

  const loadRdvs = () => fetch('/api/rdv/pro').then(r => r.json()).then(d => setRdvs(Array.isArray(d) ? d : []))

  useEffect(() => {
    loadRdvs()
    fetch('/api/services').then(r => r.json()).then(d => setServices(Array.isArray(d.services) ? d.services : []))
    fetch('/api/staff').then(r => r.json()).then(d => setStaff2(Array.isArray(d) ? d : []))
    fetch('/api/users/me').then(r => r.json()).then(d => { if (d?.salon?.pin) setPin(d.salon.pin) })
    const interval = setInterval(loadRdvs, 30000)
    return () => clearInterval(interval)
  }, [])

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/rdv/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  function requirePin(label: string, cb: () => void) { pinCbRef2.current = cb; setPinLabel2(label) }

  const filtered = rdvs
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a,b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))

  return (
    <div>
      {showAdd && (
        <RdvAddModal
          staff={staff} services={services}
          onClose={() => setShowAdd(false)}
          onSaved={loadRdvs}
        />
      )}
      {pinLabel2 && (
        <PinModal
          action={pinLabel2}
          pin={pin}
          onSuccess={() => { pinCbRef2.current?.(); pinCbRef2.current = null }}
          onClose={() => setPinLabel2(null)}
        />
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 className="serif" style={{fontSize:'2rem'}}>Rendez-vous</h1>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">+ Ajouter un RDV</button>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:24}}>
        {['all','confirmed','cancelled','completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:'8px 16px',borderRadius:12,fontSize:'0.82rem',fontWeight:500,cursor:'pointer',border:'none',
              background: filter===f?'#111':'#fff',
              color: filter===f?'#fff':'#666',
              boxShadow: filter===f?'none':'0 0 0 1px #eee'}}>
            {f==='all'?'Tous':f==='confirmed'?'Confirmés':f==='cancelled'?'Annulés':'Terminés'}
          </button>
        ))}
      </div>
      <div className="card table-scroll" style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',minWidth:760}}>
          <thead style={{background:'#f7f7f7',borderBottom:'1px solid #eee'}}>
            <tr>
              {['Client','Prestation','Employé','Date','Heure','Prix','Statut','Action'].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'0.72rem',fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{borderBottom:'1px solid #f7f7f7'}}>
                <td style={{padding:'12px 16px',fontSize:'0.85rem',fontWeight:500}}>{r.client_name||'Client'}</td>
                <td style={{padding:'12px 16px',fontSize:'0.85rem'}}>{r.service_name}</td>
                <td style={{padding:'12px 16px',fontSize:'0.85rem',color:'#aaa'}}>{r.staff_name}</td>
                <td style={{padding:'12px 16px',fontSize:'0.85rem'}}>{r.date}</td>
                <td style={{padding:'12px 16px',fontSize:'0.85rem'}}>{r.start_time}</td>
                <td style={{padding:'12px 16px',fontSize:'0.85rem',fontWeight:700,color:'#C17B4E'}}>{formatPrice(r.price,r.price_type)}</td>
                <td style={{padding:'12px 16px'}}>
                  <span className={r.status==='confirmed'?'badge badge-green':r.status==='cancelled'?'badge badge-red':r.status==='completed'?'badge badge-gold':'badge badge-grey'}>
                    {r.status==='confirmed'?'Confirmé':r.status==='cancelled'?'Annulé':r.status==='completed'?'Terminé':'No-show'}
                  </span>
                </td>
                <td style={{padding:'12px 16px'}}>
                  {r.status === 'confirmed' && (
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={() => requirePin('Marquer comme terminé', () => changeStatus(r.id,'completed'))}
                        style={{fontSize:'0.72rem',color:'#27AE60',background:'none',border:'none',cursor:'pointer'}}>✓ Terminé</button>
                      <button onClick={() => changeStatus(r.id,'cancelled')}
                        style={{fontSize:'0.72rem',color:'#EB5757',background:'none',border:'none',cursor:'pointer'}}>✗ Annuler</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'#aaa',fontSize:'0.85rem'}}>Aucun rendez-vous</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Client History ── */}
      <ClientHistorySection rdvs={rdvs} />
    </div>
  )
}

// ─── Services ────────────────────────────────────────────────
export function ProServices() {
  const [categories, setCategories] = useState<any[]>([])
  const [services, setServices]     = useState<any[]>([])
  const [staff, setStaff]           = useState<any[]>([])
  const [editing, setEditing]       = useState<any>(null)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [form, setForm]     = useState({ name:'', price:'', price_type:'fixed', duration:'30', cat_id:'', staff_ids:[] as string[] })
  const [catForm, setCatForm] = useState({ name:'', color:'#C17B4E' })
  const [saving, setSaving] = useState(false)
  const [pin, setPin]             = useState('0000')
  const [pendingDelete, setPendingDelete] = useState<{id:string; type:'service'|'category'} | null>(null)

  const load = () => {
    fetch('/api/services').then(r => r.json()).then(d => { setCategories(Array.isArray(d.categories) ? d.categories : []); setServices(Array.isArray(d.services) ? d.services : []) })
    fetch('/api/staff').then(r => r.json()).then(d => setStaff(Array.isArray(d) ? d : []))
    fetch('/api/users/me').then(r => r.json()).then(d => { if (d?.salon?.pin) setPin(d.salon.pin) })
  }
  useEffect(() => { load() }, [])

  const openForm = (svc?: any) => {
    if (svc) { setEditing(svc); setForm({ name:svc.name, price:String(svc.price), price_type:svc.price_type||'fixed', duration:String(svc.duration), cat_id:svc.cat_id||'', staff_ids:svc.staff_ids||[] }) }
    else { setEditing({}); setForm({ name:'', price:'', price_type:'fixed', duration:'30', cat_id:'', staff_ids:[] }) }
  }

  const save = async () => {
    setSaving(true)
    const method = editing?.id ? 'PUT' : 'POST'
    const payload: any = { ...form, price: +form.price, duration: +form.duration }
    if (editing?.id) payload.id = editing.id
    await fetch('/api/services', { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    setSaving(false); setEditing(null); load()
  }

  const remove = (id: string) => { setPendingDelete({ id, type: 'service' }) }

  const saveCat = async () => {
    setSaving(true)
    const method = editingCat?.id ? 'PUT' : 'POST'
    const body = { ...catForm, resourceType:'category', id: editingCat?.id }
    await fetch('/api/services', { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    setSaving(false); setEditingCat(null); load()
  }

  const removeCat = (id: string) => { setPendingDelete({ id, type: 'category' }) }

  return (
    <div>
      {pendingDelete && (
        <PinModal
          action={pendingDelete.type === 'service' ? 'Supprimer cette prestation' : 'Supprimer cette catégorie'}
          pin={pin}
          onSuccess={async () => {
            const { id, type } = pendingDelete
            setPendingDelete(null)
            await fetch('/api/services', { method:'DELETE', headers:{'Content-Type':'application/json'},
              body: JSON.stringify(type === 'category' ? { id, resourceType:'category' } : { id }) })
            load()
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 className="serif" style={{fontSize:'2rem'}}>Prestations</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => { setEditingCat({}); setCatForm({name:'',color:'#C17B4E'}) }} className="btn btn-secondary btn-sm">+ Catégorie</button>
          <button onClick={() => openForm()} className="btn btn-primary btn-sm">+ Prestation</button>
        </div>
      </div>

      {categories.map(cat => {
        const svcs = services.filter(s => s.cat_id === cat.id)
        return (
          <div key={cat.id} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:12,height:12,borderRadius:'50%',background:cat.color||'#C17B4E'}}/>
                <span style={{fontWeight:700,fontSize:'0.85rem',textTransform:'uppercase',letterSpacing:'0.04em',color:cat.color||'#888'}}>{cat.name}</span>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => { setEditingCat(cat); setCatForm({name:cat.name,color:cat.color||'#C17B4E'}) }}
                  style={{fontSize:'0.75rem',color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>Modifier</button>
                <button onClick={() => removeCat(cat.id)}
                  style={{fontSize:'0.75rem',color:'#EB5757',background:'none',border:'none',cursor:'pointer'}}>Supprimer</button>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {svcs.map(s => (
                <div key={s.id} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                  <div>
                    <div style={{fontWeight:600}}>{s.name}</div>
                    <div style={{fontSize:'0.75rem',color:'#aaa',marginTop:2}}>⏱ {s.duration} min{s.staff_ids?.length ? ` · ${s.staff_ids.length} employé(s)` : ' · Tous les employés'}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <span style={{fontWeight:700,color:'#C17B4E'}}>{formatPrice(s.price,s.price_type)}</span>
                    <button onClick={() => openForm(s)} style={{fontSize:'0.82rem',color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>Modifier</button>
                    <button onClick={() => remove(s.id)} style={{fontSize:'0.82rem',color:'#EB5757',background:'none',border:'none',cursor:'pointer'}}>Supprimer</button>
                  </div>
                </div>
              ))}
              {svcs.length === 0 && <p style={{fontSize:'0.82rem',color:'#ccc',padding:'8px 0'}}>Aucune prestation dans cette catégorie</p>}
            </div>
          </div>
        )
      })}

      {/* Uncategorized */}
      {services.filter(s => !s.cat_id).length > 0 && (
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:700,fontSize:'0.85rem',textTransform:'uppercase',letterSpacing:'0.04em',color:'#aaa',marginBottom:8}}>Sans catégorie</div>
          {services.filter(s => !s.cat_id).map(s => (
            <div key={s.id} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:8}}>
              <div>
                <div style={{fontWeight:600}}>{s.name}</div>
                <div style={{fontSize:'0.75rem',color:'#aaa',marginTop:2}}>⏱ {s.duration} min</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <span style={{fontWeight:700,color:'#C17B4E'}}>{formatPrice(s.price,s.price_type)}</span>
                <button onClick={() => openForm(s)} style={{fontSize:'0.82rem',color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>Modifier</button>
                <button onClick={() => remove(s.id)} style={{fontSize:'0.82rem',color:'#EB5757',background:'none',border:'none',cursor:'pointer'}}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {categories.length === 0 && services.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:'40px',color:'#aaa'}}>Aucune prestation. Ajoutez-en une !</div>
      )}

      {/* Category modal */}
      {editingCat !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl" style={{width:'100%',maxWidth:420}}>
            <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:24}}>{editingCat?.id ? 'Modifier' : 'Ajouter'} une catégorie</h2>
            <div className="space-y-4">
              <div className="form-group"><label>Nom *</label><input className="form-control" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="form-group"><label>Couleur</label><input type="color" className="form-control" style={{height:44,padding:4}} value={catForm.color} onChange={e=>setCatForm(f=>({...f,color:e.target.value}))} /></div>
            </div>
            <div style={{display:'flex',gap:12,marginTop:24}}>
              <button onClick={() => setEditingCat(null)} className="btn btn-secondary" style={{flex:1}}>Annuler</button>
              <button onClick={saveCat} disabled={saving} className="btn btn-primary" style={{flex:1,opacity:saving?0.6:1}}>{saving?'Sauvegarde…':'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Service modal */}
      {editing !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl" style={{width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:24}}>{editing?.id ? 'Modifier' : 'Ajouter'} une prestation</h2>
            <div className="space-y-4">
              <div className="form-group"><label>Nom *</label><input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="form-group"><label>Catégorie</label>
                <select className="form-control" value={form.cat_id} onChange={e=>setForm(f=>({...f,cat_id:e.target.value}))}>
                  <option value="">Sans catégorie</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Type de prix</label>
                <select className="form-control" value={form.price_type} onChange={e=>setForm(f=>({...f,price_type:e.target.value}))}>
                  <option value="fixed">Prix fixe</option>
                  <option value="from">À partir de</option>
                  <option value="quote">Sur devis</option>
                </select>
              </div>
              <div className="form-row">
                {form.price_type !== 'quote' && (
                  <div className="form-group" style={{marginBottom:0}}><label>Prix (MAD) *</label><input className="form-control" type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
                )}
                <div className="form-group" style={{marginBottom:0}}><label>Durée (min) *</label><input className="form-control" type="number" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} /></div>
              </div>
              {staff.length > 0 && (
                <div className="form-group">
                  <label>Employés habilités (vide = tous)</label>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                    {staff.map(st => (
                      <label key={st.id} style={{display:'flex',alignItems:'center',gap:12,padding:12,border:'1px solid #eee',borderRadius:12,cursor:'pointer'}}>
                        <input type="checkbox" checked={form.staff_ids.includes(st.id)}
                          onChange={e => setForm(f => ({...f,staff_ids: e.target.checked ? [...f.staff_ids,st.id] : f.staff_ids.filter(id=>id!==st.id)}))} />
                        <div style={{width:28,height:28,borderRadius:'50%',background:'#C17B4E',color:'#fff',fontSize:'0.72rem',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{(st.firstname||'?')[0]}{(st.lastname||'?')[0]}</div>
                        <div><div style={{fontSize:'0.85rem',fontWeight:500}}>{st.firstname} {st.lastname}</div><div style={{fontSize:'0.75rem',color:'#aaa'}}>{st.role}</div></div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:12,marginTop:24}}>
              <button onClick={() => setEditing(null)} className="btn btn-secondary" style={{flex:1}}>Annuler</button>
              <button onClick={save} disabled={saving} className="btn btn-primary" style={{flex:1,opacity:saving?0.6:1}}>{saving?'Sauvegarde…':'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff ───────────────────────────────────────────────────
const DAY_OPTIONS = ['Lu','Ma','Me','Je','Ve','Sa','Di']
const TIME_OPTIONS: string[] = []
for(let h=7;h<=21;h++) for(let m=0;m<60;m+=30) TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:${m===0?'00':'30'}`)

export function ProStaff() {
  const [staff, setStaff]   = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ firstname:'', lastname:'', role:'', phone:'', days:['Lu','Ma','Me','Je','Ve'] as string[], start_time:'09:00', end_time:'19:00' })
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/staff').then(r => r.json()).then(d => setStaff(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const openForm = (st?: any) => {
    if (st) { setEditing(st); setForm({ firstname:st.firstname, lastname:st.lastname, role:st.role, phone:st.phone||'', days:st.days||['Lu','Ma','Me','Je','Ve'], start_time:st.start_time||'09:00', end_time:st.end_time||'19:00' }) }
    else { setEditing({}); setForm({ firstname:'', lastname:'', role:'', phone:'', days:['Lu','Ma','Me','Je','Ve'], start_time:'09:00', end_time:'19:00' }) }
  }

  const save = async () => {
    setSaving(true)
    const method = editing?.id ? 'PUT' : 'POST'
    await fetch('/api/staff', { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...form, id: editing?.id }) })
    setSaving(false); setEditing(null); load()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ?')) return
    await fetch('/api/staff', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 className="serif" style={{fontSize:'2rem'}}>Employés</h1>
        <button onClick={() => openForm()} className="btn btn-primary">+ Ajouter</button>
      </div>
      <div className="auto-grid-md">
        {staff.map(st => (
          <div key={st.id} className="card text-center">
            <div style={{width:56,height:56,borderRadius:'50%',background:'#C17B4E',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'1.1rem',margin:'0 auto 12px'}}>
              {(st.firstname||'?')[0]}{(st.lastname||'?')[0]}
            </div>
            <div style={{fontWeight:600}}>{st.firstname} {st.lastname}</div>
            <div style={{fontSize:'0.85rem',color:'#aaa',marginTop:2}}>{st.role}</div>
            <div style={{fontSize:'0.75rem',color:'#ccc',marginTop:2}}>{st.days?.join(', ')}</div>
            <div style={{fontSize:'0.75rem',color:'#aaa',marginTop:2}}>{st.start_time} – {st.end_time}</div>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
              <button onClick={() => openForm(st)} style={{fontSize:'0.75rem',color:'#aaa',background:'none',border:'1px solid #eee',borderRadius:8,padding:'4px 12px',cursor:'pointer'}}>Modifier</button>
              <button onClick={() => remove(st.id)} style={{fontSize:'0.75rem',color:'#EB5757',background:'none',border:'1px solid #fcd4d4',borderRadius:8,padding:'4px 12px',cursor:'pointer'}}>Supprimer</button>
            </div>
          </div>
        ))}
        {staff.length === 0 && <div style={{gridColumn:'span 3',textAlign:'center',padding:'40px',color:'#aaa'}}>Aucun employé</div>}
      </div>

      {editing !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl" style={{width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:24}}>{editing?.id ? 'Modifier' : 'Ajouter'} un employé</h2>
            <div className="space-y-4">
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}><label>Prénom *</label><input className="form-control" value={form.firstname} onChange={e=>setForm(f=>({...f,firstname:e.target.value}))} /></div>
                <div className="form-group" style={{marginBottom:0}}><label>Nom *</label><input className="form-control" value={form.lastname} onChange={e=>setForm(f=>({...f,lastname:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Rôle *</label><input className="form-control" placeholder="Coiffeuse, Masseuse…" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} /></div>
              <div className="form-group"><label>Téléphone</label><input className="form-control" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div className="form-group">
                <label>Jours de travail</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                  {DAY_OPTIONS.map(d => (
                    <button key={d} type="button"
                      onClick={() => setForm(f => ({...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days,d]}))}
                      style={{padding:'6px 12px',borderRadius:8,fontSize:'0.82rem',fontWeight:500,cursor:'pointer',border:'none',
                        background: form.days.includes(d)?'#111':'#f3f3f3',
                        color: form.days.includes(d)?'#fff':'#666'}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}><label>Arrivée</label>
                  <select className="form-control" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}>
                    {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:0}}><label>Départ</label>
                  <select className="form-control" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))}>
                    {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:12,marginTop:24}}>
              <button onClick={() => setEditing(null)} className="btn btn-secondary" style={{flex:1}}>Annuler</button>
              <button onClick={save} disabled={saving} className="btn btn-primary" style={{flex:1,opacity:saving?0.6:1}}>{saving?'Sauvegarde…':'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Clients ─────────────────────────────────────────────────
export function ProClients() {
  const [rdvs, setRdvs]                 = useState<any[]>([])
  const [q, setQ]                       = useState('')
  const [blockedClients, setBlockedClients] = useState<string[]>([])
  const [salonId, setSalonId]           = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/rdv/pro').then(r => r.json()).then(d => setRdvs(Array.isArray(d) ? d : []))
    fetch('/api/users/me').then(r => r.json()).then(d => {
      if (d?.salon?.id) setSalonId(d.salon.id)
      if (Array.isArray(d?.salon?.blocked_clients)) setBlockedClients(d.salon.blocked_clients)
    })
  }, [])

  async function toggleBlock(key: string) {
    const isBlocked = blockedClients.includes(key)
    const next = isBlocked ? blockedClients.filter(c => c !== key) : [...blockedClients, key]
    setBlockedClients(next)
    if (salonId) {
      await fetch('/api/salons/' + salonId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_clients: next }),
      })
    }
  }

  // Build clientMap from ALL rdvs (not just non-cancelled) so history is complete
  const clientMap: Record<string, any[]> = {}
  rdvs.forEach(r => {
    const key = r.client_id || r.client_name || 'Client'
    if (!clientMap[key]) clientMap[key] = []
    clientMap[key].push(r)
  })

  const allClients = Object.entries(clientMap)
    .map(([key, cRdvs]) => ({
      key,
      name:  cRdvs[0]?.client_name || 'Client',
      phone: cRdvs.find((r: any) => r.client_phone)?.client_phone || '',
      rdvs:  cRdvs,
      spent: cRdvs.filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => s + (Number(r.price)||0), 0),
      last:  [...cRdvs].sort((a: any, b: any) => b.date.localeCompare(a.date))[0]?.date || '',
      noShows: cRdvs.filter((r: any) => r.status === 'no-show').length,
    }))
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.last.localeCompare(a.last))

  const totalRevenue = allClients.reduce((a, c) => a + c.spent, 0)

  return (
    <div>
      {selectedClient && clientMap[selectedClient] && (
        <ClientFicheModal
          clientKey={selectedClient}
          clientRdvs={clientMap[selectedClient]}
          isBlocked={blockedClients.includes(selectedClient)}
          onToggleBlock={() => toggleBlock(selectedClient)}
          onClose={() => setSelectedClient(null)}
        />
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 className="serif" style={{fontSize:'2rem'}}>Clients</h1>
        <input value={q} onChange={e => setQ(e.target.value)} className="form-control"
          style={{maxWidth:220}} placeholder="🔍 Rechercher…" />
      </div>

      {/* KPIs */}
      <div className="auto-grid-sm" style={{marginBottom:24}}>
        <div className="card">
          <div style={{fontSize:'2rem',fontWeight:700}}>{allClients.length}</div>
          <div style={{fontSize:'0.85rem',color:'#aaa',marginTop:4}}>Clients uniques</div>
        </div>
        <div className="card">
          <div style={{fontSize:'2rem',fontWeight:700}}>{rdvs.filter(r => r.status !== 'cancelled').length}</div>
          <div style={{fontSize:'0.85rem',color:'#aaa',marginTop:4}}>Total RDV</div>
        </div>
        <div className="card">
          <div style={{fontSize:'2rem',fontWeight:700}}>{totalRevenue.toLocaleString('fr-FR')}</div>
          <div style={{fontSize:'0.85rem',color:'#aaa',marginTop:4}}>Revenus MAD</div>
        </div>
      </div>

      {/* Client cards */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {allClients.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',color:'#aaa',fontSize:'0.85rem',background:'#fff',borderRadius:16,border:'1px solid #eee'}}>
            Aucun client
          </div>
        )}
        {allClients.map(c => {
          const isBlocked = blockedClients.includes(c.key)
          const waPhone   = c.phone.replace(/\D/g,'')
          return (
            <div key={c.key} onClick={() => setSelectedClient(c.key)}
              style={{background: isBlocked ? '#fff8f8' : '#fff',
                border: `1px solid ${isBlocked ? '#fcd4d4' : '#eee'}`,
                borderRadius:16, padding:'14px 20px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:14,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <div style={{width:44,height:44,borderRadius:'50%',
                background: isBlocked ? '#EB5757' : '#C17B4E',
                color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:800,fontSize:'1rem',flexShrink:0}}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'0.92rem',display:'flex',alignItems:'center',gap:6}}>
                  {c.name}
                  {isBlocked && <span style={{fontSize:'0.65rem',background:'#EB5757',color:'#fff',padding:'1px 6px',borderRadius:6,fontWeight:600}}>Bloqué</span>}
                </div>
                {c.phone
                  ? <div style={{fontSize:'0.78rem',color:'#555',marginTop:2}}>📞 {c.phone}</div>
                  : <div style={{fontSize:'0.75rem',color:'#ccc',marginTop:2}}>Aucun numéro</div>
                }
                <div style={{fontSize:'0.74rem',color:'#aaa',marginTop:2}}>
                  {c.rdvs.length} RDV{c.noShows > 0 ? ` · ${c.noShows} no-show` : ''} · dernier : {c.last}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                <div style={{fontWeight:700,color:'#C17B4E',fontSize:'0.88rem'}}>
                  {c.spent > 0 ? `${c.spent.toLocaleString('fr-FR')} MAD` : '—'}
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {waPhone && (
                    <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{fontSize:'0.72rem',background:'#25D366',color:'#fff',
                        padding:'3px 8px',borderRadius:20,textDecoration:'none',fontWeight:600}}>
                      💬 WA
                    </a>
                  )}
                  <span style={{fontSize:'0.72rem',color:'#bbb'}}>Voir fiche →</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Schedule ────────────────────────────────────────────────
// SCHED_KEYS order matches DB columns: di=0,lu=1,ma=2,me=3,je=4,ve=5,sa=6
const SCHED_KEYS  = ['di','lu','ma','me','je','ve','sa']
const SCHED_LABELS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
const BLOCK_TIMES: string[] = []
for(let h=6;h<=22;h++) for(let m=0;m<60;m+=30) BLOCK_TIMES.push(`${String(h).padStart(2,'0')}:${m===0?'00':'30'}`)

export function ProSchedule() {
  const [schedule, setSchedule]   = useState<any>({})
  const [blocks, setBlocks]       = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [saving, setSaving]       = useState(false)
  const [bForm, setBForm]         = useState({ label:'', date:'', start_time:'12:00', end_time:'14:00', staff_id:'' })

  const today = new Date().toISOString().split('T')[0]

  const load = () => {
    fetch('/api/schedule').then(r => r.json()).then(d => setSchedule(d && !d.error ? d : {}))
    fetch('/api/blocks').then(r => r.json()).then(d => setBlocks(Array.isArray(d) ? d : []))
    fetch('/api/staff').then(r => r.json()).then(d => setStaffList(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [])

  const saveSchedule = async () => {
    setSaving(true)
    await fetch('/api/schedule', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(schedule) })
    setSaving(false)
  }

  const saveBlock = async () => {
    if (!bForm.date) return
    await fetch('/api/blocks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(bForm) })
    setBForm(f => ({...f, label:'', date:'', staff_id:''}))
    load()
  }

  const delBlock = async (id: string) => {
    if (!confirm('Supprimer ce blocage ?')) return
    await fetch('/api/blocks', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    load()
  }

  const future = blocks.filter(b => b.date >= today).sort((a,b) => a.date.localeCompare(b.date))

  return (
    <div>
      <h1 className="serif" style={{fontSize:'2rem',marginBottom:32}}>Horaires & Blocages</h1>
      <div className="pro-schedule-grid" style={{display:'grid',gap:24,alignItems:'start'}}>
        {/* Schedule */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <h2 style={{fontWeight:600,fontSize:'1.1rem'}}>Heures d'ouverture</h2>
            <button onClick={saveSchedule} disabled={saving} className="btn btn-primary btn-sm"
              style={{opacity:saving?0.6:1}}>{saving?'Sauvegarde…':'Sauvegarder ✓'}</button>
          </div>
          {SCHED_KEYS.map((k, i) => {
            const isOpen = schedule[`${k}_open`] !== false
            const start  = schedule[`${k}_start`] || '09:00'
            const end    = schedule[`${k}_end`]   || '19:00'
            return (
              <div key={k} style={{display:'flex',alignItems:'center',gap:16,padding:'12px 0',borderBottom:'1px solid #f3f3f3'}}>
                <div style={{width:96,fontSize:'0.85rem',fontWeight:500}}>{SCHED_LABELS[i]}</div>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={isOpen}
                    onChange={e => setSchedule((s: any) => ({...s, [`${k}_open`]: e.target.checked}))} />
                  <span style={{fontSize:'0.75rem',fontWeight:500,color:isOpen?'#27AE60':'#aaa'}}>{isOpen?'Ouvert':'Fermé'}</span>
                </label>
                {isOpen && (
                  <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
                    <select className="form-control" style={{padding:'4px 8px',fontSize:'0.75rem',maxWidth:80}} value={start}
                      onChange={e => setSchedule((s: any) => ({...s,[`${k}_start`]:e.target.value}))}>
                      {BLOCK_TIMES.map(t=><option key={t}>{t}</option>)}
                    </select>
                    <span style={{color:'#aaa',fontSize:'0.75rem'}}>→</span>
                    <select className="form-control" style={{padding:'4px 8px',fontSize:'0.75rem',maxWidth:80}} value={end}
                      onChange={e => setSchedule((s: any) => ({...s,[`${k}_end`]:e.target.value}))}>
                      {BLOCK_TIMES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Add block */}
          <div className="card">
            <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>🔒 Verrouiller un créneau</h2>
            <div className="space-y-3">
              <div className="form-group" style={{marginBottom:0}}><label>Libellé</label><input className="form-control" placeholder="Pause déjeuner…" value={bForm.label} onChange={e=>setBForm(f=>({...f,label:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}><label>Date</label><input type="date" className="form-control" min={today} value={bForm.date} onChange={e=>setBForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="form-group" style={{marginBottom:0}}><label>Employé</label>
                  <select className="form-control" value={bForm.staff_id} onChange={e=>setBForm(f=>({...f,staff_id:e.target.value}))}>
                    <option value="">Tout le salon</option>
                    {staffList.map(st=><option key={st.id} value={st.id}>{st.firstname} {st.lastname}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}><label>Début</label>
                  <select className="form-control" value={bForm.start_time} onChange={e=>setBForm(f=>({...f,start_time:e.target.value}))}>
                    {BLOCK_TIMES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:0}}><label>Fin</label>
                  <select className="form-control" value={bForm.end_time} onChange={e=>setBForm(f=>({...f,end_time:e.target.value}))}>
                    {BLOCK_TIMES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveBlock} className="btn btn-primary btn-block" style={{marginTop:8}}>Verrouiller</button>
            </div>
          </div>

          {/* Future blocks */}
          <div className="card">
            <h2 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:16}}>
              Blocages à venir <span className="badge badge-gold" style={{marginLeft:8}}>{future.length}</span>
            </h2>
            {future.length === 0 && (
              <div style={{textAlign:'center',padding:'24px',color:'#aaa',fontSize:'0.82rem',border:'2px dashed #eee',borderRadius:12}}>Aucun blocage</div>
            )}
            {future.map(b => (
              <div key={b.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:12,background:'#fffbeb',borderRadius:12,border:'1px solid #fde68a',marginBottom:8}}>
                <div>
                  <div style={{fontSize:'0.85rem',fontWeight:600}}>{b.label} — {b.date}</div>
                  <div style={{fontSize:'0.75rem',color:'#666'}}>{b.start_time} → {b.end_time}{b.staff_id ? ` · ${staffList.find(s=>s.id===b.staff_id)?.firstname||''}` : ' · Tout le salon'}</div>
                </div>
                <button onClick={() => delBlock(b.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'1.1rem',color:'#EB5757'}}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mon Salon (settings) ────────────────────────────────────
export function ProSalonSettings({ salon, setSalon }: { salon: any; setSalon: (s:any)=>void }) {
  const [form, setForm] = useState({
    name: salon.name||'', city: salon.city||'', category: salon.category||'',
    address: salon.address||'', phone: salon.phone||'', email: salon.email||'',
    description: salon.description||'', whatsapp: salon.whatsapp||'',
    instagram: salon.instagram||'', pin: salon.pin||'',
  })
  const [saving, setSaving] = useState(false)
  const [ok, setOk]         = useState(false)

  const save = async () => {
    setSaving(true); setOk(false)
    const res = await fetch('/api/salons', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    const updated = await res.json()
    if (res.ok) { setSalon(updated); setOk(true); setTimeout(()=>setOk(false),2000) }
    setSaving(false)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f=>({...f,[k]:e.target.value}))

  return (
    <div style={{maxWidth:640,margin:'0 auto'}}>
      <h1 className="serif" style={{fontSize:'2rem',marginBottom:32}}>Mon salon</h1>
      <div className="card">
        <div className="space-y-4">
          <div className="form-group"><label>Nom du salon</label><input className="form-control" value={form.name} onChange={set('name')} /></div>
          <div className="form-row">
            <div className="form-group" style={{marginBottom:0}}><label>Ville</label>
              <select className="form-control" value={form.city} onChange={set('city')}>
                {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>Catégorie</label>
              <select className="form-control" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Adresse</label><input className="form-control" value={form.address} onChange={set('address')} /></div>
          <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={set('description')} style={{minHeight:80}} /></div>
          <div className="form-row">
            <div className="form-group" style={{marginBottom:0}}><label>Téléphone</label><input className="form-control" value={form.phone} onChange={set('phone')} /></div>
            <div className="form-group" style={{marginBottom:0}}><label>Email</label><input className="form-control" type="email" value={form.email} onChange={set('email')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{marginBottom:0}}><label>WhatsApp</label><input className="form-control" value={form.whatsapp} onChange={set('whatsapp')} /></div>
            <div className="form-group" style={{marginBottom:0}}><label>Instagram</label><input className="form-control" placeholder="@monsalon" value={form.instagram} onChange={set('instagram')} /></div>
          </div>
          <div className="form-group"><label>Code PIN (4 chiffres)</label><input className="form-control" maxLength={4} placeholder="0000" value={form.pin} onChange={set('pin')} /></div>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-block" style={{opacity:saving?0.6:1}}>
            {ok ? '✓ Sauvegardé !' : saving ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile (personal info only) ────────────────────────────
export function ProProfile({ salon, setSalon }: { salon: any; setSalon: (s:any)=>void }) {
  const [form, setForm] = useState({ firstname:'', lastname:'', phone:'', password:'' })
  const [saving, setSaving] = useState(false)
  const [ok, setOk]         = useState(false)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const sb = createClient()
      sb.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return
        const { data: p } = await sb.from('profiles').select('firstname,lastname,phone').eq('id', user.id).single()
        if (p) setForm(f => ({ ...f, firstname:p.firstname||'', lastname:p.lastname||'', phone:p.phone||'' }))
      })
    })
  }, [])

  const save = async () => {
    setSaving(true); setOk(false)
    const body: any = { firstname:form.firstname, lastname:form.lastname, phone:form.phone }
    if (form.password) body.password = form.password
    await fetch('/api/users/me', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    setSaving(false); setOk(true); setTimeout(()=>setOk(false),2000)
  }

  return (
    <div style={{maxWidth:480,margin:'0 auto'}}>
      <h1 className="serif" style={{fontSize:'2rem',marginBottom:32}}>Mon profil</h1>
      <div className="card">
        <div className="space-y-4">
          <div className="form-row">
            <div className="form-group" style={{marginBottom:0}}><label>Prénom</label><input className="form-control" value={form.firstname} onChange={e=>setForm(f=>({...f,firstname:e.target.value}))} /></div>
            <div className="form-group" style={{marginBottom:0}}><label>Nom</label><input className="form-control" value={form.lastname} onChange={e=>setForm(f=>({...f,lastname:e.target.value}))} /></div>
          </div>
          <div className="form-group"><label>Téléphone</label><input className="form-control" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
          <div className="form-group"><label>Nouveau mot de passe</label><input className="form-control" type="password" placeholder="Laisser vide pour ne pas changer" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-block" style={{opacity:saving?0.6:1}}>
            {ok ? '✓ Sauvegardé !' : saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
