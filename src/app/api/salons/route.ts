import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const q = searchParams.get('q');
  let query = supabase.from('salons').select('*').eq('active', true);
  if (city)     query = query.eq('city', city);
  if (category) query = query.eq('category', category);
  if (q)        query = query.ilike('name', `%${q}%`);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const { data, error } = await query.order('rating', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '401' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('type, salon_id').eq('id', user.id).single();
  if (profile?.type !== 'pro') return NextResponse.json({ error: '403' }, { status: 403 });
  // Resolve salon_id — use profile.salon_id or fallback to owner lookup
  let salonId = profile.salon_id;
  if (!salonId) {
    const { data: s } = await supabase.from('salons').select('id').eq('owner_id', user.id).maybeSingle();
    salonId = s?.id || null;
  }
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });
  const body = await req.json();
  const allowed = ['name','city','category','address','phone','email','description','whatsapp','instagram','cover_image','pin'];
  const update: Record<string, unknown> = {};
  allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });
  const { data, error } = await supabase.from('salons').update(update).eq('id', salonId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}