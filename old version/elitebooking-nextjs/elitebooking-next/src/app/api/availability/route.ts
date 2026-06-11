import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Rdv from '@/models/Rdv'
import { isSlotFree, generateSlots } from '@/lib/utils'

// GET /api/availability?salonId=&staffId=&date=&duration=
export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const salonId  = searchParams.get('salonId')
  const staffId  = searchParams.get('staffId')
  const date     = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') || '30')

  if (!salonId || !staffId || !date) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const rdvs = await Rdv.find({ salonId, date, status: { $ne: 'cancelled' } })
  const slots = generateSlots()

  const availability = slots.map(t => ({
    time: t,
    free: isSlotFree(rdvs, staffId, date, t, duration),
  }))

  return NextResponse.json(availability)
}
