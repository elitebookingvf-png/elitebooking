'use client'
import { useState, useEffect } from 'react'
import { toISO, tMin, dayKeyForISO, formatPrice } from '@/lib/utils'

type View = 'day' | 'staff' | 'week' | 'month'

function RdvDetailModal({ rdv, onClose, onStatusChange, pin }: {
  rdv: any; onClose: () => void; onStatusChange: (id: string, status: string) => void; pin: string
}) {
  const [saving, setSaving]             = useState(false)
  const [pinPrompt, setPinPrompt]       = useState<string|null>(null)
  const [pinEntry, setPinEntry]         = useState('')
  const [pinError, setPinError]         = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string|null>(null)
  const [waModal, setWaModal]           = useState(false)
  const [waMsg, setWaMsg]               = useState(`Bonjour ${rdv.client_name}, votre RDV du ${rdv.date} a ${rdv.start_time} pour ${rdv.service_name}.`)
  const waPhone = (rdv.client_phone || '').replace(/\D/g,'')
  const statusColor: Record<string,string> = { confirmed:'#27AE60', completed:'#3B82F6', cancelled:'#EB5757', 'no-show':'#F59E0B' }
  const statusLabel: Record<string,string> = { confirmed:'Confirme', completed:'Termine', cancelled:'Annule', 'no-show':'Pas venu' }
  async function doSetStatus(status: string) {
    setSaving(true)
    await fetch(`/api/rdv/${rdv.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    onStatusChange(rdv.id, status); setSaving(false); onClose()
  }
  function requirePin(label: string, status: string) {
    setPendingStatus(status); setPinPrompt(label); setPinEntry(''); setPinError(false)
  }
  function confirmPin() {
    if (pinEntry === pin) { setPinPrompt(null); doSetStatus(pendingStatus!) }
    else { setPinError(true); setPinEntry('') }
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      {waModal && (
        <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{fontWeight:700,fontSize:'1rem'}}>Message WhatsApp</h3>
            <button onClick={() => setWaModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:'1.2rem'}}>x</button>
          </div>
          <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)}
            style={{width:'100%',minHeight:100,borderRadius:10,border:'1px solid #eee',padding:10,fontSize:'0.85rem',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}} />
          <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
            onClick={() => setWaModal(false)}
            style={{display:'block',textAlign:'center',marginTop:12,background:'#25D366',color:'#fff',borderRadius:12,padding:'10px',fontWeight:700,fontSize:'0.88rem',textDecoration:'none'}}>
            Envoyer via WhatsApp
          </a>
        </div>
      )}
      {pinPrompt && !waModal && (
        <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:340,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',textAlign:'center'}}>
          <div style={{fontSize:'1.8rem',marginBottom:8}}>🔐</div>
          <div style={{fontWeight:700,marginBottom:4}}>{pinPrompt}</div>
          <div style={{fontSize:'0.8rem',color:'#aaa',marginBottom:16}}>Entrez le code PIN pour confirmer</div>
          <input type="password" maxLength={4} value={pinEntry} onChange={e => setPinEntry(e.target.value)}
            onKeyDown={e => e.key==='Enter' && confirmPin()} autoFocus
            style={{width:'100%',textAlign:'center',letterSpacing:'0.3em',fontSize:'1.5rem',padding:'10px',borderRadius:10,
              border:`2px solid ${pinError?'#eb5757':'#eee'}`,outline:'none',marginBottom:8,boxSizing:'border-box'}} />
          {pinError && <div style={{color:'#eb5757',fontSize:'0.8rem',marginBottom:8}}>Code incorrect</div>}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={() => setPinPrompt(null)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #eee',background:'#f7f7f7',cursor:'pointer',fontWeight:600}}>Annuler</button>
            <button onClick={confirmPin} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#111',color:'#fff',cursor:'pointer',fontWeight:700}}>Confirmer</button>
          </div>
        </div>
      )}
      {!pinPrompt && !waModal && (
        <div style={{background:'#fff',borderRadius:20,padding:32,width:'100%',maxWidth:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <h2 className="serif" style={{fontSize:'1.3rem'}}>Detail du RDV</h2>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'#aaa'}}>x</button>
          </div>
          <div style={{display:'inline-block',background:statusColor[rdv.status]||'#ccc',color:'#fff',borderRadius:20,padding:'4px 12px',fontSize:'0.75rem',fontWeight:700,marginBottom:16}}>
            {statusLabel[rdv.status]||rdv.status}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:'1.1rem'}}>�</span>
              <div><div style={{fontWeight:600}}>{rdv.date} a {rdv.start_time}</div><div style={{fontSize:'0.78rem',color:'#aaa'}}>{rdv.duration} min</div></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:'1.1rem'}}>✂</span>
              <div><div style={{fontWeight:600}}>{rdv.service_name}</div><div style={{fontSize:'0.78rem',color:'#C17B4E',fontWeight:700}}>{formatPrice(rdv.price, rdv.price_type)}</div></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:'1.1rem'}}>👤</span>
              <div>
                <div style={{fontWeight:600}}>{rdv.client_name || 'Client'}</div>
                {rdv.client_phone && <div style={{fontSize:'0.82rem',color:'#666',marginTop:2}}>📞 {rdv.client_phone}</div>}
                {rdv.staff_name && <div style={{fontSize:'0.78rem',color:'#aaa',marginTop:2}}>Employe : {rdv.staff_name}</div>}
              </div>
            </div>
            {rdv.notes && <div style={{background:'#f7f7f7',borderRadius:10,padding:'10px 14px',fontSize:'0.82rem',color:'#555'}}>📝 {rdv.notes}</div>}
          </div>
          {waPhone && (
            <button onClick={() => setWaModal(true)}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'#25D366',color:'#fff',
                borderRadius:12,padding:'10px 16px',marginBottom:16,fontSize:'0.88rem',fontWeight:600,border:'none',cursor:'pointer',width:'100%'}}>
              💬 Envoyer un message WhatsApp
            </button>
          )}
          {rdv.status === 'confirmed' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button disabled={saving} onClick={() => doSetStatus('completed')}
                style={{padding:'10px',borderRadius:12,border:'2px solid #3B82F6',background:'#EFF6FF',color:'#3B82F6',fontWeight:700,cursor:'pointer',fontSize:'0.85rem'}}>
                ✅ Venu
              </button>
              <button disabled={saving} onClick={() => requirePin('Marquer pas venu', 'no-show')}
                style={{padding:'10px',borderRadius:12,border:'2px solid #F59E0B',background:'#FFFBEB',color:'#F59E0B',fontWeight:700,cursor:'pointer',fontSize:'0.85rem'}}>
                ❌ Pas venu
              </button>
              <button disabled={saving} onClick={() => requirePin('Annuler ce rendez-vous', 'cancelled')}
                style={{padding:'10px',borderRadius:12,border:'2px solid #EB5757',background:'#FEF2F2',color:'#EB5757',fontWeight:700,cursor:'pointer',fontSize:'0.85rem',gridColumn:'span 2'}}>
                🚫 Annuler le RDV
              </button>
            </div>
          )}
          {rdv.status !== 'confirmed' && (
            <button disabled={saving} onClick={() => doSetStatus('confirmed')}
              style={{width:'100%',padding:'10px',borderRadius:12,border:'2px solid #27AE60',background:'#F0FDF4',color:'#27AE60',fontWeight:700,cursor:'pointer',fontSize:'0.85rem'}}>
              Remettre en confirme
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AddRdvModal({ staff, services, salonId, onClose, onSaved, defaultDate, defaultTime, defaultStaffId }: {
  staff: any[]; services: any[]; salonId: string; onClose: () => void; onSaved: () => void
  defaultDate?: string; defaultTime?: string; defaultStaffId?: string
}) {
  const today = toISO(new Date())
  const [form, setForm] = useState({
    client_name: '', client_phone: '', service_id: '', staff_id: defaultStaffId || 'any',
    date: defaultDate || today, start_time: defaultTime || '', notes: '', status: 'confirmed'
  })
  const [slots, setSlots] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const selectedSvc = services.find(s => s.id === form.service_id)
  const eligibleStaff = selectedSvc?.staff_ids?.length
    ? staff.filter(s => selectedSvc.staff_ids.includes(s.id))
    : staff

  useEffect(() => {
    if (!form.service_id || !form.date) { setSlots([]); return }
    const resolvedStaffId = form.staff_id === 'any' ? (eligibleStaff[0]?.id || '') : form.staff_id
    if (!resolvedStaffId) { setSlots([]); return }
    const sp = new URLSearchParams({
      salonId, staffId: resolvedStaffId,
      serviceId: form.service_id, date: form.date,
    })
    fetch('/api/availability?' + sp).then(r => r.json()).then(d => setSlots(Array.isArray(d.slots) ? d.slots : []))
  }, [form.service_id, form.staff_id, form.date, salonId])

  async function save() {
    if (!form.client_name.trim()) { setErr('Nom du client requis'); return }
    if (!form.service_id) { setErr('Prestation requise'); return }
    if (!form.start_time) { setErr('Heure requise'); return }
    setSaving(true); setErr('')
    const staffId = form.staff_id === 'any' ? (eligibleStaff[0]?.id || null) : form.staff_id
    const res = await fetch('/api/rdv/pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: form.client_name, client_phone: form.client_phone || null,
        service_id: form.service_id, staff_id: staffId,
        date: form.date, start_time: form.start_time,
        notes: form.notes || null, status: form.status,
      }),
    })
    setSaving(false)
    if (res.ok) { onSaved(); onClose() }
    else { const d = await res.json(); setErr(d.error || 'Erreur') }
  }

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
            <input className="form-control" placeholder="Fatima Benali" value={form.client_name}
              onChange={e=>setForm(f=>({...f,client_name:e.target.value}))} />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Téléphone client</label>
            <input className="form-control" type="tel" placeholder="+212 6XX XXX XXX" value={form.client_phone}
              onChange={e=>setForm(f=>({...f,client_phone:e.target.value}))} />
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Prestation *</label>
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
            <label>Date *</label>
            <input type="date" className="form-control" min={today} value={form.date}
              onChange={e=>setForm(f=>({...f,date:e.target.value,start_time:''}))} />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label>Heure *</label>
            <select className="form-control" value={form.start_time}
              onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}>
              <option value="">— Choisir —</option>
              {slots.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {selectedSvc && form.start_time && (
          <div style={{background:'#f7f7f7',borderRadius:12,padding:'12px 16px',marginTop:16,fontSize:'0.85rem',color:'#555'}}>
            {selectedSvc.name} · {selectedSvc.duration} min · <strong style={{color:'#C17B4E'}}>{formatPrice(selectedSvc.price, selectedSvc.price_type)}</strong>
          </div>
        )}
        <div className="form-group" style={{marginTop:16}}>
          <label>Notes internes (optionnel)</label>
          <textarea className="form-control" placeholder="Préférences, allergies, rappels…" value={form.notes}
            onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{minHeight:64}} />
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

export function ProAgenda({ salon }: { salon: any }) {
  const [view, setView]         = useState<View>('staff')
  const [date, setDate]         = useState(new Date())
  const [rdvs, setRdvs]         = useState<any[]>([])
  const [staff, setStaff]       = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>(null)
  const [blocks, setBlocks]     = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [showAddRdv, setShowAddRdv] = useState(false)
  const [addRdvDate, setAddRdvDate] = useState<string | undefined>()
  const [addRdvTime, setAddRdvTime] = useState<string | undefined>()
  const [addRdvStaffId, setAddRdvStaffId] = useState<string | undefined>()
  const [selectedRdv, setSelectedRdv] = useState<any>(null)
  const [pin, setPin] = useState('0000')

  const loadRdvs = () =>
    fetch('/api/rdv/pro').then(r => r.json()).then(d => setRdvs(Array.isArray(d) ? d : []))

  useEffect(() => {
    Promise.all([
      fetch('/api/rdv/pro').then(r => r.json()),
      fetch('/api/staff').then(r => r.json()),
      fetch('/api/schedule').then(r => r.json()),
      fetch('/api/blocks').then(r => r.json()),
      fetch('/api/services').then(r => r.json()),
      fetch('/api/users/me').then(r => r.json()),
    ]).then(([r, s, sc, b, sv, me]) => {
      if (me?.salon?.pin) setPin(me.salon.pin)
      setRdvs(Array.isArray(r) ? r : [])
      setStaff(Array.isArray(s) ? s : [])
      setSchedule(sc && !sc.error ? sc : null)
      setBlocks(Array.isArray(b) ? b : [])
      setServices(Array.isArray(sv.services) ? sv.services : [])
    })
    // already handled above in the spread
  }, [])

  const iso    = toISO(date)
  const dayKey = dayKeyForISO(iso).toLowerCase()
  const isOpen = schedule ? schedule[`${dayKey}_open`] !== false : true
  const dayStart = schedule?.[`${dayKey}_start`] || '09:00'
  const dayEnd   = schedule?.[`${dayKey}_end`]   || '19:00'
  const startHour = Math.floor(tMin(dayStart) / 60)
  const endHour   = Math.ceil(tMin(dayEnd) / 60)
  const HOURS = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  const navigate = (dir: number) => {
    const d = new Date(date)
    if (view === 'day' || view === 'staff') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setDate(d)
  }

  const periodLabel = () => {
    if (view === 'day' || view === 'staff')
      return date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    if (view === 'week') {
      const mon = new Date(date); const dd = mon.getDay(); mon.setDate(mon.getDate() + (dd===0?-6:1-dd))
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return `${mon.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${sun.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`
    }
    return date.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
  }

  function isBlocked(staffId: string | null, h: number) {
    return blocks.some(b => {
      if (b.date !== iso) return false
      const match = !b.staff_id || b.staff_id === staffId
      return match && tMin(b.start_time) <= h*60 && tMin(b.end_time) > h*60
    })
  }

  function staffWorksHour(st: any, h: number) {
    if (!isOpen) return false
    if (h*60 < tMin(dayStart)) return false
    if (h*60 >= tMin(dayEnd)) return false
    if (st.days?.length && !st.days.includes(dayKeyForISO(iso))) return false
    if (st.start_time && h*60 < tMin(st.start_time)) return false
    if (st.end_time   && h*60 >= tMin(st.end_time))  return false
    return true
  }

  return (
    <div>
      {selectedRdv && (
        <RdvDetailModal
          rdv={selectedRdv}
          pin={pin}
          onClose={() => setSelectedRdv(null)}
          onStatusChange={(id, status) => {
            setRdvs(prev => prev.map(r => r.id === id ? { ...r, status } : r))
            setSelectedRdv(null)
          }}
        />
      )}
      {showAddRdv && (
        <AddRdvModal
          staff={staff} services={services}
          salonId={salon.id}
          defaultDate={addRdvDate}
          defaultTime={addRdvTime}
          defaultStaffId={addRdvStaffId}
          onClose={() => setShowAddRdv(false)}
          onSaved={loadRdvs}
        />
      )}

      {/* Header */}
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:24}}>
        <h1 className="serif" style={{fontSize:'2rem'}}>Agenda</h1>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',background:'#f3f3f3',borderRadius:12,padding:4,gap:4}}>
            {(['day','staff','week','month'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{padding:'6px 14px',borderRadius:8,fontSize:'0.82rem',fontWeight:500,border:'none',cursor:'pointer',
                  background: view===v?'#fff':'transparent',
                  boxShadow: view===v?'0 1px 4px rgba(0,0,0,0.1)':'none',
                  color: view===v?'#111':'#888'}}>
                {v==='day'?'Jour':v==='staff'?'Employés':v==='week'?'Semaine':'Mois'}
              </button>
            ))}
          </div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{padding:'6px 12px'}}>‹</button>
          <span style={{fontSize:'0.85rem',fontWeight:500,minWidth:200,textAlign:'center',textTransform:'capitalize'}}>{periodLabel()}</span>
          <button onClick={() => navigate(1)} className="btn btn-secondary" style={{padding:'6px 12px'}}>›</button>
          <button onClick={() => setDate(new Date())} className="btn btn-secondary" style={{fontSize:'0.82rem'}}>Aujourd'hui</button>
          <button onClick={() => { setAddRdvDate(iso); setAddRdvTime(undefined); setAddRdvStaffId(undefined); setShowAddRdv(true) }} className="btn btn-primary" style={{fontSize:'0.82rem'}}>+ Ajouter un RDV</button>
        </div>
      </div>

      {/* Staff View */}
      {view === 'staff' && (
        <div style={{overflowX:'auto'}}>
          {!isOpen ? (
            <div className="card" style={{textAlign:'center',padding:'40px',color:'#aaa'}}>🔒 Salon fermé ce jour</div>
          ) : staff.length === 0 ? (
            <div className="card" style={{textAlign:'center',padding:'40px',color:'#aaa'}}>Aucun employé enregistré</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:80+staff.length*140}}>
              <thead>
                <tr style={{background:'#f7f7f7'}}>
                  <th style={{width:56,border:'1px solid #eee',padding:8,fontSize:'0.75rem',color:'#aaa'}}></th>
                  {staff.map(st => (
                    <th key={st.id} style={{border:'1px solid #eee',padding:12,minWidth:140}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{width:36,height:36,borderRadius:'50%',background:'#C17B4E',color:'#fff',
                          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'0.82rem'}}>
                          {st.firstname[0]}{st.lastname[0]}
                        </div>
                        <div style={{fontSize:'0.85rem',fontWeight:600}}>{st.firstname}</div>
                        <div style={{fontSize:'0.72rem',color:'#aaa'}}>{st.role}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(h => (
                  <tr key={h}>
                    <td style={{border:'1px solid #eee',padding:8,fontSize:'0.75rem',color:'#aaa',textAlign:'center',background:'#f7f7f7',fontWeight:500}}>
                      {String(h).padStart(2,'0')}:00
                    </td>
                    {staff.map(st => {
                      const works = staffWorksHour(st, h)
                      const blkd  = works && isBlocked(st.id, h)
                      const cellRdvs = rdvs.filter(r =>
                        r.staff_id === st.id && r.date === iso &&
                        r.start_time.startsWith(`${String(h).padStart(2,'0')}:`)
                      )
                      const clickable = works && !blkd
                      return (
                        <td key={st.id}
                          onClick={() => { if(clickable && !cellRdvs.length) { setAddRdvDate(iso); setAddRdvTime(`${String(h).padStart(2,'0')}:00`); setAddRdvStaffId(st.id); setShowAddRdv(true) } }}
                          style={{border:'1px solid #eee',padding:6,verticalAlign:'top',minHeight:56,
                            background: !works?'#f7f7f7':blkd?'#fffbeb':'#fff',
                            cursor: clickable && !cellRdvs.length ? 'pointer' : 'default'}}>
                          {cellRdvs.map(r => (
                            <div key={r.id} onClick={e => { e.stopPropagation(); setSelectedRdv(r) }}
                              style={{background: r.status==='completed'?'#3B82F6':r.status==='no-show'?'#F59E0B':r.status==='cancelled'?'#EB5757':'#27AE60',
                                color:'#fff',borderRadius:8,padding:'6px 8px',fontSize:'0.75rem',marginBottom:4,cursor:'pointer'}}>
                              <div style={{fontWeight:700}}>{r.start_time} {r.service_name?.substring(0,12)}</div>
                              <div style={{opacity:0.85}}>{r.client_name} · {r.duration}min</div>
                            </div>
                          ))}
                          {blkd && !cellRdvs.length && <div style={{fontSize:'0.72rem',color:'#f59e0b',padding:4}}>🔒 Bloqué</div>}
                          {!works && <div style={{fontSize:'0.72rem',color:'#ccc',padding:4}}>{isOpen?'Repos':'Fermé'}</div>}
                          {clickable && !cellRdvs.length && <div style={{fontSize:'0.65rem',color:'#ccc',textAlign:'center',marginTop:4}}>+ RDV</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Day view */}
      {view === 'day' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {!isOpen ? (
            <div style={{padding:40,textAlign:'center',color:'#aaa'}}>🔒 Salon fermé ce jour</div>
          ) : HOURS.map(h => {
            const hStr = String(h).padStart(2,'0')
            const dayRdvs = rdvs.filter(r => r.date===iso && r.start_time.startsWith(hStr+':') && r.status!=='cancelled')
            const blkd = blocks.some(b => b.date===iso && tMin(b.start_time)<=h*60 && tMin(b.end_time)>h*60)
            return (
              <div key={h} style={{display:'flex',borderBottom:'1px solid #f3f3f3',minHeight:56,background:blkd?'#fffbeb':'#fff'}}>
                <div style={{width:56,flexShrink:0,fontSize:'0.75rem',color:'#aaa',fontWeight:500,
                  display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:8,
                  borderRight:'1px solid #f3f3f3',background:'#f7f7f7'}}>
                  {hStr}:00
                </div>
                <div style={{flex:1,padding:8,display:'flex',flexWrap:'wrap',gap:8,cursor:!blkd&&!dayRdvs.length?'pointer':'default'}}
                  onClick={() => { if(!blkd && !dayRdvs.length) { setAddRdvDate(iso); setAddRdvTime(`${hStr}:00`); setAddRdvStaffId(undefined); setShowAddRdv(true) } }}>
                  {dayRdvs.map(r => (
                    <div key={r.id} onClick={e => { e.stopPropagation(); setSelectedRdv(r) }}
                      style={{background: r.status==='completed'?'#3B82F6':r.status==='no-show'?'#F59E0B':r.status==='cancelled'?'#EB5757':'#27AE60',
                        color:'#fff',borderRadius:8,padding:'6px 12px',fontSize:'0.78rem',cursor:'pointer'}}>
                      <div style={{fontWeight:700}}>{r.start_time} — {r.service_name}</div>
                      <div style={{opacity:0.85}}>{r.client_name} · {r.staff_name} · {formatPrice(r.price,r.price_type)}</div>
                    </div>
                  ))}
                  {blkd && <div style={{fontSize:'0.75rem',color:'#f59e0b',padding:4}}>🔒 Créneau bloqué</div>}
                  {!blkd && !dayRdvs.length && <div style={{fontSize:'0.72rem',color:'#ddd',padding:4,alignSelf:'center'}}>+ RDV</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (() => {
        const mon = new Date(date)
        const dd = mon.getDay(); mon.setDate(mon.getDate() + (dd===0?-6:1-dd)); mon.setHours(0,0,0,0)
        const cols = Array.from({length:7}, (_,i) => { const d = new Date(mon); d.setDate(mon.getDate()+i); return d })
        const DAY_LABELS = ['Lu','Ma','Me','Je','Ve','Sa','Di']
        const todayISO = toISO(new Date())
        return (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:56+cols.length*120}}>
              <thead>
                <tr style={{background:'#f7f7f7'}}>
                  <th style={{width:56,border:'1px solid #eee',padding:8,fontSize:'0.72rem',color:'#aaa'}}></th>
                  {cols.map((d,i) => {
                    const di = toISO(d)
                    const isT = di === todayISO
                    return (
                      <th key={di} style={{border:'1px solid #eee',padding:'8px 4px',minWidth:120}}>
                        <div style={{fontSize:'0.75rem',fontWeight:600,color:isT?'#C17B4E':'#555'}}>{DAY_LABELS[i]}</div>
                        <div style={{fontSize:'0.8rem',fontWeight:isT?700:400,color:isT?'#C17B4E':'#333'}}>{d.getDate()}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(h => (
                  <tr key={h}>
                    <td style={{border:'1px solid #eee',padding:8,fontSize:'0.72rem',color:'#aaa',textAlign:'center',background:'#f7f7f7',fontWeight:500}}>
                      {String(h).padStart(2,'0')}:00
                    </td>
                    {cols.map(d => {
                      const di = toISO(d)
                      const hStr = String(h).padStart(2,'0')
                      const dayRdvs = rdvs.filter(r => r.date===di && r.start_time.startsWith(hStr+':') && r.status!=='cancelled')
                      const blkd = blocks.some(b => b.date===di && tMin(b.start_time)<=h*60 && tMin(b.end_time)>h*60)
                      return (
                        <td key={di} style={{border:'1px solid #eee',padding:4,verticalAlign:'top',minHeight:48,background:blkd?'#fffbeb':'#fff'}}>
                          {dayRdvs.map(r => (
                            <div key={r.id} onClick={() => setSelectedRdv(r)}
                              style={{background: r.status==='completed'?'#3B82F6':r.status==='no-show'?'#F59E0B':r.status==='cancelled'?'#EB5757':'#27AE60',
                                color:'#fff',borderRadius:6,padding:'3px 6px',fontSize:'0.68rem',marginBottom:2,cursor:'pointer'}}>
                              <div style={{fontWeight:700}}>{r.start_time} {r.service_name?.substring(0,10)}</div>
                              <div style={{opacity:0.85}}>{r.client_name}</div>
                            </div>
                          ))}
                          {blkd && !dayRdvs.length && <div style={{fontSize:'0.65rem',color:'#f59e0b',padding:2}}>🔒</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:8}}>
            {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
              <div key={d} style={{textAlign:'center',fontSize:'0.75rem',fontWeight:600,color:'#aaa',padding:8}}>{d}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {(() => {
              const year=date.getFullYear(), month=date.getMonth()
              const fd=new Date(year,month,1).getDay()
              const dim=new Date(year,month+1,0).getDate()
              const offset=fd===0?6:fd-1
              const cells=[]
              for(let i=0;i<offset;i++) cells.push(<div key={`e${i}`} style={{minHeight:80,background:'#f7f7f7',borderRadius:12,opacity:0.3}}/>)
              for(let d=1;d<=dim;d++){
                const di=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const dr=rdvs.filter(r=>r.date===di&&r.status!=='cancelled')
                const isT=di===toISO(new Date())
                cells.push(
                  <div key={d}
                    style={{minHeight:80,borderRadius:12,padding:8,border:`1px solid ${isT?'#C17B4E':'#eee'}`,
                      background:isT?'#fdf8f4':'#fff',cursor:'pointer',transition:'all 0.15s'}}
                    onClick={()=>{setDate(new Date(di+'T12:00'));setView('day')}}>
                    <div style={{fontSize:'0.85rem',fontWeight:600,marginBottom:4,color:isT?'#C17B4E':'#333'}}>{d}</div>
                    {dr.slice(0,2).map(r=>(
                      <div key={r.id} style={{fontSize:'0.68rem',background:'#27AE60',color:'#fff',borderRadius:4,padding:'2px 4px',marginBottom:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                        {r.start_time} {r.service_name?.substring(0,8)}
                      </div>
                    ))}
                    {dr.length>2&&<div style={{fontSize:'0.68rem',color:'#aaa'}}>+{dr.length-2}</div>}
                  </div>
                )
              }
              return cells
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
