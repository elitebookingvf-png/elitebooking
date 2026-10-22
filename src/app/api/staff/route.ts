import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';
import { DAY_KEYS } from '@/lib/utils';

const VALID_DAYS = new Set<string>(DAY_KEYS);
const cleanDays = (d: unknown) => Array.isArray(d) ? d.filter(x => VALID_DAYS.has(x as string)) : d;

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { data } = await supabase.from('staff').select('*').eq('salon_id', salonId).eq('active', true);
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
  if ('days' in rest) rest.days = cleanDays(rest.days);
  const { data, error } = await supabase.from('staff').insert({ ...rest, salon_id: salonId }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  const { id, salon_id: _omit, ...rest } = body;
  if ('days' in rest) rest.days = cleanDays(rest.days);
  const { data, error } = await supabase.from('staff').update(rest).eq('id', id).eq('salon_id', salonId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { id } = await req.json();
  const { error } = await supabase.from('staff').update({ active: false }).eq('id', id).eq('salon_id', salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
