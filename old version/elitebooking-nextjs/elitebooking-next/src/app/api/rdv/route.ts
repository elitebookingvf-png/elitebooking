import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Rdv from '@/models/Rdv'
import { isSlotFree, timeToMin } from '@/lib/utils'

// GET /api/rdv?salonId=&clientId=&date=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const filter: any = {}

  const salonId  = searchParams.get('salonId')
  const clientId = searchParams.get('clientId')
  const date     = searchParams.get('date')
  const staffId  = searchParams.get('staffId')

  if (salonId)  filter.salonId = salonId
  if (clientId) filter.clientId = clientId
  if (date)     filter.date = date
  if (staffId)  filter.staffId = staffId

  const rdvs = await Rdv.find(filter).sort({ date: 1, time: 1 })
  return NextResponse.json(rdvs)
}

// POST /api/rdv — create booking
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const { salonId, staffId, date, time, duration } = body

  if (!salonId || !staffId || !date || !time) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  // Conflict check
  const existingRdvs = await Rdv.find({ salonId, date, status: { $ne: 'cancelled' } })
  const free = isSlotFree(existingRdvs, staffId, date, time, duration || 30)
  if (!free) {
    return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
  }

  const rdv = await Rdv.create({
    ...body,
    clientId: (session.user as any).id,
    status: 'confirmed',
  })

  return NextResponse.json(rdv, { status: 201 })
}
