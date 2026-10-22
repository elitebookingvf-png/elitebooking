import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const { data } = await supabase.from('schedules').select('*').eq('salon_id', salonId).single();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  // Whitelist day fields only — never let the payload retarget the row
  // (id, salon_id, timestamps) or inject unknown columns.
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (/^(lu|ma|me|je|ve|sa|di)_(open|start|end)$/.test(k)) update[k] = v;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  const { data, error } = await supabase.from('schedules').update(update).eq('salon_id', salonId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
