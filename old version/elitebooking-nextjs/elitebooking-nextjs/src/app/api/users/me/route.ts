import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User, Salon } from '@/models';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const userId = (session.user as any).id;
  const user = await User.findById(userId).select('-password').lean();
  if ((session.user as any).type === 'pro') {
    const salon = await Salon.findOne({ ownerId: userId }).lean();
    return NextResponse.json({ user, salon });
  }
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '401' }, { status: 401 });
  await connectDB();
  const userId = (session.user as any).id;
  const body = await req.json();
  const updates: any = {};
  if (body.firstname) updates.firstname = body.firstname;
  if (body.lastname)  updates.lastname  = body.lastname;
  if (body.phone)     updates.phone     = body.phone;
  if (body.newPassword) {
    updates.password = await bcrypt.hash(body.newPassword, 12);
  }
  // PIN update (pro only, on salon doc)
  if (body.pin && (session.user as any).type === 'pro') {
    const salonId = (session.user as any).salonId;
    await Salon.findByIdAndUpdate(salonId, { pin: body.pin });
  }
  const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password').lean();
  return NextResponse.json({ user });
}
