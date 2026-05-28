import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Block } from '@/models';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const filter: any = { salonId };
  if (date) filter.date = date;
  const blocks = await Block.find(filter).sort({ date: 1, start: 1 }).lean();
  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const salonId = (session.user as any).salonId;
  const body = await req.json();
  const block = await Block.create({ ...body, salonId });
  return NextResponse.json(block, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const { id } = await req.json();
  await Block.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
