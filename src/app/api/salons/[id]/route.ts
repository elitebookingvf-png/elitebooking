import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
