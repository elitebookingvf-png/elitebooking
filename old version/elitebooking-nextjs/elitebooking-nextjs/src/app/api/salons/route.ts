import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Salon } from '@/models';

// GET /api/salons?city=Casablanca&category=hammam&q=text
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const city     = searchParams.get('city');
  const category = searchParams.get('category');
  const q        = searchParams.get('q');
  const filter: any = { active: true };
  if (city)     filter.city = city;
  if (category) filter.category = category;
  if (q)        filter.name = { $regex: q, $options: 'i' };
  const salons = await Salon.find(filter).sort({ rating: -1 }).limit(50).lean();
  return NextResponse.json(salons);
}

// PUT /api/salons — update own salon (pro only)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  await connectDB();
  const salonId = (session.user as any).salonId;
  const body = await req.json();
  const allowed = ['name','city','address','phone','email','description','whatsapp','instagram','coverImage'];
  const update: any = {};
  allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });
  const salon = await Salon.findByIdAndUpdate(salonId, update, { new: true });
  return NextResponse.json(salon);
}
