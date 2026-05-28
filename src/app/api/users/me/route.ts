import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profile?.type === 'pro' && profile.salon_id) {
    const { data: salon } = await supabase.from('salons').select('*').eq('id', profile.salon_id).single();
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