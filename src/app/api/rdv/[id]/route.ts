import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await req.json();
  
  // Build update object based on provided fields
  const updateData: any = {};
  
  // Handle status update
  if (body.status) {
    const allowed = ['confirmed','cancelled','completed','no-show'];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = body.status;
  }
  
  // Handle client info updates
  if (body.client_name !== undefined) updateData.client_name = body.client_name;
  if (body.client_phone !== undefined) updateData.client_phone = body.client_phone;
  if (body.client_id !== undefined) updateData.client_id = body.client_id;
  
  // Must have at least one field to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  
  const { data, error } = await supabase.from('rdvs').update(updateData).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  const supabase = createAdminClient();
  const { error } = await supabase.from('rdvs').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
