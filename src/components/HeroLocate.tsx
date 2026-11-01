'use client'
import { useState } from 'react'
import Icon from '@/components/Icon'

// Hero "Autour de moi" — geolocates once, then hands the coordinates to the
// search page via URL params so results arrive already distance-sorted.
export default function HeroLocate() {
  const [locating, setLocating] = useState(false)
  function go() {
    if (!navigator.geolocation) { window.location.href = '/search'; return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      p => { window.location.href = `/search?near=1&lat=${p.coords.latitude}&lng=${p.coords.longitude}` },
      () => { window.location.href = '/search?near=1' },
      { timeout: 8000 }
    )
  }
  return (
    <button onClick={go} disabled={locating}
      style={{fontSize:'0.78rem',color:'#fff',background:'#111',border:'none',borderRadius:20,padding:'7px 16px',cursor:'pointer',transition:'all 0.2s',display:'inline-flex',alignItems:'center',gap:6,fontWeight:600}}>
      <Icon name="locate" size={13} /> {locating ? 'Localisation…' : 'Autour de moi'}
    </button>
  )
}
