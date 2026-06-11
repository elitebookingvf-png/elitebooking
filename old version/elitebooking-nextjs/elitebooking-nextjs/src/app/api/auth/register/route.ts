import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User, Salon, Schedule } from '@/models';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { firstname, lastname, email, password, type, phone, salonName, city, category } = await req.json();

    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const user = await User.create({
      firstname, lastname,
      email: email.toLowerCase(),
      password: hash,
      type: type || 'client',
      phone,
      trialEndsAt,
      plan: 'trial',
    });

    // If pro → create salon + default schedule
    if (type === 'pro' && salonName && city) {
      const salon = await Salon.create({
        ownerId:  user._id,
        name:     salonName,
        city,
        category: category || 'autre',
        rating:   4.5,
        active:   true,
        pin:      '0000',
      });
      await Schedule.create({
        salonId: salon._id,
        Lu: { open: true,  start: '09:00', end: '19:00' },
        Ma: { open: true,  start: '09:00', end: '19:00' },
        Me: { open: true,  start: '09:00', end: '19:00' },
        Je: { open: true,  start: '09:00', end: '19:00' },
        Ve: { open: true,  start: '09:00', end: '19:00' },
        Sa: { open: true,  start: '09:00', end: '18:00' },
        Di: { open: false, start: '09:00', end: '18:00' },
      });
      user.salonId = salon._id as any;
      await user.save();
    }

    return NextResponse.json({ ok: true, userId: user._id.toString() }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
