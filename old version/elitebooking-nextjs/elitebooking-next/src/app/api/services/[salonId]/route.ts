import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Service from '@/models/Service'

export async function GET(_: NextRequest, { params }: { params: { salonId: string } }) {
  await connectDB()
  const services = await Service.find({ salonId: params.salonId })
  return NextResponse.json(services)
}

export async function POST(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const service = await Service.create({ ...body, salonId: params.salonId })
  return NextResponse.json(service, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const { _id, ...data } = body
  const service = await Service.findByIdAndUpdate(_id, data, { new: true, upsert: false })
  return NextResponse.json(service)
}

export async function DELETE(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const { id } = await req.json()
  await Service.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
