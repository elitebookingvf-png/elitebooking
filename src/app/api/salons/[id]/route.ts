import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const body = await req.json();
  const allowed = ['blocked_clients', 'name', 'description', 'phone', 'whatsapp', 'instagram', 'address', 'category', 'city', 'active'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) update[key] = body[key]; }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  const { data, error } = await supabase.from('salons').update(update).eq('id', params.id).eq('owner_id', user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { id } = params;

  const [salon, categories, services, staff, schedule] = await Promise.all([
    supabase.from('salons').select('*').eq('id', id).single(),
    supabase.from('service_categories').select('*').eq('salon_id', id).order('order'),
    supabase.from('services').select('*').eq('salon_id', id).order('order'),
    supabase.from('staff').select('*').eq('salon_id', id).eq('active', true),
    supabase.from('schedules').select('*').eq('salon_id', id).single(),
  ]);

  if (!salon.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    salon: salon.data,
    categories: categories.data ?? [],
    services: services.data ?? [],
    staff: staff.data ?? [],
    schedule: schedule.data ?? null,
  });
}
