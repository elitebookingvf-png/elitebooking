import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient, getUserIdFromCookies } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', userId).single();

  // Resolve the salon by ownership — profile.salon_id alone is not proof
  const { data: salon } = await adminSupabase
    .from('salons').select('*').eq('owner_id', userId).maybeSingle();
  return NextResponse.json({ profile, salon: profile?.type === 'pro' ? salon : null });
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
  // PIN (pro uniquement — stocké sur le salon, scopé par owner_id)
  if (body.pin) {
    const pin = String(body.pin);
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN invalide (4 chiffres)' }, { status: 400 });
    await supabase.from('salons').update({ pin }).eq('owner_id', user.id);
  }
  const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return NextResponse.json({ profile: updatedProfile });
}