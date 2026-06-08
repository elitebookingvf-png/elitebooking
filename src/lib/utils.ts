// src/lib/utils.ts

/** Convertit 'HH:MM' en minutes depuis minuit */
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

/** Génère les créneaux de 30 en 30 minutes entre open et close (supporte 24h) */
export function generateSlots(openStr: string, closeStr: string, duration: number): string[] {
  const open  = tMin(openStr);
  let close   = tMin(closeStr);
  if (close <= open) close = 1440; // minuit = fin de journée
  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += 30) {
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
  { id: 'hammam',    label: 'Hammam & Spa',         emoji: '🛁' },
  { id: 'coiffure',  label: 'Coiffure',              emoji: '✂️' },
  { id: 'onglerie',  label: 'Onglerie',              emoji: '💅' },
  { id: 'massage',   label: 'Massage',               emoji: '💆' },
  { id: 'esthetic',  label: 'Esthétique',            emoji: '✨' },
  { id: 'barbier',   label: 'Barbier',               emoji: '💈' },
  { id: 'medecine',  label: 'Médecine esthétique',   emoji: '🩺' },
  { id: 'domicile',  label: 'À domicile',            emoji: '🏠' },
  { id: 'bienetre',  label: 'Bien-être',             emoji: '🧘' },
  { id: 'autre',     label: 'Autre',                 emoji: '⭐' },
] as const;

export const DAY_KEYS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'] as const;
export type DayKey = typeof DAY_KEYS[number];

/** Retourne la clé de jour (Lu/Ma/..) pour une date ISO */
export function dayKeyForISO(iso: string): DayKey {
  const dow = new Date(iso + 'T12:00').getDay();
  return DAY_KEYS[dow];
}

/** Clsx léger */
export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}
