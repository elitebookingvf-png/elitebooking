import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Rdv, Service, Staff, Salon } from '@/models';
import { isSlotFree } from '@/lib/utils';
import { randomUUID } from 'crypto';

// GET /api/rdv/pro — all RDVs for pro's salon
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  await connectDB();
  const salonId = (session.user as any).salonId;
  const { searchParams } = new URL(req.url);
  const date   = searchParams.get('date');
  const filter: any = { salonId };
  if (date) filter.date = date;
  const rdvs = await Rdv.find(filter).sort({ date: 1, time: 1 }).lean();
  return NextResponse.json(rdvs);
}

// POST /api/rdv/pro — pro creates RDVs for a client (multi-service supported)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  await connectDB();
  const body = await req.json();
  const items: any[] = Array.isArray(body.items) ? body.items : [body];
  const salonId = (session.user as any).salonId;
  const groupId = items.length > 1 ? randomUUID() : undefined;

  const existingRdvs = await Rdv.find({
    salonId,
    date: { $in: [...new Set(items.map((i: any) => i.date))] },
    status: { $ne: 'cancelled' },
  }).lean();

  const toCreate: any[] = [];
  const tempCart: any[] = [];

  for (const item of items) {
    const [service, staff] = await Promise.all([
      Service.findById(item.serviceId).lean(),
      Staff.findById(item.staffId).lean(),
    ]);
    if (!service || !staff) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    const allBlocking = [...existingRdvs, ...tempCart];
    if (!isSlotFree(allBlocking as any, item.staffId, item.date, item.time, (service as any).duration)) {
      return NextResponse.json({ error: `Créneau occupé : ${item.time} le ${item.date}` }, { status: 409 });
    }
    const salon = await Salon.findById(salonId).lean();
    toCreate.push({
      clientId:    'pro-add',
      clientName:  item.clientName,
      clientPhone: item.clientPhone,
      salonId,
      salonName:   (salon as any).name,
      serviceId:   item.serviceId,
      serviceName: (service as any).name,
      staffId:     item.staffId,
      staffName:   `${(staff as any).firstname} ${(staff as any).lastname}`,
      date:        item.date,
      time:        item.time,
      duration:    (service as any).duration,
      price:       item.price ?? (service as any).price,
      priceType:   (service as any).priceType,
      status:      'confirmed',
      notes:       item.notes,
      groupId,
      source:      'pro',
    });
    tempCart.push({ staffId: item.staffId, date: item.date, time: item.time, duration: (service as any).duration, status: 'confirmed' });
  }

  const created = await Rdv.insertMany(toCreate);
  return NextResponse.json({ ok: true, rdvs: created }, { status: 201 });
}
