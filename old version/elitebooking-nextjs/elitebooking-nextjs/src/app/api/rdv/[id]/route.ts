import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Rdv } from '@/models';

// PATCH /api/rdv/:id  { status: 'cancelled' | 'completed' | 'no-show' }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await connectDB();
  const { status } = await req.json();
  const rdv = await Rdv.findById(params.id);
  if (!rdv) return NextResponse.json({ error: 'RDV non trouvé' }, { status: 404 });
  // Client can only cancel their own RDV; pro can change any in their salon
  const userId  = (session.user as any).id;
  const salonId = (session.user as any).salonId;
  const isOwner = rdv.clientId.toString() === userId;
  const isPro   = (session.user as any).type === 'pro' && rdv.salonId.toString() === salonId;
  if (!isOwner && !isPro) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  rdv.status = status;
  await rdv.save();
  return NextResponse.json({ ok: true, rdv });
}
