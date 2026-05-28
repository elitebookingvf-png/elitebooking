// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { firstname, lastname, email, password, type, phone, salonName, salonCity, salonCategory, salonAddress, salonDescription, city, category } = await req.json();
    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const supabase      = createClient();
    const adminSupabase = createAdminClient();

    // 1. Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstname, lastname, type: type || 'client' },
      },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    if (!authData.user) return NextResponse.json({ error: 'Erreur création compte' }, { status: 500 });

    const userId = authData.user.id;

    // 2. Upsert profile with correct fields (admin bypasses RLS — no session yet)
    await (adminSupabase.from('profiles') as any).upsert({
      id:        userId,
      firstname,
      lastname,
      phone:     phone || null,
      type:      type || 'client',
    });

    // 3. Si pro → créer salon + schedule + lier profil
    if (type === 'pro') {
      const resolvedSalonName     = salonName     || 'Mon Salon';
      const resolvedCity          = salonCity     || city          || 'Casablanca';
      const resolvedCategory      = salonCategory || category      || 'coiffure';

      const { data: salon, error: salonError } = await (adminSupabase.from('salons') as any).insert({
        owner_id:    userId,
        name:        resolvedSalonName,
        city:        resolvedCity,
        category:    resolvedCategory,
        address:     salonAddress     || null,
        description: salonDescription || null,
        rating:      4.5,
        active:      true,
        pin:         '0000',
      }).select().single();

      if (salonError) return NextResponse.json({ error: salonError.message }, { status: 500 });

      // Créer le schedule par défaut
      await (adminSupabase.from('schedules') as any).insert({
        salon_id: salon.id,
        lu_open: true, lu_start: '09:00', lu_end: '19:00',
        ma_open: true, ma_start: '09:00', ma_end: '19:00',
        me_open: true, me_start: '09:00', me_end: '19:00',
        je_open: true, je_start: '09:00', je_end: '19:00',
        ve_open: true, ve_start: '09:00', ve_end: '19:00',
        sa_open: true, sa_start: '09:00', sa_end: '18:00',
        di_open: false, di_start: '09:00', di_end: '18:00',
      });

      // Lier salon_id au profil
      await (adminSupabase.from('profiles') as any)
        .update({ salon_id: salon.id })
        .eq('id', userId);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
