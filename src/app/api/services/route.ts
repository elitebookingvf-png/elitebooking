import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies } from '@/lib/supabase/server';

async function getProSalonId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('type, salon_id').eq('id', userId).single();
  if (data?.type === 'pro' && data.salon_id) return data.salon_id;
  if (data?.type === 'pro') {
    const { data: s } = await supabase.from('salons').select('id').eq('owner_id', userId).maybeSingle();
    return s?.id || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromCookies();
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
  const userId = getUserIdFromCookies();
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
  const { resourceType: _, ...svcData } = body;
  const { data, error } = await supabase.from('services').insert({ salon_id: salonId, ...svcData }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await req.json();
  const table = body.resourceType === 'category' ? 'service_categories' : 'services';
  const { id, resourceType: _, ...rest } = body;
  const { data, error } = await (supabase.from(table as any) as any).update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const { id, resourceType } = await req.json();
  if (resourceType === 'category') {
    await supabase.from('services').update({ cat_id: null }).eq('cat_id', id);
    await supabase.from('service_categories').delete().eq('id', id);
  } else {
    await supabase.from('services').delete().eq('id', id);
  }
  return NextResponse.json({ ok: true });
}