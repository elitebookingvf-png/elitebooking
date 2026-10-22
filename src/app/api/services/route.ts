import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';

// Keep only staff ids that actually belong to this salon — drops blanks,
// deleted staff, and ids pointing at other salons.
async function filterOwnStaff(supabase: any, salonId: string, ids: unknown[]): Promise<string[]> {
  const clean = ids.filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (!clean.length) return [];
  const { data } = await supabase.from('staff').select('id').eq('salon_id', salonId).in('id', clean);
  const own = new Set((data ?? []).map((s: any) => s.id));
  return clean.filter(id => own.has(id));
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const [cats, services] = await Promise.all([
    supabase.from('service_categories').select('*').eq('salon_id', salonId).order('order'),
    supabase.from('services').select('*').eq('salon_id', salonId).order('order'),
  ]);
  return NextResponse.json({ categories: cats.data ?? [], services: services.data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  if (body.resourceType === 'category') {
    const { data, error } = await supabase.from('service_categories').insert({ salon_id: salonId, name: body.name, color: body.color ?? '#C17B4E', order: body.order ?? 0 }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }
  // salon_id is always the caller's salon — never trust the payload
  const { resourceType: _, id: _omit, salon_id: _omit2, ...svcData } = body;
  // Empty strings are not valid uuids — normalize nullable refs
  if ('cat_id' in svcData) svcData.cat_id = svcData.cat_id || null;
  if (Array.isArray(svcData.staff_ids)) svcData.staff_ids = await filterOwnStaff(supabase, salonId, svcData.staff_ids);
  const { data, error } = await supabase.from('services').insert({ ...svcData, salon_id: salonId }).select().single();
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
  const table = body.resourceType === 'category' ? 'service_categories' : 'services';
  const { id, resourceType: _, salon_id: _omit, ...rest } = body;
  // Empty strings are not valid uuids — normalize nullable refs
  if ('cat_id' in rest) rest.cat_id = rest.cat_id || null;
  if (Array.isArray(rest.staff_ids)) rest.staff_ids = await filterOwnStaff(supabase, salonId, rest.staff_ids);
  const { data, error } = await (supabase.from(table as any) as any).update(rest).eq('id', id).eq('salon_id', salonId).select().single();
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
  const { id, resourceType } = await req.json();
  if (resourceType === 'category') {
    await supabase.from('services').update({ cat_id: null }).eq('cat_id', id).eq('salon_id', salonId);
    await supabase.from('service_categories').delete().eq('id', id).eq('salon_id', salonId);
  } else {
    await supabase.from('services').delete().eq('id', id).eq('salon_id', salonId);
  }
  return NextResponse.json({ ok: true });
}
