'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/Icon'

export default function NavBar() {
  const router = useRouter()
  const [user, setUser]       = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [ready, setReady]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        setUser(u)
        const { data: prof } = await supabase.from('profiles')
          .select('firstname,lastname,type').eq('id', u.id).single()
        setProfile(prof)
      }
      setReady(true)
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('profiles').select('firstname,lastname,type')
          .eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data))
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const initials = profile
    ? `${profile.firstname?.[0] || ''}${profile.lastname?.[0] || ''}`.toUpperCase()
    : ''

  const dashPath = profile?.type === 'pro' ? '/pro' : '/client'

  return (
    <nav className="app-nav" style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #efefef',padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <Link href="/" className="serif" style={{fontSize:'1.45rem',fontWeight:700,textDecoration:'none',color:'#111'}}>
        Elite<em style={{fontStyle:'italic'}}>Booking</em>
      </Link>

      <div style={{display:'flex',alignItems:'center',gap:28}} className="nav-links-desktop">
        <Link href="/search" style={{fontSize:'0.85rem',color:'#888',textDecoration:'none'}}>Trouver un salon</Link>
        <Link href="/#how" style={{fontSize:'0.85rem',color:'#888',textDecoration:'none'}}>Comment ça marche</Link>
        <Link href="/#pro-section" style={{fontSize:'0.85rem',color:'#888',textDecoration:'none'}}>Pour les pros</Link>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'flex-end'}}>
        {!ready ? (
          <div style={{width:120,height:32,borderRadius:8,background:'#f3f3f3'}} />
        ) : user && profile ? (
          <>
            <Link href={dashPath}
              style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'6px 12px',borderRadius:8,textDecoration:'none',color:'inherit',transition:'background 0.2s'}}
              className="nav-user">
              <div style={{width:32,height:32,borderRadius:'50%',background:'#111',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,flexShrink:0,letterSpacing:'0.03em'}}>
                {initials || '?'}
              </div>
              <span style={{fontSize:'0.83rem',fontWeight:500}} className="nav-links-desktop">{profile.firstname}</span>
            </Link>
            <button onClick={signOut} className="btn btn-secondary btn-sm nav-links-desktop">Déconnexion</button>
          </>
        ) : (
          <div className="nav-links-desktop" style={{display:'flex',gap:12}}>
            <Link href="/auth?mode=login" className="btn btn-secondary btn-sm">Se connecter</Link>
            <Link href="/auth?mode=register" className="btn btn-primary btn-sm">S'inscrire</Link>
          </div>
        )}

        {/* Mobile hamburger */}
        <button className="nav-mobile-toggle" onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
          {menuOpen ? <Icon name="x" size={18} /> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          <Link href="/search" onClick={() => setMenuOpen(false)}>Trouver un salon</Link>
          <Link href="/#how" onClick={() => setMenuOpen(false)}>Comment ça marche</Link>
          <Link href="/#pro-section" onClick={() => setMenuOpen(false)}>Pour les pros</Link>
          <div style={{borderTop:'1px solid #efefef',margin:'8px 0'}} />
          {user && profile ? (
            <>
              <Link href={dashPath} onClick={() => setMenuOpen(false)} style={{fontWeight:600}}>Mon espace</Link>
              <button onClick={signOut} style={{background:'none',border:'none',cursor:'pointer',textAlign:'left',color:'#C62828'}}>Déconnexion</button>
            </>
          ) : (
            <>
              <Link href="/auth?mode=login" onClick={() => setMenuOpen(false)}>Se connecter</Link>
              <Link href="/auth?mode=register" onClick={() => setMenuOpen(false)} style={{fontWeight:600}}>S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
