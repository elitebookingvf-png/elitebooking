import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('rdvs').select('id,salon_name,service_name,staff_name,date,start_time,status').eq('id', params.id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.status === 'cancelled') return NextResponse.json({ error: 'Déjà annulé' }, { status: 410 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('rdvs').select('status,date,start_time').eq('id', params.id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.status === 'cancelled') return NextResponse.json({ error: 'Déjà annulé' }, { status: 410 });
  // Only allow cancel if appointment is in the future
  const apptTime = new Date(`${data.date}T${data.start_time}`);
  if (apptTime < new Date()) return NextResponse.json({ error: 'Rendez-vous passé, contactez le salon.' }, { status: 400 });
  const { error: upErr } = await supabase.from('rdvs').update({ status: 'cancelled' }).eq('id', params.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
