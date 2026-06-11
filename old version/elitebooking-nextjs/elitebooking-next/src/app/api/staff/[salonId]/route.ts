import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Staff from '@/models/Staff'

export async function GET(_: NextRequest, { params }: { params: { salonId: string } }) {
  await connectDB()
  const staff = await Staff.find({ salonId: params.salonId })
  return NextResponse.json(staff)
}

export async function POST(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const staff = await Staff.create({ ...body, salonId: params.salonId })
  return NextResponse.json(staff, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const { _id, ...data } = body
  const staff = await Staff.findByIdAndUpdate(_id, data, { new: true })
  return NextResponse.json(staff)
}

export async function DELETE(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const { id } = await req.json()
  await Staff.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
