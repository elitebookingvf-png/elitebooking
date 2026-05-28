import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getProSalonId(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('type, salon_id').eq('id', userId).single();
  if (data?.type === 'pro' && data.salon_id) return data.salon_id;
  if (data?.type === 'pro') {
    const { data: s } = await supabase.from('salons').select('id').eq('owner_id', userId).maybeSingle();
    return s?.id || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const salonId = await getProSalonId(supabase, user.id);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { data } = await supabase.from('schedules').select('*').eq('salon_id', salonId).single();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const salonId = await getProSalonId(supabase, user.id);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  const { data, error } = await supabase.from('schedules').update(body).eq('salon_id', salonId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}