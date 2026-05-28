// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { firstname, lastname, email, password, type, phone, salonName, city, category } = await req.json();
    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstname, lastname, type: type || 'client' },
        // emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    if (!authData.user) return NextResponse.json({ error: 'Erreur création compte' }, { status: 500 });

    // 2. Mettre à jour le profil (phone)
    if (phone) {
      await (supabase.from('profiles') as any).update({ phone }).eq('id', authData.user.id);
    }

    // 3. Si pro → créer salon + schedule
    if (type === 'pro' && salonName && city) {
      const { data: salon, error: salonError } = await (supabase.from('salons') as any).insert({
        owner_id:    authData.user.id,
        name:        salonName,
        city,
        category:    category || 'autre',
        rating:      4.5,
        active:      true,
        pin:         '0000',
      }).select().single();

      if (salonError) return NextResponse.json({ error: salonError.message }, { status: 500 });

      // Créer le schedule par défaut
      await (supabase.from('schedules') as any).insert({
        salon_id: salon.id,
        lu_open: true, lu_start: '09:00', lu_end: '19:00',
        ma_open: true, ma_start: '09:00', ma_end: '19:00',
        me_open: true, me_start: '09:00', me_end: '19:00',
        je_open: true, je_start: '09:00', je_end: '19:00',
        ve_open: true, ve_start: '09:00', ve_end: '19:00',
        sa_open: true, sa_start: '09:00', sa_end: '18:00',
        di_open: false, di_start: '09:00', di_end: '18:00',
      });

      // Lier salon au profil
      await (supabase.from('profiles') as any).update({ salon_id: salon.id }).eq('id', authData.user.id);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
