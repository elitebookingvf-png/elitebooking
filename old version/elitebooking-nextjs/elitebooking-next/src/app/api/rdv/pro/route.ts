import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Rdv from '@/models/Rdv'
import { isSlotFree } from '@/lib/utils'

// POST /api/rdv/pro — Pro creates RDV manually
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

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
    return NextResponse.json({ error: 'Créneau déjà réservé pour cet employé' }, { status: 409 })
  }

  const rdv = await Rdv.create({
    ...body,
    clientId: 'pro-add',
    status: 'confirmed',
  })

  return NextResponse.json(rdv, { status: 201 })
}
