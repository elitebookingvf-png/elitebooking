// src/lib/utils.ts

/** Convertit 'HH:MM' en minutes depuis minuit */
export const minToTime = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const tMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Convertit une Date en 'YYYY-MM-DD' en heure locale (pas UTC) */
export const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Formate une date ISO en texte lisible */
export const formatDate = (iso: string): string => {
  const d = new Date(iso + 'T12:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export type RdvLike = {
  staff_id: string;
  date: string | Date;
  start_time: string;
  duration: number;
  status: string;
};

/**
 * Vérifie si un créneau est libre.
 * Règle : chevauchement strict ts < re && te > rs
 * Si un RDV finit à 15:30, le créneau 15:30 est LIBRE.
 */
export function isSlotFree(
  rdvs: RdvLike[],
  staffId: string,
  date: string,
  time: string,
  duration: number
): boolean {
  const ts = tMin(time);
  const te = ts + duration;
  return !rdvs.some(r => {
    const rDate = r.date instanceof Date ? toISO(r.date) : String(r.date);
    if (r.staff_id !== staffId) return false;
    if (rDate !== date) return false;
    if (r.status === 'cancelled') return false;
    const rs = tMin(r.start_time);
    const re = rs + r.duration;
    return ts < re && te > rs;
  });
}

/** Granularité des créneaux de réservation, en minutes */
export const SLOT_STEP = 5;

/** Génère les créneaux de SLOT_STEP en SLOT_STEP minutes entre open et close (supporte 24h) */
export function generateSlots(openStr: string, closeStr: string, duration: number): string[] {
  const open  = tMin(openStr);
  let close   = tMin(closeStr);
  if (close <= open) close = 1440; // minuit = fin de journée
  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += SLOT_STEP) {
    const h = Math.floor(t / 60) % 24;
    slots.push(
      String(h).padStart(2, '0') + ':' +
      String(t % 60).padStart(2, '0')
    );
  }
  return slots;
}

/** Formatte le prix selon le type */
export function formatPrice(price: number, priceType: string): string {
  if (priceType === 'quote') return 'Sur devis';
  if (priceType === 'from')  return `À partir de ${price.toLocaleString('fr-FR')} MAD`;
  return `${price.toLocaleString('fr-FR')} MAD`;
}

/** Résoud le nom du client depuis un RDV */
export function clientLabel(rdv: { client_name?: string | null }): string {
  return rdv.client_name || 'Client';
}

export const CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger',
  'Agadir', 'Meknès', 'Oujda', 'Tétouan', 'Salé',
];

export const CATEGORIES = [
  { id: 'hammam',    label: 'Hammam & Spa',         emoji: '🛁', icon: 'spa' },
  { id: 'coiffure',  label: 'Coiffure',              emoji: '✂️', icon: 'scissors' },
  { id: 'onglerie',  label: 'Onglerie',              emoji: '💅', icon: 'nails' },
  { id: 'massage',   label: 'Massage',               emoji: '💆', icon: 'massage' },
  { id: 'esthetic',  label: 'Esthétique',            emoji: '✨', icon: 'sparkle' },
  { id: 'barbier',   label: 'Barbier',               emoji: '💈', icon: 'razor' },
  { id: 'medecine',  label: 'Médecine esthétique',   emoji: '🩺', icon: 'stethoscope' },
  { id: 'domicile',  label: 'À domicile',            emoji: '🏠', icon: 'home' },
  { id: 'bienetre',  label: 'Bien-être',             emoji: '🧘', icon: 'leaf' },
  { id: 'autre',     label: 'Autre',                 emoji: '⭐', icon: 'star' },
] as const;

// ─── Géolocalisation ─────────────────────────────────────────
// Salons have a `city` but no coordinates — we geolocate at city level
// using fixed centroids (no geocoding service needed).
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
  'Rabat':      { lat: 34.0209, lng: -6.8416 },
  'Marrakech':  { lat: 31.6295, lng: -7.9811 },
  'Fès':        { lat: 34.0181, lng: -5.0078 },
  'Tanger':     { lat: 35.7595, lng: -5.8340 },
  'Agadir':     { lat: 30.4278, lng: -9.5981 },
  'Meknès':     { lat: 33.8935, lng: -5.5473 },
  'Oujda':      { lat: 34.6814, lng: -1.9086 },
  'Tétouan':    { lat: 35.5889, lng: -5.3626 },
  'Salé':       { lat: 34.0531, lng: -6.7985 },
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance (km) between a position and a city's centroid, null if unknown city */
export function distanceToCity(city: string, lat: number, lng: number): number | null {
  const c = CITY_COORDS[city];
  return c ? haversineKm(lat, lng, c.lat, c.lng) : null;
}

/** Nearest known city to a position */
export function nearestCity(lat: number, lng: number): { city: string; km: number } | null {
  let best: { city: string; km: number } | null = null;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (!best || km < best.km) best = { city, km };
  }
  return best;
}

/** 'À moins d'1 km' · '≈ 12 km' · '≈ 240 km' */
export function formatKm(km: number): string {
  if (km < 1) return "À moins d'1 km";
  return `≈ ${Math.round(km)} km`;
}

export const DAY_KEYS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'] as const;
export type DayKey = typeof DAY_KEYS[number];

// Columns safe to expose publicly — pin, owner_id, blocked_clients, ice stay private
export const PUBLIC_SALON_COLS = 'id,name,category,city,address,description,rating,review_count,phone,whatsapp,instagram,cover_image,active,created_at';
// Staff phone is not public
export const PUBLIC_STAFF_COLS = 'id,salon_id,firstname,lastname,role,days,start_time,end_time,avatar,active';

/** Retourne la clé de jour (Lu/Ma/..) pour une date ISO */
export function dayKeyForISO(iso: string): DayKey {
  const dow = new Date(iso + 'T12:00').getDay();
  return DAY_KEYS[dow];
}

/** 'YYYY-MM-DD' / 'HH:MM' actuels dans le fuseau du salon (Maroc) */
export function salonNow(): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
  return { date, time };
}

/** Vrai si le créneau (date + heure locales du salon) est déjà passé */
export function isPastSlot(date: string, time: string): boolean {
  const now = salonNow();
  return date < now.date || (date === now.date && time <= now.time);
}

/** Clsx léger */
export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}
