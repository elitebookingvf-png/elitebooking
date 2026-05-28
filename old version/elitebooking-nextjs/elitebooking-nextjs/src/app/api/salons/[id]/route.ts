import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Salon, ServiceCategory, Service, Staff, Schedule } from '@/models';

// GET /api/salons/:id — full salon detail for booking page
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const [salon, cats, services, staff, schedule] = await Promise.all([
    Salon.findById(params.id).lean(),
    ServiceCategory.find({ salonId: params.id }).sort({ order: 1 }).lean(),
    Service.find({ salonId: params.id, active: true }).sort({ order: 1 }).lean(),
    Staff.find({ salonId: params.id, active: true }).lean(),
    Schedule.findOne({ salonId: params.id }).lean(),
  ]);
  if (!salon) return NextResponse.json({ error: 'Salon non trouvé' }, { status: 404 });
  return NextResponse.json({ salon, categories: cats, services, staff, schedule });
}
