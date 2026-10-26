// src/lib/availability.ts
// Single source of truth for "which slots are bookable" — used by the
// availability API (UI picker) AND the RDV POST route (server-side check).
// Requires an admin (service_role) client: rdvs/blocks RLS hides other
// clients' bookings from anonymous callers.

import { tMin, generateSlots, dayKeyForISO } from './utils';

const SALON_TZ = 'Africa/Casablanca';

export type AvailabilityResult = {
  slots: string[];
  closed?: boolean;   // salon closed that day
  off?: boolean;      // staff member's day off
  open?: string;
  close?: string;
  error?: string;
};

export async function computeAvailability(
  supabase: any,
  opts: { salonId?: string; staffId: string; serviceId: string; date: string; duration?: number }
): Promise<AvailabilityResult> {
  const { staffId, serviceId, date } = opts;
  let salonId = opts.salonId || '';

  if (!salonId) {
    const { data: staffRow } = await supabase.from('staff').select('salon_id').eq('id', staffId).single();
    salonId = staffRow?.salon_id || '';
  }
  if (!salonId) return { slots: [], error: 'Salon introuvable' };

  const [{ data: salon }, { data: service }, { data: staff }, { data: schedule }, { data: rdvs }, { data: blocks }] = await Promise.all([
    supabase.from('salons').select('active').eq('id', salonId).single(),
    supabase.from('services').select('duration, active').eq('id', serviceId).single(),
    supabase.from('staff').select('days, start_time, end_time, active').eq('id', staffId).single(),
    supabase.from('schedules').select('*').eq('salon_id', salonId).single(),
    supabase.from('rdvs').select('staff_id, date, start_time, duration, status').eq('salon_id', salonId).eq('staff_id', staffId).eq('date', date).neq('status', 'cancelled'),
    supabase.from('blocks').select('start_time, end_time, staff_id').eq('salon_id', salonId).eq('date', date),
  ]);

  if (!salon || salon.active === false || !service?.active || !staff?.active || !schedule) return { slots: [] };

  const dayKey = dayKeyForISO(date).toLowerCase();
  if ((schedule as any)[`${dayKey}_open`] === false) return { slots: [], closed: true };

  // Employee's day off — staff.days uses 'Lu','Ma',... format
  const staffDay = dayKeyForISO(date);
  if (staff.days?.length && !staff.days.includes(staffDay)) return { slots: [], off: true };

  let openStr  = (schedule as any)[`${dayKey}_start`] as string || '00:00';
  let closeStr = (schedule as any)[`${dayKey}_end`]   as string || '24:00';
  if (staff.start_time && tMin(staff.start_time) > tMin(openStr))  openStr  = staff.start_time;
  if (staff.end_time   && tMin(staff.end_time)   < tMin(closeStr)) closeStr = staff.end_time;

  // Pros may override the prestation's nominal duration per booking (e.g. a
  // 30-min brushing that only takes 10 min for short hair). Validated 5–600 min.
  const reqDur = Math.round(Number(opts.duration));
  const duration = Number.isFinite(reqDur) && reqDur >= 5 && reqDur <= 600 ? reqDur : service.duration;
  const allSlots = generateSlots(openStr, closeStr, duration);
  let available = allSlots.filter(slot => {
    const ts = tMin(slot), te = ts + duration;
    const rdvConflict = (rdvs ?? []).some((r: any) => {
      const rs = tMin(r.start_time), re = rs + r.duration;
      return ts < re && te > rs;
    });
    if (rdvConflict) return false;
    const blockConflict = (blocks ?? []).some((b: any) => {
      if (b.staff_id && b.staff_id !== staffId) return false;
      const bs = tMin(b.start_time), be = tMin(b.end_time);
      return ts < be && te > bs;
    });
    return !blockConflict;
  });

  // Drop past slots (salon local time — Morocco). Past dates yield nothing at all.
  const todayLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  if (date < todayLocal) return { slots: [], closed: true };
  if (date === todayLocal) {
    const hm = new Intl.DateTimeFormat('en-GB', {
      timeZone: SALON_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date());
    const nowMin = tMin(hm);
    available = available.filter(s => tMin(s) > nowMin);
  }

  return { slots: available, open: openStr, close: closeStr };
}
