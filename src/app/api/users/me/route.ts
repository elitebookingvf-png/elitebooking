import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Simple JWT payload decoder (no verification - just extraction)
function decodeJwtPayload(token: string): any {
  try {
    const base64 = token.split('.')[1];
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const sbCookie = allCookies.find(c => c.name.startsWith('sb-'));
  
  console.log('[api/users/me] sb-cookie found?', !!sbCookie);
  
  if (!sbCookie) {
    return NextResponse.json({ error: '401 - no auth cookie' }, { status: 401 });
  }
  
  // Parse the cookie value directly
  let userId: string | null = null;
  try {
    const session = JSON.parse(sbCookie.value);
    console.log('[api/users/me] session parsed, has access_token?', !!session.access_token);
    
    if (session.access_token) {
      const payload = decodeJwtPayload(session.access_token);
      console.log('[api/users/me] JWT payload sub:', payload?.sub);
      userId = payload?.sub || null;
    }
  } catch (e) {
    console.log('[api/users/me] failed to parse session:', e);
    return NextResponse.json({ error: '401 - invalid session' }, { status: 401 });
  }
  
  if (!userId) {
    return NextResponse.json({ error: '401 - no user id in token' }, { status: 401 });
  }
  
  // Use admin client to bypass RLS and fetch user data
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', userId).single();
  
  console.log('[api/users/me] profile found?', !!profile);
  
  if (profile?.type === 'pro' && profile.salon_id) {
    const { data: salon } = await adminSupabase.from('salons').select('*').eq('id', profile.salon_id).single();
    return NextResponse.json({ profile, salon });
  }
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const body = await req.json();
  const profileUpdate: Record<string, unknown> = {};
  if (body.firstname) profileUpdate.firstname = body.firstname;
  if (body.lastname)  profileUpdate.lastname  = body.lastname;
  if (body.phone)     profileUpdate.phone     = body.phone;
  if (Object.keys(profileUpdate).length) {
    await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
  }
  // Changement email/password via Supabase Auth
  if (body.email || body.password) {
    const updates: Record<string, string> = {};
    if (body.email)    updates.email    = body.email;
    if (body.password) updates.password = body.password;
    await supabase.auth.updateUser(updates);
  }
  // PIN (pro uniquement — stocké sur le salon)
  if (body.pin) {
    const { data: profile } = await supabase.from('profiles').select('salon_id, type').eq('id', user.id).single();
    if (profile?.type === 'pro' && profile.salon_id) {
      await supabase.from('salons').update({ pin: body.pin }).eq('id', profile.salon_id);
    }
  }
  const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return NextResponse.json({ profile: updatedProfile });
}