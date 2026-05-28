import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Rdv from '@/models/Rdv'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await connectDB()
  const rdv = await Rdv.findById(params.id)
  if (!rdv) return NextResponse.json({ error: 'RDV introuvable' }, { status: 404 })

  const user = session.user as any
  const isClient = rdv.clientId?.toString() === user.id
  const isPro    = user.type === 'pro' && rdv.salonId?.toString() === user.salonId

  if (!isClient && !isPro) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await Rdv.findByIdAndUpdate(params.id, body, { new: true })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await connectDB()
  const rdv = await Rdv.findById(params.id)
  if (!rdv) return NextResponse.json({ error: 'RDV introuvable' }, { status: 404 })

  // Cancel instead of delete
  await Rdv.findByIdAndUpdate(params.id, { status: 'cancelled' })
  return NextResponse.json({ ok: true })
}
