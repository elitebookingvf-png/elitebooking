import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tMin, generateSlots, dayKeyForISO, DAY_KEYS } from '@/lib/utils';

// GET /api/availability?salonId=&staffId=&serviceId=&date=
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  let salonId     = searchParams.get('salonId') || '';
  const staffId   = searchParams.get('staffId')!;
  const serviceId = searchParams.get('serviceId')!;
  const date      = searchParams.get('date')!;
  if (!staffId || !serviceId || !date) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  // If salonId not provided, resolve from staffId
  if (!salonId && staffId) {
    const { data: staffRow } = await supabase.from('staff').select('salon_id').eq('id', staffId).single();
    salonId = staffRow?.salon_id || '';
  }
  if (!salonId) return NextResponse.json({ error: 'Salon introuvable' }, { status: 400 });
  const [{ data: service }, { data: staff }, { data: schedule }, { data: rdvs }, { data: blocks }] = await Promise.all([
    supabase.from('services').select('duration').eq('id', serviceId).single(),
    supabase.from('staff').select('days, start_time, end_time').eq('id', staffId).single(),
    supabase.from('schedules').select('*').eq('salon_id', salonId).single(),
    supabase.from('rdvs').select('staff_id, date, start_time, duration, status').eq('salon_id', salonId).eq('staff_id', staffId).eq('date', date).neq('status', 'cancelled'),
    supabase.from('blocks').select('start_time, end_time, staff_id').eq('salon_id', salonId).eq('date', date),
  ]);
  if (!service || !schedule) return NextResponse.json({ slots: [] });
  const dayKey = dayKeyForISO(date).toLowerCase();
  const isOpen = (schedule as any)[`${dayKey}_open`] as boolean;
  if (!isOpen) return NextResponse.json({ slots: [], closed: true });
  let openStr  = staff?.start_time || '00:00';
  let closeStr = staff?.end_time   || '24:00';
  const duration = service.duration;
  const allSlots = generateSlots(openStr, closeStr, duration);
  const available = allSlots.filter(slot => {
    const ts = tMin(slot), te = ts + duration;
    const rdvConflict = (rdvs ?? []).some((r: any) => { const rs = tMin(r.start_time), re = rs + r.duration; return ts < re && te > rs; });
    if (rdvConflict) return false;
    const blockConflict = (blocks ?? []).some((b: any) => {
      if (b.staff_id && b.staff_id !== staffId) return false;
      const bs = tMin(b.start_time), be = tMin(b.end_time);
      return ts < be && te > bs;
    });
    return !blockConflict;
  });
  return NextResponse.json({ slots: available, open: openStr, close: closeStr });
}