import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies } from '@/lib/supabase/server';
import { isSlotFree } from '@/lib/utils';

function uuid() { return crypto.randomUUID(); }

async function getProSalonId(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('type, salon_id').eq('id', userId).single();
  if (data?.type === 'pro' && data.salon_id) return data.salon_id;
  if (data?.type === 'pro') {
    const { data: s } = await supabase.from('salons').select('id').eq('owner_id', userId).maybeSingle();
    return s?.id || null;
  }
  return null;
}

// GET /api/rdv/pro — tous les RDV du salon pro
export async function GET(req: NextRequest) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  let query = supabase.from('rdvs').select('*').eq('salon_id', salonId).order('date').order('start_time');
  if (date) query = query.eq('date', date);
  const { data } = await query;
  return NextResponse.json(data ?? []);
}

// PATCH /api/rdv/pro — update client phone across all their RDVs in the salon
export async function PATCH(req: NextRequest) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { client_name, new_client_name, client_phone } = await req.json();
  if (!client_name) return NextResponse.json({ error: 'client_name requis' }, { status: 400 });
  const update: any = { client_phone };
  if (new_client_name && new_client_name !== client_name) update.client_name = new_client_name;
  const { error } = await supabase.from('rdvs').update(update).eq('salon_id', salonId).eq('client_name', client_name);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST /api/rdv/pro — pro crée des RDV pour un client (multi-prestations)
export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  const items: any[] = Array.isArray(body.items) ? body.items : [body];
  const groupId = items.length > 1 ? uuid() : null;
  const allDates = Array.from(new Set(items.map((i: any) => i.date)));
  const { data: existingRdvs } = await supabase.from('rdvs').select('staff_id, date, start_time, duration, status').eq('salon_id', salonId).in('date', allDates).neq('status', 'cancelled');
  const { data: salon } = await supabase.from('salons').select('name').eq('id', salonId).single();
  const toInsert: any[] = [];
  const tempCart: any[] = [];
  for (const item of items) {
    const [{ data: service }, { data: staff }] = await Promise.all([
      supabase.from('services').select('name, duration, price, price_type').eq('id', item.service_id).single(),
      supabase.from('staff').select('firstname, lastname').eq('id', item.staff_id).single(),
    ]);
    if (!service || !staff) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    const allBlocking = [...(existingRdvs ?? []), ...tempCart];
    if (!isSlotFree(allBlocking as any, item.staff_id, item.date, item.start_time, service.duration)) {
      return NextResponse.json({ error: `Créneau ${item.start_time} le ${item.date} occupé` }, { status: 409 });
    }
    toInsert.push({ client_id: null, client_name: item.client_name, client_phone: item.client_phone ?? null, salon_id: salonId, salon_name: salon!.name, service_id: item.service_id, service_name: service.name, staff_id: item.staff_id, staff_name: `${staff.firstname} ${staff.lastname}`, date: item.date, start_time: item.start_time, duration: service.duration, price: item.price ?? service.price, price_type: service.price_type, status: 'confirmed', notes: item.notes ?? null, group_id: groupId, source: 'pro' });
    tempCart.push({ staff_id: item.staff_id, date: item.date, start_time: item.start_time, duration: service.duration, status: 'confirmed' });
  }
  const { data, error } = await supabase.from('rdvs').insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rdvs: data }, { status: 201 });
}