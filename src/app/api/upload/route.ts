import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies, getProSalonId } from '@/lib/supabase/server';

// POST /api/upload — pro uploads their salon's cover photo to public storage.
// Multipart form field: "file" (image, max 5MB).
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Fichier image requis' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image trop lourde (5 Mo max)' }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${salonId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('salon-images')
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from('salon-images').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
