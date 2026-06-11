import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Schedule from '@/models/Schedule'

export async function GET(_: NextRequest, { params }: { params: { salonId: string } }) {
  await connectDB()
  const schedule = await Schedule.findOne({ salonId: params.salonId })
  if (!schedule) {
    // Return default schedule
    return NextResponse.json({
      days: {
        Lu: { open: true,  start: '09:00', end: '19:00' },
        Ma: { open: true,  start: '09:00', end: '19:00' },
        Me: { open: true,  start: '09:00', end: '19:00' },
        Je: { open: true,  start: '09:00', end: '19:00' },
        Ve: { open: true,  start: '09:00', end: '19:00' },
        Sa: { open: true,  start: '09:00', end: '18:00' },
        Di: { open: false, start: '09:00', end: '18:00' },
      }
    })
  }
  return NextResponse.json(schedule)
}

export async function PUT(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const schedule = await Schedule.findOneAndUpdate(
    { salonId: params.salonId },
    { salonId: params.salonId, ...body },
    { new: true, upsert: true }
  )
  return NextResponse.json(schedule)
}
