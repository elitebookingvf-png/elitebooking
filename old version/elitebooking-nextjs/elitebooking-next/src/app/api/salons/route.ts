import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Salon from '@/models/Salon'

// GET /api/salons?city=Casablanca&category=Coiffure&q=search
export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const category = searchParams.get('category')
  const q = searchParams.get('q')
  const ownerId = searchParams.get('ownerId')

  const filter: any = { active: true }
  if (city) filter.city = new RegExp(city, 'i')
  if (category) filter.category = category
  if (ownerId) filter.ownerId = ownerId
  if (q) filter.$or = [
    { name: new RegExp(q, 'i') },
    { description: new RegExp(q, 'i') },
  ]

  const salons = await Salon.find(filter).sort({ rating: -1 }).limit(50)
  return NextResponse.json(salons)
}

// POST /api/salons — create a new salon (pro only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  await connectDB()
  const body = await req.json()
  const salon = await Salon.create({
    ...body,
    ownerId: (session.user as any).id,
    rating: 5.0,
    reviewsCount: 0,
    active: true,
  })

  return NextResponse.json(salon, { status: 201 })
}
