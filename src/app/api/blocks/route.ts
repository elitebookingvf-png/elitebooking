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
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  let query = supabase.from('blocks').select('*').eq('salon_id', salonId).order('date').order('start_time');
  if (date) query = query.eq('date', date);
  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const salonId = await getProSalonId(supabase, user.id);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  const { data, error } = await supabase.from('blocks').insert({ salon_id: salonId, ...body }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const { id } = await req.json();
  await supabase.from('blocks').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}