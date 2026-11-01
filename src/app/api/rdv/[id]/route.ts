import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';
import { isPastSlot, isSlotFree } from '@/lib/utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await req.json();

  const { data: rdv } = await supabase
    .from('rdvs').select('id, salon_id, client_id, status, date, start_time, staff_id, service_id, duration')
    .eq('id', params.id).single();
  if (!rdv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = (await getProSalonId(supabase, userId)) === rdv.salon_id;

  let updateData: Record<string, unknown> = {};
  if (isOwner) {
    // Salon owner: status transitions + client info edits
    if (body.status) {
      const allowed = ['confirmed', 'cancelled', 'completed', 'no-show'];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.client_name !== undefined) updateData.client_name = body.client_name;
    if (body.client_phone !== undefined) updateData.client_phone = body.client_phone;
    if (body.client_id !== undefined) updateData.client_id = body.client_id;
    if (body.group_id !== undefined) updateData.group_id = body.group_id;

    // ---- Full edit: service / staff / date / time / duration / price ----
    let newService: any = null;
    if (body.service_id !== undefined && body.service_id !== rdv.service_id) {
      const { data: svc } = await supabase.from('services')
        .select('name, duration, price, price_type, salon_id, active')
        .eq('id', body.service_id).single();
      if (!svc || svc.salon_id !== rdv.salon_id || !svc.active) {
        return NextResponse.json({ error: 'Prestation invalide' }, { status: 400 });
      }
      newService = svc;
      updateData.service_id = body.service_id;
      updateData.service_name = svc.name;
      updateData.price_type = svc.price_type;
      if (body.price === undefined) updateData.price = svc.price;
    }
    let newStaff: any = null;
    if (body.staff_id !== undefined && body.staff_id !== rdv.staff_id) {
      const { data: st } = await supabase.from('staff')
        .select('firstname, lastname, salon_id, active')
        .eq('id', body.staff_id).single();
      if (!st || st.salon_id !== rdv.salon_id || !st.active) {
        return NextResponse.json({ error: 'Employé invalide' }, { status: 400 });
      }
      newStaff = st;
      updateData.staff_id = body.staff_id;
      updateData.staff_name = `${st.firstname} ${st.lastname}`;
    }
    if (body.date !== undefined) {
      if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
      }
      updateData.date = body.date;
    }
    if (body.start_time !== undefined) {
      if (typeof body.start_time !== 'string' || !/^\d{2}:\d{2}$/.test(body.start_time)) {
        return NextResponse.json({ error: 'Heure invalide' }, { status: 400 });
      }
      updateData.start_time = body.start_time;
    }
    if (body.duration !== undefined) {
      const d = Math.round(Number(body.duration));
      if (!Number.isFinite(d) || d < 5 || d > 600) {
        return NextResponse.json({ error: 'Durée invalide (5–600 min)' }, { status: 400 });
      }
      updateData.duration = d;
    }
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p < 0) {
        return NextResponse.json({ error: 'Prix invalide' }, { status: 400 });
      }
      updateData.price = p;
    }
    // Conflict check on the *effective* values whenever schedule-affecting
    // fields change — a moved/lengthened RDV must not overlap other bookings
    const schedChanged = updateData.staff_id !== undefined || updateData.date !== undefined
      || updateData.start_time !== undefined || updateData.duration !== undefined;
    if (schedChanged) {
      const effStaff = String(updateData.staff_id ?? rdv.staff_id);
      const effDate  = String(updateData.date ?? rdv.date);
      const effStart = String(updateData.start_time ?? rdv.start_time);
      const effDur   = Number(updateData.duration ?? newService?.duration ?? rdv.duration);
      const { data: others } = await supabase.from('rdvs')
        .select('staff_id, date, start_time, duration, status')
        .eq('salon_id', rdv.salon_id).eq('date', effDate)
        .neq('status', 'cancelled').neq('id', params.id);
      if (!isSlotFree((others ?? []) as any, effStaff, effDate, effStart, effDur)) {
        return NextResponse.json({ error: 'Ce créneau chevauche un autre RDV' }, { status: 409 });
      }
    }
    // A service change without an explicit duration picks up the new service's duration
    if (newService && body.duration === undefined) updateData.duration = newService.duration;
  } else {
    // Client: cancel own confirmed booking only, and only if still upcoming
    if (rdv.client_id !== userId) return NextResponse.json({ error: '403' }, { status: 403 });
    if (body.status !== 'cancelled' || rdv.status !== 'confirmed'
        || body.client_name !== undefined || body.client_phone !== undefined || body.client_id !== undefined) {
      return NextResponse.json({ error: '403' }, { status: 403 });
    }
    if (isPastSlot(rdv.date, rdv.start_time)) {
      return NextResponse.json({ error: 'Rendez-vous passé, contactez le salon.' }, { status: 400 });
    }
    updateData = { status: 'cancelled' };
  }

  if (!Object.keys(updateData).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  const { data, error } = await supabase.from('rdvs').update(updateData).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  // Only the salon owner may delete a booking record
  const { data: rdv } = await supabase.from('rdvs').select('salon_id').eq('id', params.id).single();
  if (!rdv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if ((await getProSalonId(supabase, userId)) !== rdv.salon_id) {
    return NextResponse.json({ error: '403' }, { status: 403 });
  }
  const { error } = await supabase.from('rdvs').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
