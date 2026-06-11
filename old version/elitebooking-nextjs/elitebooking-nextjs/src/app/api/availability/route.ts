import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Rdv, Schedule, Block, Staff, Service } from '@/models';
import { tMin, generateSlots } from '@/lib/utils';

// GET /api/availability?salonId=&staffId=&serviceId=&date=
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const salonId   = searchParams.get('salonId')!;
  const staffId   = searchParams.get('staffId')!;
  const serviceId = searchParams.get('serviceId')!;
  const date      = searchParams.get('date')!;

  if (!salonId || !staffId || !serviceId || !date) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const [service, staff, schedule, rdvs, blocks] = await Promise.all([
    Service.findById(serviceId).lean(),
    Staff.findById(staffId).lean(),
    Schedule.findOne({ salonId }).lean(),
    Rdv.find({ salonId, staffId, date, status: { $ne: 'cancelled' } }).lean(),
    Block.find({ salonId, date }).lean(),
  ]);

  if (!service || !staff || !schedule) {
    return NextResponse.json({ slots: [] });
  }

  // Day of week
  const DAY_KEYS = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
  const dow = new Date(date + 'T12:00').getDay();
  const dayKey = DAY_KEYS[dow] as keyof typeof schedule;
  const daySch = (schedule as any)[dayKey] as { open: boolean; start: string; end: string };

  if (!daySch?.open) return NextResponse.json({ slots: [], closed: true });

  // Staff working hours
  let openStr  = daySch.start;
  let closeStr = daySch.end;
  const stf = staff as any;
  if (stf.start && tMin(stf.start) > tMin(openStr))  openStr  = stf.start;
  if (stf.end   && tMin(stf.end)   < tMin(closeStr)) closeStr = stf.end;

  const duration = (service as any).duration as number;
  const allSlots = generateSlots(openStr, closeStr, duration);

  // Filter blocked slots
  const available = allSlots.filter(slot => {
    const ts = tMin(slot);
    const te = ts + duration;
    // Check RDV overlaps
    const rdvConflict = (rdvs as any[]).some(r => {
      const rs = tMin(r.time), re = rs + r.duration;
      return ts < re && te > rs;
    });
    if (rdvConflict) return false;
    // Check manual blocks
    const blockConflict = (blocks as any[]).some(b => {
      if (b.staffId && b.staffId.toString() !== staffId) return false;
      const bs = tMin(b.start), be = tMin(b.end);
      return ts < be && te > bs;
    });
    return !blockConflict;
  });

  return NextResponse.json({ slots: available, open: openStr, close: closeStr });
}
