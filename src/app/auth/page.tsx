'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CITIES } from '@/lib/utils'

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login'|'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  const [type, setType] = useState<'client'|'pro'>(params.get('type') === 'pro' ? 'pro' : 'client')
  const [form, setForm] = useState({
    firstname:'', lastname:'', email:'', password:'', phone:'',
    salonName:'', salonCategory:'coiffure', salonCity:'Casablanca',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (err) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('type').eq('id', user.id).single()
    router.push(profile?.type === 'pro' ? '/pro' : '/client')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, type }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); setLoading(false); return }
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push(type === 'pro' ? '/pro' : '/client')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#f7f7f7'}}>
      <nav className="bg-white border-b px-4 h-16 flex items-center" style={{borderColor:'#eee'}}>
        <Link href="/" className="serif text-xl font-bold" style={{textDecoration:'none',color:'#111'}}>
          Elite<em style={{color:'#C17B4E',fontStyle:'normal'}}>Booking</em>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full" style={{maxWidth:440}}>
          <h1 className="serif text-3xl mb-2 text-center">
            {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
          </h1>
          <p className="text-sm text-center mb-8" style={{color:'#aaa'}}>
            {mode === 'login' ? 'Connectez-vous à votre espace' : 'Rejoignez EliteBooking'}
          </p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6 rounded-xl p-1" style={{background:'#f3f3f3'}}>
            <button onClick={() => setMode('login')}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{background: mode==='login'?'#fff':'transparent', boxShadow: mode==='login'?'0 1px 4px rgba(0,0,0,0.1)':'none', color: mode==='login'?'#111':'#888'}}>
              Se connecter
            </button>
            <button onClick={() => setMode('register')}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{background: mode==='register'?'#fff':'transparent', boxShadow: mode==='register'?'0 1px 4px rgba(0,0,0,0.1)':'none', color: mode==='register'?'#111':'#888'}}>
              S'inscrire
            </button>
          </div>

          {mode === 'register' && (
            <div className="flex gap-2 mb-6 rounded-xl p-1" style={{background:'#f3f3f3'}}>
              <button onClick={() => setType('client')}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{background: type==='client'?'#fff':'transparent', boxShadow: type==='client'?'0 1px 4px rgba(0,0,0,0.1)':'none', color: type==='client'?'#111':'#888'}}>
                Je suis client
              </button>
              <button onClick={() => setType('pro')}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{background: type==='pro'?'#fff':'transparent', boxShadow: type==='pro'?'0 1px 4px rgba(0,0,0,0.1)':'none', color: type==='pro'?'#111':'#888'}}>
                Je suis pro
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm px-4 py-3 rounded-xl mb-4"
              style={{background:'#fef0f0',border:'1px solid #fcd4d4',color:'#eb5757'}}>
              {error}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="form-row">
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Prénom *</label>
                    <input className="form-control" value={form.firstname} onChange={set('firstname')} required />
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Nom *</label>
                    <input className="form-control" value={form.lastname} onChange={set('lastname')} required />
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Téléphone</label>
                  <input className="form-control" type="tel" value={form.phone} onChange={set('phone')} />
                </div>
                {type === 'pro' && (
                  <div className="rounded-xl p-4 space-y-3" style={{background:'#fdf8f0',border:'1px solid #f5e6cc'}}>
                    <p style={{fontSize:'0.75rem',fontWeight:700,color:'#92622a'}}>Informations de votre salon</p>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label>Nom du salon *</label>
                      <input className="form-control" value={form.salonName} onChange={set('salonName')}
                        required={type==='pro'} placeholder="Mon Salon Beauté" />
                    </div>
                    <div className="form-row">
                      <div className="form-group" style={{marginBottom:0}}>
                        <label>Catégorie</label>
                        <select className="form-control" value={form.salonCategory} onChange={set('salonCategory')}>
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{marginBottom:0}}>
                        <label>Ville</label>
                        <select className="form-control" value={form.salonCity} onChange={set('salonCity')}>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="form-group" style={{marginBottom:0}}>
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Mot de passe *</label>
              <input className="form-control" type="password" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg"
              style={{marginTop:8,opacity:loading?0.6:1}}>
              {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
