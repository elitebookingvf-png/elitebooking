// src/lib/supabase/server.ts
// Server-side Supabase instance (Server Components, Route Handlers, Server Actions)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // During build time, environment variables might not be available
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client during build to prevent build errors
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('Supabase environment variables not available during build');
      return null as any;
    }
    throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // Extract project ID from URL for cookie naming
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  const storageKey = projectId ? `sb-${projectId}-auth-token` : 'sb-auth-token';
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

// Extract the VERIFIED user ID from the Supabase auth cookie.
// The access token is validated server-side (signature + expiry) via
// supabase.auth.getUser — never trust the JWT payload unverified.
export async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = cookies();
  // Session cookie may be chunked: sb-<ref>-auth-token.0, .1, ...
  const parts = cookieStore.getAll()
    .filter(c => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => {
      const ai = Number(a.name.match(/\.(\d+)$/)?.[1] ?? 0);
      const bi = Number(b.name.match(/\.(\d+)$/)?.[1] ?? 0);
      return ai - bi;
    });
  if (!parts.length) return null;
  try {
    let raw = parts.map(c => c.value).join('');
    if (raw.startsWith('base64-')) {
      raw = Buffer.from(raw.slice(7), 'base64').toString('utf8');
    }
    const session = JSON.parse(raw);
    const token = session?.access_token;
    if (!token) return null;
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// Resolve the salon owned by this user. Trusts salons.owner_id ONLY —
// profiles.salon_id is user-writable and must not grant salon access.
export async function getProSalonId(supabase: any, userId: string): Promise<string | null> {
  const { data: s } = await supabase.from('salons').select('id').eq('owner_id', userId).maybeSingle();
  return s?.id || null;
}

// Client avec service_role_key : bypass RLS (admin uniquement, JAMAIS exposé côté client)
export function createAdminClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // During build time, environment variables might not be available
  if (!supabaseUrl || !serviceRoleKey) {
    // Return a mock client during build to prevent build errors
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('Supabase environment variables not available during build');
      return null as any;
    }
    throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  // Use createServerClient with service role key — bypasses RLS
  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      cookies: { getAll() { return []; }, setAll() {} },
    }
  );
}
