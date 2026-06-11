// src/lib/supabase/server.ts
// Server-side Supabase instance (Server Components, Route Handlers, Server Actions)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  // Extract project ID from URL for cookie naming
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  const storageKey = projectId ? `sb-${projectId}-auth-token` : 'sb-auth-token';
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey,
        autoRefreshToken: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// JWT payload decoder
function decodeJwtPayload(token: string): any {
  try {
    const base64 = token.split('.')[1];
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Extract user ID from Supabase auth cookie
export function getUserIdFromCookies(): string | null {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const sbCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  if (!sbCookie) return null;
  try {
    const session = JSON.parse(sbCookie.value);
    if (!session.access_token) return null;
    const payload = decodeJwtPayload(session.access_token);
    return payload?.sub || null;
  } catch {
    return null;
  }
}

// Client avec service_role_key : bypass RLS (admin uniquement, JAMAIS exposé côté client)
export function createAdminClient() {
  // Use createServerClient with service role key — bypasses RLS
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      cookies: { getAll() { return []; }, setAll() {} },
    }
  );
}
