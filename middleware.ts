// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Set to false to restore the site
const SITE_LOCKED = true;

const LOCKED_HTML = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site indisponible</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:sans-serif;font-size:1.25rem;text-align:center;padding:0 1rem">
payer 450 euros pour debloquer le site web
</body>
</html>`;

export async function middleware(request: NextRequest) {
  if (SITE_LOCKED) {
    return new NextResponse(LOCKED_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options } as any);
            response.cookies.set({ name, value, ...options } as any);
          });
        },
      },
    }
  );

  // IMPORTANT : ne pas ajouter de logique entre createServerClient et getUser()
  const { data: { user } } = await supabase.auth.getUser();

  // Routes protégées
  const { pathname } = request.nextUrl;
  const isPro    = pathname.startsWith('/pro');
  const isClient = pathname.startsWith('/client');

  if ((isPro || isClient) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
