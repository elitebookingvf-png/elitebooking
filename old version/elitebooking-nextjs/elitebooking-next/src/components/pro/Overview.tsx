'use client'
import { useEffect, useState } from 'react'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function ProOverview({ salonId, salon }: { salonId: string; salon: any }) {
  const [rdvs, setRdvs] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/rdv?salonId=${salonId}`).then(r => r.json()).then(setRdvs)
  }, [salonId])

  const today = toISO(new Date())
  const confirmed  = rdvs.filter(r => r.status === 'confirmed')
  const revenue    = confirmed.reduce((a, r) => a + (r.price || 0), 0)
  const todayRdvs  = confirmed.filter(r => r.date === today)
  const upcoming   = confirmed.filter(r => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5)

  const kpis = [
    { label: 'Total RDV',      value: rdvs.length, sub: 'Tous confirmés' },
    { label: 'Revenus MAD',    value: revenue.toLocaleString('fr-FR'), sub: 'Confirmés' },
    { label: "RDV aujourd'hui", value: todayRdvs.length, sub: new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'}) },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl">{salon.name}</h1>
          <p className="text-gray-400 text-sm mt-1">{salon.category} · {salon.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="card">
            <div className="text-3xl font-bold">{k.value}</div>
            <div className="text-sm text-gray-500 mt-1">{k.label}</div>
            <div className="text-xs text-green-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Prochains rendez-vous</h3>
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Aucun RDV à venir</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcoming.map(r => (
              <div key={r._id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{r.serviceName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{r.staffName} · {r.date} à {r.time}</div>
                </div>
                <span className="font-semibold text-[#C17B4E] text-sm">{r.price} MAD</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
