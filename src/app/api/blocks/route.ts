import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  let query = supabase.from('blocks').select('*').eq('salon_id', salonId).order('date').order('start_time');
  if (date) query = query.eq('date', date);
  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  // salon_id is always the caller's salon — never trust the payload
  const { id: _omit, salon_id: _omit2, ...rest } = body;
  // Empty string is not a valid uuid — "" means "all staff"
  if ('staff_id' in rest) rest.staff_id = rest.staff_id || null;
  // A block targeting another salon's staff would silently apply to nobody
  if (rest.staff_id) {
    const { data: st } = await supabase.from('staff').select('id').eq('id', rest.staff_id).eq('salon_id', salonId).maybeSingle();
    if (!st) return NextResponse.json({ error: 'Employé invalide' }, { status: 400 });
  }
  const { data, error } = await supabase.from('blocks').insert({ ...rest, salon_id: salonId }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { id } = await req.json();
  const { error } = await supabase.from('blocks').delete().eq('id', id).eq('salon_id', salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
