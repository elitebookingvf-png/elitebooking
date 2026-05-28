'use client'
import { useEffect, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

let _addToast: ((msg: string, type: ToastType) => void) | null = null

export function showToast(message: string, type: ToastType = 'info') {
  _addToast?.(message, type)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((message: string, type: ToastType) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => { _addToast = add; return () => { _addToast = null } }, [add])

  const icons: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }
  const colors: Record<ToastType, string> = { success: '#27ae60', error: '#e74c3c', info: '#2980b9' }

  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t => (
        <div key={t.id} className="toast-item"
          style={{background:'#fff',border:'1px solid #efefef',borderLeft:`3px solid ${colors[t.type]}`,borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 16px 48px rgba(0,0,0,0.12)',minWidth:280,animation:'toastIn 0.3s ease'}}>
          <span style={{fontSize:'1.1rem',color:colors[t.type],flexShrink:0,fontWeight:700}}>{icons[t.type]}</span>
          <span style={{fontSize:'0.83rem',fontWeight:500}}>{t.message}</span>
          <button onClick={() => setToasts(x => x.filter(i => i.id !== t.id))}
            style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:'1rem',lineHeight:1,padding:0,flexShrink:0}}>✕</button>
        </div>
      ))}
    </div>
  )
}
