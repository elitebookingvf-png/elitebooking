'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function RdvActionPage() {
  const params  = useSearchParams()
  const router  = useRouter()
  const id      = params.get('id')
  const action  = params.get('action') // 'cancel' | 'modify'
  const [rdv, setRdv]       = useState<any>(null)
  const [status, setStatus] = useState<'loading'|'done'|'error'|'confirm'>('loading')
  const [msg, setMsg]       = useState('')

  useEffect(() => {
    if (!id) { setStatus('error'); setMsg('Lien invalide.'); return }
    fetch(`/api/rdv/public/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setRdv(d); setStatus('confirm') })
      .catch(() => { setStatus('error'); setMsg('Rendez-vous introuvable ou lien expiré.') })
  }, [id])

  async function doCancel() {
    setStatus('loading')
    const res = await fetch(`/api/rdv/public/${id}`, { method: 'DELETE' })
    if (res.ok) { setStatus('done'); setMsg('Votre rendez-vous a bien été annulé.') }
    else { setStatus('error'); setMsg('Impossible d\'annuler. Veuillez contacter le salon.') }
  }

  if (status === 'loading') return (
    <div style={wrap}><div style={card}><p style={{textAlign:'center',color:'#aaa'}}>Chargement…</p></div></div>
  )
  if (status === 'done') return (
    <div style={wrap}><div style={card}>
      <div style={{fontSize:'3rem',textAlign:'center',marginBottom:16}}>✅</div>
      <h2 style={h2}>Action effectuée</h2>
      <p style={p}>{msg}</p>
      <a href="/" style={btnPrimary}>Retour à l'accueil</a>
    </div></div>
  )
  if (status === 'error') return (
    <div style={wrap}><div style={card}>
      <div style={{fontSize:'3rem',textAlign:'center',marginBottom:16}}>❌</div>
      <h2 style={h2}>Erreur</h2>
      <p style={p}>{msg}</p>
      <a href="/" style={btnPrimary}>Retour à l'accueil</a>
    </div></div>
  )

  const dateFormatted = rdv ? new Date(rdv.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : ''

  if (action === 'cancel') return (
    <div style={wrap}><div style={card}>
      <div style={{fontSize:'3rem',textAlign:'center',marginBottom:16}}>🗓️</div>
      <h2 style={h2}>Annuler votre rendez-vous ?</h2>
      <div style={rdvCard}>
        <b>{rdv?.salon_name}</b><br/>
        {rdv?.service_name} · {rdv?.staff_name}<br/>
        {dateFormatted} à {rdv?.start_time}
      </div>
      <p style={{...p, color:'#EB5757', fontWeight:600}}>Cette action est irréversible.</p>
      <div style={{display:'flex',gap:12,marginTop:8}}>
        <a href="/" style={btnSecondary}>← Retour</a>
        <button onClick={doCancel} style={btnDanger}>Confirmer l'annulation</button>
      </div>
    </div></div>
  )

  if (action === 'modify') return (
    <div style={wrap}><div style={card}>
      <div style={{fontSize:'3rem',textAlign:'center',marginBottom:16}}>✏️</div>
      <h2 style={h2}>Modifier votre rendez-vous</h2>
      <div style={rdvCard}>
        <b>{rdv?.salon_name}</b><br/>
        {rdv?.service_name} · {rdv?.staff_name}<br/>
        {dateFormatted} à {rdv?.start_time}
      </div>
      <p style={p}>Pour modifier votre rendez-vous, veuillez contacter directement le salon ou vous connecter à votre espace.</p>
      <div style={{display:'flex',gap:12,marginTop:8}}>
        <a href="/" style={btnPrimary}>Se connecter</a>
        <button onClick={doCancel} style={btnDanger}>Annuler le RDV</button>
      </div>
    </div></div>
  )

  return null
}

const wrap: React.CSSProperties = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5', padding:16 }
const card: React.CSSProperties = { background:'#fff', borderRadius:20, padding:40, maxWidth:460, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.1)' }
const h2:   React.CSSProperties = { margin:'0 0 12px', fontSize:'1.3rem', fontWeight:800, textAlign:'center' }
const p:    React.CSSProperties = { margin:'0 0 16px', fontSize:'0.9rem', lineHeight:1.6, color:'#555', textAlign:'center' }
const rdvCard: React.CSSProperties = { background:'#f9f9f9', borderRadius:12, padding:'14px 18px', margin:'16px 0', fontSize:'0.9rem', lineHeight:1.8, color:'#444' }
const btnPrimary: React.CSSProperties  = { display:'block', textAlign:'center', background:'#C17B4E', color:'#fff', borderRadius:10, padding:'12px 20px', fontWeight:700, fontSize:'0.9rem', textDecoration:'none', border:'none', cursor:'pointer', flex:1 }
const btnSecondary: React.CSSProperties = { display:'block', textAlign:'center', background:'#f0f0f0', color:'#333', borderRadius:10, padding:'12px 20px', fontWeight:700, fontSize:'0.9rem', textDecoration:'none', flex:1 }
const btnDanger: React.CSSProperties   = { background:'#EB5757', color:'#fff', borderRadius:10, padding:'12px 20px', fontWeight:700, fontSize:'0.9rem', border:'none', cursor:'pointer', flex:1 }
