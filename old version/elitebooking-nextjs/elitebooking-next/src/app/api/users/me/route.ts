import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  await connectDB()
  const user = await User.findById((session.user as any).id).select('-password')
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const { password, ...data } = body

  const update: any = { ...data }
  if (password) {
    const bcrypt = await import('bcryptjs')
    update.password = await bcrypt.hash(password, 12)
  }

  const user = await User.findByIdAndUpdate(
    (session.user as any).id, update, { new: true }
  ).select('-password')

  return NextResponse.json(user)
}
