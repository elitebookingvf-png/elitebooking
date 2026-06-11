import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromCookies } from '@/lib/supabase/server';

async function getProSalonId(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('type, salon_id').eq('id', userId).single();
  if (data?.type === 'pro' && data.salon_id) return data.salon_id;
  if (data?.type === 'pro') {
    const { data: s } = await supabase.from('salons').select('id').eq('owner_id', userId).maybeSingle();
    return s?.id || null;
  }
  return null;
}

// GET /api/clients/search?q=searchTerm
// Search for clients by name or phone number from the salon's existing RDVs and registered users
export async function GET(req: NextRequest) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: '401' }, { status: 401 });
  
  const supabase = createAdminClient();
  const salonId = await getProSalonId(supabase, userId);
  if (!salonId) return NextResponse.json({ error: '403' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ clients: [] });
  }

  try {
    // Search in existing RDVs for this salon
    const { data: rdvClients } = await supabase
      .from('rdvs')
      .select('client_name, client_phone, client_id')
      .eq('salon_id', salonId)
      .or(`client_name.ilike.%${query}%,client_phone.ilike.%${query}%`)
      .limit(20);

    // Search in registered profiles (clients who have accounts)
    const { data: registeredClients } = await supabase
      .from('profiles')
      .select('id, firstname, lastname, phone')
      .eq('type', 'client')
      .or(`firstname.ilike.%${query}%,lastname.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20);

    // Combine and deduplicate results
    const clientMap = new Map();

    // Add RDV clients
    rdvClients?.forEach((client: any) => {
      const key = client.client_id || client.client_name;
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          id: client.client_id,
          name: client.client_name,
          phone: client.client_phone,
          isRegistered: !!client.client_id,
          source: 'rdv'
        });
      }
    });

    // Add registered clients
    registeredClients?.forEach((client: any) => {
      const fullName = `${client.firstname} ${client.lastname}`.trim();
      const key = client.id;
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          id: client.id,
          name: fullName,
          phone: client.phone,
          isRegistered: true,
          source: 'profile'
        });
      }
    });

    const clients = Array.from(clientMap.values())
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.name.toLowerCase() === query.toLowerCase() || 
                      a.phone?.includes(query);
        const bExact = b.name.toLowerCase() === query.toLowerCase() || 
                      b.phone?.includes(query);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        // Then prioritize registered clients
        if (a.isRegistered && !b.isRegistered) return -1;
        if (!a.isRegistered && b.isRegistered) return 1;
        // Then alphabetically
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10); // Limit to 10 results

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('[clients search] error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
