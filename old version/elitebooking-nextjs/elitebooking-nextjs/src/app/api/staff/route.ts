import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Staff } from '@/models';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const staff = await Staff.find({ salonId, active: true }).lean();
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const body = await req.json();
  const st = await Staff.create({ salonId, ...body });
  return NextResponse.json(st, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const st = await Staff.findByIdAndUpdate(body.id, body, { new: true });
  return NextResponse.json(st);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const { id } = await req.json();
  await Staff.findByIdAndUpdate(id, { active: false });
  return NextResponse.json({ ok: true });
}
