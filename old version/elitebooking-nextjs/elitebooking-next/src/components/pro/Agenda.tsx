'use client'
import { useState, useEffect } from 'react'

type View = 'day' | 'staff' | 'week' | 'month'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function tMin(t: string) { const [h,m]=(t||'00:00').split(':').map(Number); return h*60+m }

const DAY_KEYS = ['Di','Lu','Ma','Me','Je','Ve','Sa']
const HOURS = Array.from({length:12},(_,i)=>i+8) // 8-19

export function ProAgenda({ salonId, salon }: { salonId: string; salon: any }) {
  const [view, setView]         = useState<View>('staff')
  const [date, setDate]         = useState(new Date())
  const [rdvs, setRdvs]         = useState<any[]>([])
  const [staff, setStaff]       = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>({})
  const [blocks, setBlocks]     = useState<any[]>([])

  const fetchAll = () => {
    fetch(`/api/rdv?salonId=${salonId}`).then(r=>r.json()).then(setRdvs)
    fetch(`/api/staff/${salonId}`).then(r=>r.json()).then(setStaff)
    fetch(`/api/schedule/${salonId}`).then(r=>r.json()).then(d => setSchedule(d.days||{}))
    fetch(`/api/blocks/${salonId}`).then(r=>r.json()).then(setBlocks)
  }

  useEffect(() => { fetchAll() }, [salonId])

  const iso = toISO(date)
  const dow = date.getDay()
  const dayKey = DAY_KEYS[dow]
  const daySch = schedule[dayKey] || { open: true, start: '09:00', end: '19:00' }
  const openMin  = daySch.open ? tMin(daySch.start) : null
  const closeMin = daySch.open ? tMin(daySch.end)   : null

  function isBlocked(staffName: string, h: number) {
    return blocks.some(b => {
      if (b.date !== iso) return false
      const ms = !b.staff || b.staff === staffName
      return ms && tMin(b.start) <= h*60 && tMin(b.end) > h*60
    })
  }

  function staffWorksHour(st: any, h: number) {
    if (!daySch.open) return false
    if (openMin !== null && h*60 < openMin) return false
    if (closeMin !== null && h*60 >= closeMin) return false
    if (st.days?.length && !st.days.includes(dayKey)) return false
    if (st.start && h*60 < tMin(st.start)) return false
    if (st.end   && h*60 >= tMin(st.end))  return false
    return true
  }

  const navigate = (dir: number) => {
    const d = new Date(date)
    if (view === 'day' || view === 'staff') d.setDate(d.getDate()+dir)
    else if (view === 'week') d.setDate(d.getDate()+dir*7)
    else d.setMonth(d.getMonth()+dir)
    setDate(d)
  }

  const periodLabel = () => {
    if (view === 'day' || view === 'staff')
      return date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    if (view === 'week') {
      const mon = new Date(date); const dd=mon.getDay(); mon.setDate(mon.getDate()+(dd===0?-6:1-dd))
      const sun = new Date(mon); sun.setDate(mon.getDate()+6)
      return `${mon.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${sun.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`
    }
    return date.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-3xl">Agenda</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['day','staff','week','month'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${view===v?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
                {v==='day'?'Jour':v==='staff'?'Employés':v==='week'?'Semaine':'Mois'}
              </button>
            ))}
          </div>
          <button onClick={() => navigate(-1)} className="btn-secondary px-3 py-2">‹</button>
          <span className="text-sm font-medium min-w-48 text-center capitalize">{periodLabel()}</span>
          <button onClick={() => navigate(1)} className="btn-secondary px-3 py-2">›</button>
          <button onClick={() => setDate(new Date())} className="btn-secondary text-sm">Aujourd'hui</button>
        </div>
      </div>

      {/* Staff View */}
      {view === 'staff' && (
        <div className="overflow-x-auto">
          {!daySch.open ? (
            <div className="card text-center py-10 text-gray-400">🔒 Salon fermé ce jour</div>
          ) : staff.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">Aucun employé enregistré</div>
          ) : (
            <table className="w-full border-collapse border border-gray-200 rounded-xl overflow-hidden" style={{minWidth: 80+staff.length*140}}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-14 border border-gray-200 p-2 text-xs text-gray-400"></th>
                  {staff.map(st => {
                    const works = staffWorksHour(st, openMin ? Math.floor(openMin/60) : 9)
                    return (
                      <th key={st._id} className="border border-gray-200 p-3 min-w-36">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${works?'bg-[#C17B4E]':'bg-gray-300'}`}>
                            {st.firstname[0]}{st.lastname[0]}
                          </div>
                          <div className={`text-sm font-semibold ${works?'text-gray-900':'text-gray-400'}`}>{st.firstname}</div>
                          <div className="text-xs text-gray-400">{st.role}</div>
                          {st.start && <div className="text-xs text-gray-300">{st.start}–{st.end}</div>}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(h => (
                  <tr key={h} className="hover:bg-gray-50/50">
                    <td className="border border-gray-200 p-2 text-xs text-gray-400 font-medium text-center bg-gray-50">
                      {String(h).padStart(2,'0')}:00
                    </td>
                    {staff.map(st => {
                      const works = staffWorksHour(st, h)
                      const blkd  = works && isBlocked(`${st.firstname} ${st.lastname}`, h)
                      const cellRdvs = rdvs.filter(r => r.staffId===st._id && r.date===iso && r.time.startsWith(`${String(h).padStart(2,'0')}:`))
                      const bg = !works ? 'bg-gray-50' : blkd ? 'bg-amber-50' : ''
                      return (
                        <td key={st._id} className={`border border-gray-200 p-1.5 align-top min-h-14 ${bg}`}>
                          {cellRdvs.map(r => (
                            <div key={r._id} className="bg-green-500 text-white rounded-lg px-2 py-1.5 text-xs mb-1">
                              <div className="font-semibold">{r.time} {r.serviceName.substring(0,12)}</div>
                              <div className="opacity-80">{r.price} MAD · {r.duration}min</div>
                            </div>
                          ))}
                          {blkd && !cellRdvs.length && <div className="text-xs text-amber-500 p-1">🔒 Bloqué</div>}
                          {!works && <div className="text-xs text-gray-300 p-1">{daySch.open?'Repos':'Fermé'}</div>}
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
        <div className="card p-0 overflow-hidden">
          {!daySch.open ? (
            <div className="p-10 text-center text-gray-400">🔒 Salon fermé ce jour</div>
          ) : HOURS.map(h => {
            const hStr = String(h).padStart(2,'0')
            const dayRdvs = rdvs.filter(r => r.date===iso && r.time.startsWith(hStr+':'))
            const outside = openMin !== null && (h*60 < openMin || h*60 >= closeMin!)
            const blkd = blocks.some(b => b.date===iso && tMin(b.start)<=h*60 && tMin(b.end)>h*60)
            return (
              <div key={h} className={`flex border-b border-gray-100 min-h-14 ${outside?'bg-gray-50':blkd?'bg-amber-50/50':''}`}>
                <div className="w-14 flex-shrink-0 text-xs text-gray-400 font-medium flex items-start justify-center pt-2 border-r border-gray-100 bg-gray-50">
                  {hStr}:00
                </div>
                <div className="flex-1 p-2 flex flex-wrap gap-2">
                  {dayRdvs.map(r => (
                    <div key={r._id} className="bg-green-500 text-white rounded-lg px-3 py-1.5 text-xs">
                      <div className="font-semibold">{r.time} — {r.serviceName}</div>
                      <div className="opacity-80">{r.staffName} · {r.price} MAD</div>
                    </div>
                  ))}
                  {blkd && <div className="text-xs text-amber-500 p-1">🔒 Créneau bloqué</div>}
                  {outside && <div className="text-xs text-gray-300">Fermé</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const year=date.getFullYear(), month=date.getMonth()
              const fd=new Date(year,month,1).getDay()
              const dim=new Date(year,month+1,0).getDate()
              const offset=fd===0?6:fd-1
              const cells=[]
              for(let i=0;i<offset;i++) cells.push(<div key={`e${i}`} className="min-h-20 bg-gray-50 rounded-xl opacity-30"/>)
              for(let d=1;d<=dim;d++){
                const di=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const dr=rdvs.filter(r=>r.date===di&&r.status!=='cancelled')
                const isT=di===toISO(new Date())
                cells.push(
                  <div key={d} className={`min-h-20 rounded-xl p-2 border cursor-pointer transition-all hover:shadow-md ${isT?'border-[#C17B4E] bg-amber-50':'border-gray-100 bg-white'}`}
                    onClick={()=>{setDate(new Date(di+'T12:00'));setView('day')}}>
                    <div className={`text-sm font-semibold mb-1 ${isT?'text-[#C17B4E]':'text-gray-700'}`}>{d}</div>
                    {dr.slice(0,2).map(r=>(
                      <div key={r._id} className="text-xs bg-green-500 text-white rounded px-1 py-0.5 mb-0.5 truncate">
                        {r.time} {r.serviceName.substring(0,8)}
                      </div>
                    ))}
                    {dr.length>2&&<div className="text-xs text-gray-400">+{dr.length-2}</div>}
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
