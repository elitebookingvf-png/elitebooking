import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies } from '@/lib/supabase/server';
import { isSlotFree, tMin as tMinUtil, formatPrice } from '@/lib/utils';
import { computeAvailability } from '@/lib/availability';
import { sendRdvConfirmationEmail, sendNewRdvNotificationEmail } from '@/lib/email';

function uuid() { return crypto.randomUUID(); }

// GET /api/rdv — RDV du client connecté
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const { data } = await supabase.from('rdvs').select('*').eq('client_id', userId).order('date', { ascending: false }).order('start_time', { ascending: false });
  return NextResponse.json(data ?? []);
}

// POST /api/rdv — réservation client (multi-prestations supporté)
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();

  const { data: profile } = await supabase.from('profiles').select('firstname, lastname').eq('id', userId).single();
  const clientName = `${(profile as any)?.firstname ?? ''} ${(profile as any)?.lastname ?? ''}`.trim();
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
  const clientEmail = authUser?.email || null;

  const body = await req.json();
  const items: any[] = Array.isArray(body.items) ? body.items : [body];
  if (!items.length || items.length > 10) {
    return NextResponse.json({ error: 'Nombre de prestations invalide' }, { status: 400 });
  }
  const groupId = items.length > 1 ? uuid() : null;

  // Charger les RDV existants pour vérifier les conflits staff + client
  const allDates = Array.from(new Set(items.map((i: any) => i.date)));
  const { data: existingRdvs } = await supabase.from('rdvs').select('salon_id, staff_id, client_id, date, start_time, duration, status').in('date', allDates).neq('status', 'cancelled').neq('status', 'no-show');

  // Check if client is blocked by ANY salon in this booking
  const salonIds = Array.from(new Set(items.map((i: any) => i.salon_id).filter(Boolean)));
  if (salonIds.length) {
    const { data: salonChecks } = await supabase.from('salons').select('id, blocked_clients').in('id', salonIds);
    for (const s of salonChecks ?? []) {
      const blocked: string[] = Array.isArray(s.blocked_clients) ? s.blocked_clients : [];
      if (blocked.includes(userId)) return NextResponse.json({ error: 'Vous êtes bloqué par ce salon.' }, { status: 403 });
    }
  }

  const toInsert: any[] = [];
  const tempCart: any[] = [];

  for (const item of items) {
    const [{ data: service }, { data: staff }, { data: salon }] = await Promise.all([
      supabase.from('services').select('name, duration, price, price_type, salon_id, active, staff_ids').eq('id', item.service_id).single(),
      supabase.from('staff').select('firstname, lastname, salon_id, active').eq('id', item.staff_id).single(),
      supabase.from('salons').select('name, active').eq('id', item.salon_id).single(),
    ]);
    if (!service || !staff || !salon) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    if (!salon.active || !service.active || !staff.active) {
      return NextResponse.json({ error: 'Prestation indisponible' }, { status: 400 });
    }
    // No cross-salon mixing: service and staff must belong to the target salon
    if (service.salon_id !== item.salon_id || staff.salon_id !== item.salon_id) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }
    // If the service restricts which employees can perform it, enforce it
    if (Array.isArray(service.staff_ids) && service.staff_ids.length && !service.staff_ids.includes(item.staff_id)) {
      return NextResponse.json({ error: 'Employé non habilité pour cette prestation' }, { status: 400 });
    }
    if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }
    // The slot must be genuinely bookable — same rules as the picker:
    // salon open, staff working that day, inside opening hours, no overlap
    // with existing RDVs/blocks, and not in the past.
    const { slots } = await computeAvailability(supabase, {
      salonId: item.salon_id, staffId: item.staff_id, serviceId: item.service_id, date: item.date,
    });
    if (!slots.includes(item.start_time)) {
      return NextResponse.json({ error: `Créneau ${item.start_time} le ${item.date} indisponible` }, { status: 409 });
    }
    // Guard against conflicts with other items in the same request
    const allBlocking = [...(existingRdvs ?? []), ...tempCart];
    if (!isSlotFree(allBlocking as any, item.staff_id, item.date, item.start_time, service.duration)) {
      return NextResponse.json({ error: `Créneau ${item.start_time} le ${item.date} déjà pris` }, { status: 409 });
    }
    // Check client doesn't already have an overlapping RDV anywhere (can't be in 2 places at once)
    const newStart = tMinUtil(item.start_time);
    const newEnd   = newStart + service.duration;
    const clientConflict = allBlocking.some((r: any) =>
      r.client_id === userId &&
      r.date === item.date &&
      tMinUtil(r.start_time) < newEnd &&
      tMinUtil(r.start_time) + r.duration > newStart
    );
    if (clientConflict) return NextResponse.json({ error: `Vous avez déjà un rendez-vous à ce créneau` }, { status: 409 });
    const rdv = { client_id: userId, client_name: clientName, salon_id: item.salon_id, salon_name: salon.name, service_id: item.service_id, service_name: service.name, staff_id: item.staff_id, staff_name: `${staff.firstname} ${staff.lastname}`, date: item.date, start_time: item.start_time, duration: service.duration, price: service.price, price_type: service.price_type, status: 'confirmed', notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : null, group_id: groupId, source: 'client' };
    toInsert.push(rdv);
    tempCart.push({ salon_id: item.salon_id, staff_id: item.staff_id, client_id: userId, date: item.date, start_time: item.start_time, duration: service.duration, status: 'confirmed' });
  }

  const { data, error } = await supabase.from('rdvs').insert(toInsert).select();
  if (error) {
    console.error('[rdv POST] insert error:', JSON.stringify(error));
    return NextResponse.json({ error: error.message, detail: error.details, hint: error.hint }, { status: 500 });
  }

  // Send emails (fire-and-forget) for first item in the booking
  const first = toInsert[0];
  if (first && clientEmail) {
    sendRdvConfirmationEmail(clientEmail, (data as any[])[0].id, {
      clientName: first.client_name, salonName: first.salon_name,
      serviceName: first.service_name, staffName: first.staff_name,
      date: first.date, time: first.start_time, duration: first.duration,
      price: formatPrice(first.price, first.price_type),
    }).catch(console.error);
  }
  // Notify salon owner
  if (first) {
    const { data: ownerSalon } = await supabase.from('salons').select('owner_id').eq('id', first.salon_id).single();
    if (ownerSalon?.owner_id) {
      const { data: { user: ownerAuth } } = await supabase.auth.admin.getUserById(ownerSalon.owner_id);
      if (ownerAuth?.email) {
        sendNewRdvNotificationEmail(ownerAuth.email, {
          clientName: first.client_name, clientPhone: null,
          serviceName: first.service_name, staffName: first.staff_name,
          date: first.date, time: first.start_time, duration: first.duration,
        }).catch(console.error);
      }
    }
  }

  return NextResponse.json({ ok: true, rdvs: data }, { status: 201 });
}