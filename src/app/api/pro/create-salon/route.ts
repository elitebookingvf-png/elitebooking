import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // Try cookie-based session first, fall back to Bearer token
    let user: any = null;
    const supabase = createClient();
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    if (cookieUser) {
      user = cookieUser;
    } else {
      // Bearer token sent by browser client
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (token) {
        const { data: { user: tokenUser } } = await (admin as any).auth.getUser(token);
        user = tokenUser;
      }
    }
    if (!user) return NextResponse.json({ error: '401' }, { status: 401 });

    // Ensure profile type is pro
    await (admin.from('profiles') as any).update({ type: 'pro' }).eq('id', user.id);

    const { name, city, category, address, description } = await req.json();
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    // Check no salon already exists
    const { data: existing } = await (admin.from('salons') as any)
      .select('id').eq('owner_id', user.id).maybeSingle();
    if (existing) {
      // Link it to profile and return it
      await (admin.from('profiles') as any).update({ salon_id: existing.id }).eq('id', user.id);
      const { data: s } = await (admin.from('salons') as any).select('*').eq('id', existing.id).single();
      return NextResponse.json({ salon: s });
    }

    const { data: salon, error: salonErr } = await (admin.from('salons') as any).insert({
      owner_id:    user.id,
      name,
      city:        city        || 'Casablanca',
      category:    category    || 'coiffure',
      address:     address     || null,
      description: description || null,
      rating:      4.5,
      active:      true,
      pin:         '0000',
    }).select().single();

    if (salonErr) return NextResponse.json({ error: salonErr.message }, { status: 500 });

    // Default schedule
    await (admin.from('schedules') as any).insert({
      salon_id: salon.id,
      lu_open: true, lu_start: '09:00', lu_end: '19:00',
      ma_open: true, ma_start: '09:00', ma_end: '19:00',
      me_open: true, me_start: '09:00', me_end: '19:00',
      je_open: true, je_start: '09:00', je_end: '19:00',
      ve_open: true, ve_start: '09:00', ve_end: '19:00',
      sa_open: true, sa_start: '09:00', sa_end: '18:00',
      di_open: false, di_start: '09:00', di_end: '18:00',
    });

    // Link salon to profile
    await (admin.from('profiles') as any).update({ salon_id: salon.id }).eq('id', user.id);

    return NextResponse.json({ salon });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
