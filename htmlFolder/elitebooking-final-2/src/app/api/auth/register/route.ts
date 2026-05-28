// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { firstname, lastname, email, password, type, phone, salonName, city, category } = await req.json();
    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Client anon pour Auth uniquement (signUp ne nécessite pas la session)
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

    const userId = authData.user.id;

    // ⚠️ Admin client (service_role) pour toutes les écritures DB
    // → contourne RLS car l'utilisateur n'est pas encore authentifié côté serveur
    const admin = createAdminClient();

    // 2. Attendre que le trigger ait créé le profil (max 2 tentatives)
    let profile = null;
    for (let i = 0; i < 3; i++) {
      const { data } = await admin.from('profiles').select('id').eq('id', userId).single();
      if (data) { profile = data; break; }
      await new Promise(r => setTimeout(r, 300));
    }

    // Si le trigger n'a pas encore tourné, créer le profil manuellement
    if (!profile) {
      await admin.from('profiles').upsert({
        id:             userId,
        firstname:      firstname,
        lastname:       lastname,
        type:           type || 'client',
        phone:          phone ?? null,
        plan:           'trial',
        trial_ends_at:  new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else if (phone) {
      await admin.from('profiles').update({ phone }).eq('id', userId);
    }

    // 3. Si pro → créer salon + schedule + lier au profil
    if (type === 'pro') {
      if (!salonName || !city) {
        return NextResponse.json({ error: 'Nom du salon et ville requis pour un compte pro' }, { status: 400 });
      }

      const { data: salon, error: salonError } = await admin.from('salons').insert({
        owner_id:    userId,
        name:        salonName,
        city,
        category:    category || 'autre',
        rating:      4.5,
        active:      true,
        pin:         '0000',
      }).select().single();

      if (salonError) {
        console.error('Salon creation error:', salonError);
        return NextResponse.json({ error: 'Erreur création salon : ' + salonError.message }, { status: 500 });
      }

      // Schedule par défaut
      const { error: schedError } = await admin.from('schedules').insert({
        salon_id: salon.id,
        lu_open: true,  lu_start: '09:00', lu_end: '19:00',
        ma_open: true,  ma_start: '09:00', ma_end: '19:00',
        me_open: true,  me_start: '09:00', me_end: '19:00',
        je_open: true,  je_start: '09:00', je_end: '19:00',
        ve_open: true,  ve_start: '09:00', ve_end: '19:00',
        sa_open: true,  sa_start: '09:00', sa_end: '18:00',
        di_open: false, di_start: '09:00', di_end: '18:00',
      });
      if (schedError) console.error('Schedule creation error:', schedError);

      // Lier le salon au profil
      const { error: linkError } = await admin.from('profiles')
        .update({ salon_id: salon.id, type: 'pro' })
        .eq('id', userId);
      if (linkError) console.error('Profile link error:', linkError);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    console.error('Register error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

