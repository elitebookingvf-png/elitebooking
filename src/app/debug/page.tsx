'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null)
  const [cookies, setCookies] = useState<string>('')

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie)

    // Check supabase session
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setInfo({
          hasSession: !!session,
          hasUser: !!user,
          userId: user?.id,
          email: user?.email,
          accessToken: session?.access_token ? `${session.access_token.slice(0, 20)}...` : null,
        })
      })
    })
  }, [])

  async function testApi() {
    const res = await fetch('/api/users/me')
    const text = await res.text()
    alert(`Status: ${res.status}\nBody: ${text.slice(0, 200)}`)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Auth</h1>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold">Supabase Session:</h2>
        <pre>{JSON.stringify(info, null, 2)}</pre>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold">Document Cookies:</h2>
        <p className="break-all text-sm">{cookies || '(no cookies)'}</p>
      </div>

      <div className="flex gap-4">
        <button onClick={testApi} className="btn btn-primary">Test /api/users/me</button>
        <button onClick={logout} className="btn btn-secondary">Logout</button>
        <a href="/pro" className="btn btn-secondary">Go to /pro</a>
        <a href="/auth" className="btn btn-secondary">Go to /auth</a>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>If &quot;Document Cookies&quot; is empty but &quot;Supabase Session&quot; shows a user,</p>
        <p>the session is in memory but not persisted to cookies.</p>
      </div>
    </div>
  )
}
