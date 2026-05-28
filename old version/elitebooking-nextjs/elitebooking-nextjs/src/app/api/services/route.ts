import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Service, ServiceCategory } from '@/models';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const [categories, services] = await Promise.all([
    ServiceCategory.find({ salonId }).sort({ order: 1 }).lean(),
    Service.find({ salonId, active: true }).sort({ order: 1 }).lean(),
  ]);
  return NextResponse.json({ categories, services });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const body = await req.json();
  if (body.type === 'category') {
    const cat = await ServiceCategory.create({ salonId, name: body.name, color: body.color || '#C17B4E', order: body.order || 0 });
    return NextResponse.json(cat, { status: 201 });
  }
  const svc = await Service.create({ salonId, ...body });
  return NextResponse.json(svc, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  if (body.type === 'category') {
    const cat = await ServiceCategory.findByIdAndUpdate(body.id, { name: body.name, color: body.color }, { new: true });
    return NextResponse.json(cat);
  }
  const svc = await Service.findByIdAndUpdate(body.id, body, { new: true });
  return NextResponse.json(svc);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const { id, type } = await req.json();
  if (type === 'category') {
    await ServiceCategory.findByIdAndDelete(id);
    // Uncategorize services
    await Service.updateMany({ catId: id }, { $unset: { catId: '' } });
  } else {
    await Service.findByIdAndDelete(id);
  }
  return NextResponse.json({ ok: true });
}
