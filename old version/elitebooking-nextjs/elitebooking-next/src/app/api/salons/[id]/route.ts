import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Salon from '@/models/Salon'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await connectDB()
  const salon = await Salon.findById(params.id)
  if (!salon) return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 })
  return NextResponse.json(salon)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await connectDB()
  const salon = await Salon.findById(params.id)
  if (!salon) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (salon.ownerId.toString() !== (session.user as any).id) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await Salon.findByIdAndUpdate(params.id, body, { new: true })
  return NextResponse.json(updated)
}
