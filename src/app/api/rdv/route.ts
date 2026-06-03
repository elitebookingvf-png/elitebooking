import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSlotFree, tMin as tMinUtil } from '@/lib/utils';

function uuid() { return crypto.randomUUID(); }

// GET /api/rdv — RDV du client connecté
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const { data } = await supabase.from('rdvs').select('*').eq('client_id', user.id).order('date', { ascending: false }).order('start_time', { ascending: false });
  return NextResponse.json(data ?? []);
}

// POST /api/rdv — réservation client (multi-prestations supporté)
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('firstname, lastname').eq('id', user.id).single();
  const clientName = `${profile?.firstname ?? ''} ${profile?.lastname ?? ''}`.trim();

  const body = await req.json();
  const items: any[] = Array.isArray(body.items) ? body.items : [body];
  const groupId = items.length > 1 ? uuid() : null;

  // Charger les RDV existants pour vérifier les conflits staff + client
  const allDates = Array.from(new Set(items.map((i: any) => i.date)));
  const { data: existingRdvs } = await supabase.from('rdvs').select('salon_id, staff_id, client_id, date, start_time, duration, status').in('date', allDates).neq('status', 'cancelled').neq('status', 'no_show');

  // Check if client is blocked by this salon
  const salonId = items[0]?.salon_id;
  if (salonId) {
    const { data: salonCheck } = await supabase.from('salons').select('blocked_clients').eq('id', salonId).single();
    const blocked: string[] = Array.isArray(salonCheck?.blocked_clients) ? salonCheck.blocked_clients : [];
    if (blocked.includes(user.id)) return NextResponse.json({ error: 'Vous êtes bloqué par ce salon.' }, { status: 403 });
  }

  const toInsert: any[] = [];
  const tempCart: any[] = [];

  for (const item of items) {
    const [{ data: service }, { data: staff }, { data: salon }] = await Promise.all([
      supabase.from('services').select('name, duration, price, price_type').eq('id', item.service_id).single(),
      supabase.from('staff').select('firstname, lastname').eq('id', item.staff_id).single(),
      supabase.from('salons').select('name').eq('id', item.salon_id).single(),
    ]);
    if (!service || !staff || !salon) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    const allBlocking = [...(existingRdvs ?? []), ...tempCart];
    if (!isSlotFree(allBlocking as any, item.staff_id, item.date, item.start_time, service.duration)) {
      return NextResponse.json({ error: `Créneau ${item.start_time} le ${item.date} déjà pris` }, { status: 409 });
    }
    // Check client doesn't already have an overlapping RDV anywhere (can't be in 2 places at once)
    const newStart = tMinUtil(item.start_time);
    const newEnd   = newStart + service.duration;
    const clientConflict = allBlocking.some((r: any) =>
      r.client_id === user.id &&
      r.date === item.date &&
      tMinUtil(r.start_time) < newEnd &&
      tMinUtil(r.start_time) + r.duration > newStart
    );
    if (clientConflict) return NextResponse.json({ error: `Vous avez déjà un rendez-vous à ce créneau` }, { status: 409 });
    const rdv = { client_id: user.id, client_name: clientName, salon_id: item.salon_id, salon_name: salon.name, service_id: item.service_id, service_name: service.name, staff_id: item.staff_id, staff_name: `${staff.firstname} ${staff.lastname}`, date: item.date, start_time: item.start_time, duration: service.duration, price: service.price, price_type: service.price_type, status: 'confirmed', notes: item.notes ?? null, group_id: groupId, source: 'client' };
    toInsert.push(rdv);
    tempCart.push({ salon_id: item.salon_id, staff_id: item.staff_id, client_id: user.id, date: item.date, start_time: item.start_time, duration: service.duration, status: 'confirmed' });
  }

  const { data, error } = await supabase.from('rdvs').insert(toInsert).select();
  if (error) {
    console.error('[rdv POST] insert error:', JSON.stringify(error));
    return NextResponse.json({ error: error.message, detail: error.details, hint: error.hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rdvs: data }, { status: 201 });
}