import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Rdv, Service, Staff, Salon } from '@/models';
import { isSlotFree } from '@/lib/utils';
import { randomUUID } from 'crypto';

// GET /api/rdv — client's own RDV list
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  const userId = (session.user as any).id;
  const rdvs = await Rdv.find({ clientId: userId }).sort({ date: -1, time: -1 }).lean();
  return NextResponse.json(rdvs);
}

// POST /api/rdv — client booking (supports multiple items in one request)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();

  const body = await req.json();
  // Accept either a single item or an array (multi-service booking)
  const items: any[] = Array.isArray(body.items) ? body.items : [body];
  const userId = (session.user as any).id;
  const groupId = items.length > 1 ? randomUUID() : undefined;

  // Validate all slots before saving any
  const existingRdvs = await Rdv.find({
    salonId: items[0].salonId,
    date: { $in: [...new Set(items.map((i: any) => i.date))] },
    status: { $ne: 'cancelled' },
  }).lean();

  const toCreate: any[] = [];
  const tempCart: any[] = [];  // track items being booked to detect intra-group conflicts

  for (const item of items) {
    const [service, staff, salon] = await Promise.all([
      Service.findById(item.serviceId).lean(),
      Staff.findById(item.staffId).lean(),
      Salon.findById(item.salonId).lean(),
    ]);
    if (!service || !staff || !salon) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }
    // Check against DB + already-processed cart items
    const allBlocking = [...existingRdvs, ...tempCart];
    if (!isSlotFree(allBlocking as any, item.staffId, item.date, item.time, (service as any).duration)) {
      return NextResponse.json({
        error: `Créneau ${item.time} le ${item.date} déjà pris pour ${(staff as any).firstname}`
      }, { status: 409 });
    }
    const rdvData = {
      clientId:    userId,
      clientName:  `${(session.user as any).name}`,
      salonId:     item.salonId,
      salonName:   (salon as any).name,
      serviceId:   item.serviceId,
      serviceName: (service as any).name,
      staffId:     item.staffId,
      staffName:   `${(staff as any).firstname} ${(staff as any).lastname}`,
      date:        item.date,
      time:        item.time,
      duration:    (service as any).duration,
      price:       (service as any).price,
      priceType:   (service as any).priceType,
      status:      'confirmed',
      notes:       item.notes,
      groupId,
      source:      'client',
    };
    toCreate.push(rdvData);
    tempCart.push({ staffId: item.staffId, date: item.date, time: item.time, duration: (service as any).duration, status: 'confirmed' });
  }

  const created = await Rdv.insertMany(toCreate);
  return NextResponse.json({ ok: true, rdvs: created }, { status: 201 });
}
