import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Block from '@/models/Block'

export async function GET(req: NextRequest, { params }: { params: { salonId: string } }) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const filter: any = { salonId: params.salonId }
  if (date) filter.date = date
  const blocks = await Block.find(filter).sort({ date: 1, start: 1 })
  return NextResponse.json(blocks)
}

export async function POST(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const block = await Block.create({ ...body, salonId: params.salonId })
  return NextResponse.json(block, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { salonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).type !== 'pro') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const { id } = await req.json()
  await Block.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
