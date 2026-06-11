import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path  = req.nextUrl.pathname

    if (path.startsWith('/pro') && token?.type !== 'pro') {
      return NextResponse.redirect(new URL('/client', req.url))
    }
    if (path.startsWith('/client') && token?.type === 'pro') {
      return NextResponse.redirect(new URL('/pro', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (path.startsWith('/pro') || path.startsWith('/client')) return !!token
        return true
      }
    }
  }
)

export const config = {
  matcher: ['/pro/:path*', '/client/:path*']
}
