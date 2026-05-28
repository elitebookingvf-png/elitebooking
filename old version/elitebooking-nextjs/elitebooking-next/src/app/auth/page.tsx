'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['Coiffure','Hammam','Spa','Onglerie','Barbier','Institut beauté','Bien-être','Esthétique']
const CITIES = ['Casablanca','Rabat','Marrakech','Fès','Tanger','Agadir','Meknès']

export default function AuthPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login'|'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  const [type, setType] = useState<'client'|'pro'>(params.get('type') === 'pro' ? 'pro' : 'client')
  const [form, setForm] = useState({ firstname:'',lastname:'',email:'',password:'',phone:'',salonName:'',salonCategory:'Coiffure',salonCity:'Casablanca' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    if (res?.error) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    // Redirect based on type
    const me = await fetch('/api/users/me').then(r => r.json()).catch(() => null)
    router.push(me?.type === 'pro' ? '/pro' : '/client')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, type })
    })
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); setLoading(false); return }
    // Auto login
    await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    router.push(type === 'pro' ? '/pro' : '/client')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-4 h-16 flex items-center">
        <Link href="/" className="font-serif text-xl">Elite<em className="text-[#C17B4E]">Booking</em></Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
          <h1 className="font-serif text-3xl mb-2 text-center">
            {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            {mode === 'login' ? 'Connectez-vous à votre espace' : 'Rejoignez EliteBooking'}
          </p>

          {mode === 'register' && (
            <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setType('client')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type==='client'?'bg-white shadow text-gray-900':'text-gray-500'}`}>
                Je suis client
              </button>
              <button onClick={() => setType('pro')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type==='pro'?'bg-white shadow text-gray-900':'text-gray-500'}`}>
                Je suis pro
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Prénom *</label>
                    <input className="input" value={form.firstname} onChange={set('firstname')} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nom *</label>
                    <input className="input" value={form.lastname} onChange={set('lastname')} required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Téléphone</label>
                  <input className="input" type="tel" value={form.phone} onChange={set('phone')} />
                </div>
                {type === 'pro' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-amber-800">Informations de votre salon</p>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Nom du salon *</label>
                      <input className="input" value={form.salonName} onChange={set('salonName')} required={type==='pro'} placeholder="Mon Salon Beauté" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Catégorie</label>
                        <select className="input" value={form.salonCategory} onChange={set('salonCategory')}>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Ville</label>
                        <select className="input" value={form.salonCity} onChange={set('salonCity')}>
                          {CITIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mot de passe *</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50">
              {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
            {' '}
            <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
              className="text-gray-900 font-semibold underline underline-offset-2">
              {mode === 'login' ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
