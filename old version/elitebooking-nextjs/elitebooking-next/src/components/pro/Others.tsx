'use client'
import { useState, useEffect } from 'react'

// ─── RDV List ───────────────────────────────────────────────
export function ProRdvList({ salonId }: { salonId: string }) {
  const [rdvs, setRdvs] = useState<any[]>([])
  const [filter, setFilter] = useState('confirmed')

  useEffect(() => {
    fetch(`/api/rdv?salonId=${salonId}`).then(r=>r.json()).then(setRdvs)
  }, [salonId])

  const filtered = rdvs.filter(r => filter === 'all' || r.status === filter)
    .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))

  return (
    <div>
      <h1 className="font-serif text-3xl mb-6">Rendez-vous</h1>
      <div className="flex gap-2 mb-6">
        {['all','confirmed','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter===f?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-gray-900'}`}>
            {f==='all'?'Tous':f==='confirmed'?'Confirmés':'Annulés'}
          </button>
        ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Client','Prestation','Employé','Date','Heure','Prix','Statut'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">{r.clientName || 'Client'}</td>
                <td className="px-4 py-3 text-sm">{r.serviceName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.staffName}</td>
                <td className="px-4 py-3 text-sm">{r.date}</td>
                <td className="px-4 py-3 text-sm">{r.time}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#C17B4E]">{r.price} MAD</td>
                <td className="px-4 py-3">
                  <span className={r.status==='confirmed'?'badge-green':r.status==='cancelled'?'badge-red':'badge-grey'}>
                    {r.status==='confirmed'?'Confirmé':r.status==='cancelled'?'Annulé':'Passé'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Aucun rendez-vous</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Services ───────────────────────────────────────────────
export function ProServices({ salonId }: { salonId: string }) {
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name:'',price:'',duration:'',desc:'',staffIds:[] as string[] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/services/${salonId}`).then(r=>r.json()).then(setServices)
    fetch(`/api/staff/${salonId}`).then(r=>r.json()).then(setStaff)
  }, [salonId])

  const openForm = (svc?: any) => {
    if (svc) { setEditing(svc); setForm({ name:svc.name, price:svc.price, duration:svc.duration, desc:svc.desc||'', staffIds:svc.staffIds||[] }) }
    else { setEditing({}); setForm({ name:'',price:'',duration:'',desc:'',staffIds:[] }) }
  }

  const save = async () => {
    setSaving(true)
    const method = editing?._id ? 'PUT' : 'POST'
    const body = { ...form, _id: editing?._id, price: +form.price, duration: +form.duration }
    const res = await fetch(`/api/services/${salonId}`, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const updated = await res.json()
    if (editing?._id) setServices(prev => prev.map(s => s._id===updated._id ? updated : s))
    else setServices(prev => [...prev, updated])
    setSaving(false); setEditing(null)
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ?')) return
    await fetch(`/api/services/${salonId}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) })
    setServices(prev => prev.filter(s => s._id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl">Prestations</h1>
        <button onClick={() => openForm()} className="btn-primary">+ Ajouter</button>
      </div>

      <div className="space-y-3">
        {services.map(s => (
          <div key={s._id} className="card flex items-center justify-between">
            <div>
              <div className="font-semibold">{s.name}</div>
              {s.desc && <div className="text-sm text-gray-400 mt-0.5">{s.desc}</div>}
              <div className="text-xs text-gray-400 mt-1">⏱ {s.duration} min · {s.staffIds?.length ? `${s.staffIds.length} employé(s)` : 'Tous les employés'}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-[#C17B4E]">{s.price} MAD</span>
              <button onClick={() => openForm(s)} className="text-sm text-gray-400 hover:text-gray-700">Modifier</button>
              <button onClick={() => remove(s._id)} className="text-sm text-red-400 hover:text-red-600">Supprimer</button>
            </div>
          </div>
        ))}
        {services.length===0 && <div className="card text-center py-10 text-gray-400">Aucune prestation. Ajoutez-en une !</div>}
      </div>

      {/* Modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <h2 className="font-serif text-2xl mb-6">{editing._id ? 'Modifier' : 'Ajouter'} une prestation</h2>
            <div className="space-y-4">
              <div><label className="text-xs font-medium text-gray-500">Nom *</label><input className="input mt-1" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Prix (MAD) *</label><input className="input mt-1" type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
                <div><label className="text-xs font-medium text-gray-500">Durée (min) *</label><input className="input mt-1" type="number" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-500">Description</label><input className="input mt-1" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} /></div>
              {staff.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Employés habilités (vide = tous)</label>
                  <div className="mt-2 space-y-2">
                    {staff.map(st => (
                      <label key={st._id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-gray-400">
                        <input type="checkbox" checked={form.staffIds.includes(st._id)}
                          onChange={e => setForm(f => ({...f, staffIds: e.target.checked ? [...f.staffIds,st._id] : f.staffIds.filter(id=>id!==st._id)}))}
                          className="w-4 h-4 accent-gray-900" />
                        <div className="w-7 h-7 rounded-full bg-[#C17B4E] text-white text-xs flex items-center justify-center font-bold">{st.firstname[0]}{st.lastname[0]}</div>
                        <div><div className="text-sm font-medium">{st.firstname} {st.lastname}</div><div className="text-xs text-gray-400">{st.role}</div></div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff ──────────────────────────────────────────────────
const DAY_OPTIONS = ['Lu','Ma','Me','Je','Ve','Sa','Di']

export function ProStaff({ salonId }: { salonId: string }) {
  const [staff, setStaff] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ firstname:'',lastname:'',role:'',phone:'',days:['Lu','Ma','Me','Je','Ve'],start:'09:00',end:'19:00' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch(`/api/staff/${salonId}`).then(r=>r.json()).then(setStaff) }, [salonId])

  const openForm = (st?: any) => {
    if (st) { setEditing(st); setForm({ firstname:st.firstname,lastname:st.lastname,role:st.role,phone:st.phone||'',days:st.days||['Lu','Ma','Me','Je','Ve'],start:st.start||'09:00',end:st.end||'19:00' }) }
    else { setEditing({}); setForm({ firstname:'',lastname:'',role:'',phone:'',days:['Lu','Ma','Me','Je','Ve'],start:'09:00',end:'19:00' }) }
  }

  const save = async () => {
    setSaving(true)
    const method = editing?._id ? 'PUT' : 'POST'
    const body = { ...form, _id: editing?._id }
    const res = await fetch(`/api/staff/${salonId}`, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const updated = await res.json()
    if (editing?._id) setStaff(prev => prev.map(s => s._id===updated._id ? updated : s))
    else setStaff(prev => [...prev, updated])
    setSaving(false); setEditing(null)
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ?')) return
    await fetch(`/api/staff/${salonId}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) })
    setStaff(prev => prev.filter(s => s._id !== id))
  }

  const TIME_OPTIONS: string[] = []
  for(let h=7;h<=21;h++) for(let m=0;m<60;m+=30) TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:${m===0?'00':'30'}`)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl">Employés</h1>
        <button onClick={() => openForm()} className="btn-primary">+ Ajouter</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {staff.map(st => (
          <div key={st._id} className="card text-center">
            <div className="w-14 h-14 rounded-full bg-[#C17B4E] text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">
              {st.firstname[0]}{st.lastname[0]}
            </div>
            <div className="font-semibold">{st.firstname} {st.lastname}</div>
            <div className="text-sm text-gray-400 mt-0.5">{st.role}</div>
            <div className="text-xs text-gray-300 mt-1">{st.days?.join(', ')}</div>
            <div className="text-xs text-gray-400 mt-0.5">{st.start} – {st.end}</div>
            <div className="flex gap-2 mt-4 justify-center">
              <button onClick={() => openForm(st)} className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1 border border-gray-200 rounded-lg">Modifier</button>
              <button onClick={() => remove(st._id)} className="text-xs text-red-400 hover:text-red-600 px-3 py-1 border border-red-100 rounded-lg">Supprimer</button>
            </div>
          </div>
        ))}
        {staff.length===0 && <div className="col-span-3 card text-center py-10 text-gray-400">Aucun employé</div>}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="font-serif text-2xl mb-6">{editing._id ? 'Modifier' : 'Ajouter'} un employé</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Prénom *</label><input className="input mt-1" value={form.firstname} onChange={e=>setForm(f=>({...f,firstname:e.target.value}))} /></div>
                <div><label className="text-xs font-medium text-gray-500">Nom *</label><input className="input mt-1" value={form.lastname} onChange={e=>setForm(f=>({...f,lastname:e.target.value}))} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-500">Rôle *</label><input className="input mt-1" placeholder="Coiffeuse, Masseuse…" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500">Téléphone</label><input className="input mt-1" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div>
                <label className="text-xs font-medium text-gray-500">Jours de travail</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DAY_OPTIONS.map(d => (
                    <button key={d} type="button"
                      onClick={() => setForm(f => ({...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days,d]}))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${form.days.includes(d)?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Arrivée</label>
                  <select className="input mt-1" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}>
                    {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Départ</label>
                  <select className="input mt-1" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}>
                    {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving?'Sauvegarde…':'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Clients ────────────────────────────────────────────────
export function ProClients({ salonId }: { salonId: string }) {
  const [rdvs, setRdvs] = useState<any[]>([])
  const [q, setQ] = useState('')

  useEffect(() => { fetch(`/api/rdv?salonId=${salonId}`).then(r=>r.json()).then(setRdvs) }, [salonId])

  const clientMap: Record<string, any> = {}
  rdvs.filter(r => r.status !== 'cancelled').forEach(r => {
    const key = r.clientId === 'pro-add' ? `pa_${r.clientName}` : r.clientId
    if (!clientMap[key]) clientMap[key] = { name: r.clientName||'Client', phone: r.clientPhone||'', rdvs: [], spent: 0, last: '' }
    clientMap[key].rdvs.push(r)
    clientMap[key].spent += r.price || 0
    if (r.date > clientMap[key].last) clientMap[key].last = r.date
  })

  const clients = Object.values(clientMap)
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => b.last.localeCompare(a.last))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl">Clients</h1>
        <input value={q} onChange={e=>setQ(e.target.value)} className="input max-w-56" placeholder="🔍 Rechercher…" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card"><div className="text-3xl font-bold">{clients.length}</div><div className="text-sm text-gray-400 mt-1">Clients uniques</div></div>
        <div className="card"><div className="text-3xl font-bold">{rdvs.filter(r=>r.status!=='cancelled').length}</div><div className="text-sm text-gray-400 mt-1">Total RDV</div></div>
        <div className="card"><div className="text-3xl font-bold">{clients.reduce((a,c)=>a+c.spent,0).toLocaleString('fr-FR')}</div><div className="text-sm text-gray-400 mt-1">Revenus MAD</div></div>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Client','Téléphone','RDV','Dépensé','Dernière visite'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map((c,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3"><div className="font-medium text-sm">{c.name}</div></td>
                <td className="px-4 py-3 text-sm text-gray-400">{c.phone||'—'}</td>
                <td className="px-4 py-3 text-sm font-semibold">{c.rdvs.length}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#C17B4E]">{c.spent.toLocaleString('fr-FR')} MAD</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.last}</td>
              </tr>
            ))}
            {clients.length===0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Aucun client</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Schedule ────────────────────────────────────────────────
const FULL_DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
const DAY_KEYS2 = ['Lu','Ma','Me','Je','Ve','Sa','Di']

export function ProSchedule({ salonId }: { salonId: string }) {
  const [schedule, setSchedule] = useState<any>({})
  const [blocks, setBlocks]   = useState<any[]>([])
  const [saving, setSaving]   = useState(false)
  const [bForm, setBForm]     = useState({ label:'',date:'',start:'12:00',end:'14:00',staff:'' })
  const [staffList, setStaffList] = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch(`/api/schedule/${salonId}`).then(r=>r.json()).then(d => setSchedule(d.days||{}))
    fetch(`/api/blocks/${salonId}`).then(r=>r.json()).then(setBlocks)
    fetch(`/api/staff/${salonId}`).then(r=>r.json()).then(setStaffList)
  }, [salonId])

  const saveSchedule = async () => {
    setSaving(true)
    await fetch(`/api/schedule/${salonId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({days:schedule}) })
    setSaving(false)
  }

  const saveBlock = async () => {
    if (!bForm.date) return
    const res = await fetch(`/api/blocks/${salonId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(bForm) })
    const blk = await res.json()
    setBlocks(prev => [...prev, blk])
    setBForm(f => ({...f, label:'', staff:''}))
  }

  const delBlock = async (id: string) => {
    if (!confirm('Supprimer ce blocage ?')) return
    await fetch(`/api/blocks/${salonId}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) })
    setBlocks(prev => prev.filter(b => b._id !== id))
  }

  const TIME_OPTIONS: string[] = []
  for(let h=6;h<=22;h++) for(let m=0;m<60;m+=30) TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:${m===0?'00':'30'}`)

  const future = blocks.filter(b => b.date >= today).sort((a,b) => a.date.localeCompare(b.date))

  return (
    <div>
      <h1 className="font-serif text-3xl mb-8">Horaires & Blocages</h1>
      <div className="grid grid-cols-2 gap-6 items-start">
        {/* Schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Heures d'ouverture</h2>
            <button onClick={saveSchedule} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving?'Sauvegarde…':'Sauvegarder ✓'}
            </button>
          </div>
          {DAY_KEYS2.map((k,i) => {
            const d = schedule[k] || { open: true, start:'09:00', end:'19:00' }
            return (
              <div key={k} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className="w-24 text-sm font-medium">{FULL_DAYS[i]}</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={d.open}
                    onChange={e => setSchedule((s:any) => ({...s, [k]: {...d, open: e.target.checked}}))}
                    className="w-4 h-4 accent-gray-900" />
                  <span className={`text-xs font-medium ${d.open?'text-green-500':'text-gray-400'}`}>{d.open?'Ouvert':'Fermé'}</span>
                </label>
                {d.open && (
                  <div className="flex items-center gap-2 ml-auto">
                    <select className="input py-1 text-xs max-w-20" value={d.start}
                      onChange={e => setSchedule((s:any) => ({...s,[k]:{...d,start:e.target.value}}))}>
                      {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-400 text-xs">→</span>
                    <select className="input py-1 text-xs max-w-20" value={d.end}
                      onChange={e => setSchedule((s:any) => ({...s,[k]:{...d,end:e.target.value}}))}>
                      {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Blocks */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">🔒 Verrouiller un créneau</h2>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500">Libellé</label><input className="input mt-1" placeholder="Pause déjeuner, Réunion…" value={bForm.label} onChange={e=>setBForm(f=>({...f,label:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Date</label><input type="date" className="input mt-1" min={today} value={bForm.date} onChange={e=>setBForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label className="text-xs font-medium text-gray-500">Employé</label>
                  <select className="input mt-1" value={bForm.staff} onChange={e=>setBForm(f=>({...f,staff:e.target.value}))}>
                    <option value="">Tout le salon</option>
                    {staffList.map(st=><option key={st._id} value={`${st.firstname} ${st.lastname}`}>{st.firstname} {st.lastname}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Début</label>
                  <select className="input mt-1" value={bForm.start} onChange={e=>setBForm(f=>({...f,start:e.target.value}))}>
                    {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Fin</label>
                  <select className="input mt-1" value={bForm.end} onChange={e=>setBForm(f=>({...f,end:e.target.value}))}>
                    {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveBlock} className="btn-primary w-full mt-2">Verrouiller</button>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Blocages à venir <span className="badge-gold ml-2">{future.length}</span></h2>
            {future.length===0 && <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">Aucun blocage</div>}
            {future.map(b => (
              <div key={b._id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100 mb-2">
                <div>
                  <div className="text-sm font-semibold">{b.label} — {b.date}</div>
                  <div className="text-xs text-gray-500">{b.start} → {b.end}{b.staff ? ` · ${b.staff}` : ' · Tout le salon'}</div>
                </div>
                <button onClick={() => delBlock(b._id)} className="text-red-400 hover:text-red-600 text-lg">🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile ────────────────────────────────────────────────
export function ProProfile({ salon, setSalon }: { salon: any; setSalon: (s:any)=>void }) {
  const [form, setForm] = useState({ firstname:'', lastname:'', email:'', phone:'', password:'' })
  const [salonForm, setSalonForm] = useState({ name:salon.name, category:salon.category, city:salon.city, address:salon.address||'', description:salon.description||'', phone:salon.phone||'' })
  const [saving, setSaving] = useState(false)
  const [savingS, setSavingS] = useState(false)

  useEffect(() => {
    fetch('/api/users/me').then(r=>r.json()).then(u => setForm({ firstname:u.firstname, lastname:u.lastname, email:u.email, phone:u.phone||'', password:'' }))
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const body: any = { firstname:form.firstname, lastname:form.lastname, email:form.email, phone:form.phone }
    if (form.password) body.password = form.password
    await fetch('/api/users/me', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    setSaving(false)
  }

  const saveSalon = async () => {
    setSavingS(true)
    const res = await fetch(`/api/salons/${salon._id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(salonForm) })
    const updated = await res.json()
    setSalon(updated)
    setSavingS(false)
  }

  return (
    <div>
      <h1 className="font-serif text-3xl mb-8">Mon profil</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Informations personnelles</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-500">Prénom</label><input className="input mt-1" value={form.firstname} onChange={e=>setForm(f=>({...f,firstname:e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500">Nom</label><input className="input mt-1" value={form.lastname} onChange={e=>setForm(f=>({...f,lastname:e.target.value}))} /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-500">Email</label><input className="input mt-1" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><label className="text-xs font-medium text-gray-500">Téléphone</label><input className="input mt-1" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
            <div><label className="text-xs font-medium text-gray-500">Nouveau mot de passe</label><input className="input mt-1" type="password" placeholder="Laisser vide pour ne pas changer" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
            <button onClick={saveProfile} disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving?'Sauvegarde…':'Sauvegarder'}</button>
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Mon salon</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-gray-500">Nom du salon</label><input className="input mt-1" value={salonForm.name} onChange={e=>setSalonForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-500">Catégorie</label>
                <select className="input mt-1" value={salonForm.category} onChange={e=>setSalonForm(f=>({...f,category:e.target.value}))}>
                  {['Coiffure','Hammam','Spa','Onglerie','Barbier','Institut beauté','Bien-être','Esthétique'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500">Ville</label>
                <select className="input mt-1" value={salonForm.city} onChange={e=>setSalonForm(f=>({...f,city:e.target.value}))}>
                  {['Casablanca','Rabat','Marrakech','Fès','Tanger','Agadir','Meknès'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-gray-500">Adresse</label><input className="input mt-1" value={salonForm.address} onChange={e=>setSalonForm(f=>({...f,address:e.target.value}))} /></div>
            <div><label className="text-xs font-medium text-gray-500">Téléphone</label><input className="input mt-1" value={salonForm.phone} onChange={e=>setSalonForm(f=>({...f,phone:e.target.value}))} /></div>
            <div><label className="text-xs font-medium text-gray-500">Description</label><textarea className="input mt-1 h-20 resize-none" value={salonForm.description} onChange={e=>setSalonForm(f=>({...f,description:e.target.value}))} /></div>
            <button onClick={saveSalon} disabled={savingS} className="btn-primary w-full disabled:opacity-50">{savingS?'Sauvegarde…':'Sauvegarder'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
