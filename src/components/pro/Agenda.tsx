'use client'
import { useState, useEffect } from 'react'
import { toISO, tMin, dayKeyForISO, formatPrice } from '@/lib/utils'

type View = 'day' | 'staff' | 'week' | 'month'

export function ProAgenda({ salon }: { salon: any }) {
  const [view, setView]         = useState<View>('staff')
  const [date, setDate]         = useState(new Date())
  const [rdvs, setRdvs]         = useState<any[]>([])
  const [staff, setStaff]       = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>(null)
  const [blocks, setBlocks]     = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/rdv/pro').then(r => r.json()),
      fetch('/api/staff').then(r => r.json()),
      fetch('/api/schedule').then(r => r.json()),
      fetch('/api/blocks').then(r => r.json()),
    ]).then(([r, s, sc, b]) => {
      setRdvs(Array.isArray(r) ? r : [])
      setStaff(Array.isArray(s) ? s : [])
      setSchedule(sc && !sc.error ? sc : null)
      setBlocks(Array.isArray(b) ? b : [])
    })
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
                      return (
                        <td key={st.id} style={{border:'1px solid #eee',padding:6,verticalAlign:'top',minHeight:56,
                          background: !works?'#f7f7f7':blkd?'#fffbeb':'#fff'}}>
                          {cellRdvs.map(r => (
                            <div key={r.id} style={{background:'#27AE60',color:'#fff',borderRadius:8,padding:'6px 8px',fontSize:'0.75rem',marginBottom:4}}>
                              <div style={{fontWeight:700}}>{r.start_time} {r.service_name?.substring(0,12)}</div>
                              <div style={{opacity:0.85}}>{r.client_name} · {r.duration}min</div>
                            </div>
                          ))}
                          {blkd && !cellRdvs.length && <div style={{fontSize:'0.72rem',color:'#f59e0b',padding:4}}>🔒 Bloqué</div>}
                          {!works && <div style={{fontSize:'0.72rem',color:'#ccc',padding:4}}>{isOpen?'Repos':'Fermé'}</div>}
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
                <div style={{flex:1,padding:8,display:'flex',flexWrap:'wrap',gap:8}}>
                  {dayRdvs.map(r => (
                    <div key={r.id} style={{background:'#27AE60',color:'#fff',borderRadius:8,padding:'6px 12px',fontSize:'0.78rem'}}>
                      <div style={{fontWeight:700}}>{r.start_time} — {r.service_name}</div>
                      <div style={{opacity:0.85}}>{r.client_name} · {r.staff_name} · {formatPrice(r.price,r.price_type)}</div>
                    </div>
                  ))}
                  {blkd && <div style={{fontSize:'0.75rem',color:'#f59e0b',padding:4}}>🔒 Créneau bloqué</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

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
