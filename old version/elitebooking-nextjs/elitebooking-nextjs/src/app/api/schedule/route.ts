import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Schedule } from '@/models';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const sch = await Schedule.findOne({ salonId }).lean();
  return NextResponse.json(sch);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const body = await req.json();
  const sch = await Schedule.findOneAndUpdate(
    { salonId },
    { $set: body },
    { new: true, upsert: true }
  );
  return NextResponse.json(sch);
}
