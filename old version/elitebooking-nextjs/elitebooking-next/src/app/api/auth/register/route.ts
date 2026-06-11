import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Salon from '@/models/Salon'

export async function POST(req: NextRequest) {
  try {
    const { firstname, lastname, email, password, phone, type, salonName, salonCategory, salonCity } = await req.json()

    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({
      firstname, lastname, email: email.toLowerCase(),
      password: hashed, phone, type: type || 'client'
    })

    // If pro, create their salon
    if (type === 'pro' && salonName) {
      const salon = await Salon.create({
        ownerId: user._id,
        name: salonName,
        category: salonCategory || 'Coiffure',
        city: salonCity || 'Casablanca',
      })
      await User.findByIdAndUpdate(user._id, { salonId: salon._id })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
