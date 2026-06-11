// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { firstname, lastname, email, password, type, phone, salonName, salonCity, salonCategory, salonAddress, salonDescription, salonIce, city, category } = await req.json();
    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const supabase      = createClient();
    const adminSupabase = createAdminClient();

    // Handle build-time null clients
    if (!supabase || !adminSupabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable during build' }, { status: 503 });
    }

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

    // 2. Update profile — trigger already created the row, just patch phone & type
    const { error: profileErr } = await (adminSupabase.from('profiles') as any)
      .update({ firstname, lastname, phone: phone || null, type: type || 'client' })
      .eq('id', userId);
    if (profileErr) {
      console.error('[register] profile update error:', profileErr);
      // Non-fatal: trigger created basic profile, continue
    }

    // 3. Si pro → créer salon + schedule + lier profil
    if (type === 'pro') {
      const resolvedSalonName = salonName || 'Mon Salon';
      const resolvedCity      = salonCity || city || 'Casablanca';
      const resolvedCategory  = salonCategory || category || 'coiffure';

      const { data: salon, error: salonError } = await (adminSupabase.from('salons') as any).insert({
        owner_id:    userId,
        name:        resolvedSalonName,
        city:        resolvedCity,
        category:    resolvedCategory,
        address:     salonAddress     || null,
        description: salonDescription || null,
        ice:         salonIce         || null,
        rating:      4.5,
        active:      true,
        pin:         '0000',
      }).select().single();

      if (salonError) {
        console.error('[register] salon insert error:', salonError);
        return NextResponse.json({ error: `Salon creation failed: ${salonError.message}` }, { status: 500 });
      }

      // Créer le schedule par défaut
      const { error: schedErr } = await (adminSupabase.from('schedules') as any).insert({
        salon_id: salon.id,
        lu_open: true, lu_start: '09:00', lu_end: '19:00',
        ma_open: true, ma_start: '09:00', ma_end: '19:00',
        me_open: true, me_start: '09:00', me_end: '19:00',
        je_open: true, je_start: '09:00', je_end: '19:00',
        ve_open: true, ve_start: '09:00', ve_end: '19:00',
        sa_open: true, sa_start: '09:00', sa_end: '18:00',
        di_open: false, di_start: '09:00', di_end: '18:00',
      });
      if (schedErr) console.error('[register] schedule insert error:', schedErr);

      // Lier salon_id au profil
      const { error: linkErr } = await (adminSupabase.from('profiles') as any)
        .update({ salon_id: salon.id })
        .eq('id', userId);
      if (linkErr) {
        console.error('[register] profile link error:', linkErr);
        return NextResponse.json({ error: `Profile link failed: ${linkErr.message}` }, { status: 500 });
      }
    }

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(email, firstname, type || 'client').catch(console.error);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
