import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { computeAvailability } from '@/lib/availability';

// GET /api/availability?salonId=&staffId=&serviceId=&date=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salonId   = searchParams.get('salonId') || '';
  const staffId   = searchParams.get('staffId')!;
  const serviceId = searchParams.get('serviceId')!;
  const date      = searchParams.get('date')!;
  if (!staffId || !serviceId || !date) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  // Admin client: availability must see ALL bookings/blocks, not just the
  // caller's own (rdvs/blocks RLS hides them from anonymous visitors).
  const result = await computeAvailability(createAdminClient(), { salonId, staffId, serviceId, date });
  return NextResponse.json(result);
}
