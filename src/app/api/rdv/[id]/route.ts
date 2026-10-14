import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';
import { isPastSlot } from '@/lib/utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await req.json();

  const { data: rdv } = await supabase
    .from('rdvs').select('id, salon_id, client_id, status, date, start_time')
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
