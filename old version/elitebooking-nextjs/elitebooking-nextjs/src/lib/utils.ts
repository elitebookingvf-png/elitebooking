export const tMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function isSlotFree(
  rdvs: Array<{ staffId: string; date: string; time: string; duration: number; status: string }>,
  staffId: string,
  date: string,
  time: string,
  duration: number
): boolean {
  const ts = tMin(time);
  const te = ts + duration;
  return !rdvs.some(r => {
    if (r.staffId.toString() !== staffId.toString()) return false;
    if (r.date !== date) return false;
    if (r.status === 'cancelled') return false;
    const rs = tMin(r.time);
    const re = rs + r.duration;
    return ts < re && te > rs;
  });
}

export function generateSlots(openStr: string, closeStr: string, duration: number): string[] {
  const open  = tMin(openStr);
  const close = tMin(closeStr);
  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += 30) {
    slots.push(
      String(Math.floor(t / 60)).padStart(2, '0') + ':' +
      String(t % 60).padStart(2, '0')
    );
  }
  return slots;
}

export const CITIES = [
  'Casablanca','Rabat','Marrakech','Fès','Tanger',
  'Agadir','Meknès','Oujda','Tétouan','Salé',
];

export const CATEGORIES = [
  { id: 'hammam',   label: 'Hammam & Spa',  emoji: '🛁' },
  { id: 'coiffure', label: 'Coiffure',      emoji: '✂️' },
  { id: 'onglerie', label: 'Onglerie',      emoji: '💅' },
  { id: 'massage',  label: 'Massage',       emoji: '💆' },
  { id: 'esthetic', label: 'Esthétique',    emoji: '✨' },
  { id: 'barbier',  label: 'Barbier',       emoji: '💈' },
  { id: 'autre',    label: 'Autre',         emoji: '🏠' },
];

export function formatPrice(price: number, priceType: string): string {
  if (priceType === 'quote') return 'Sur devis';
  if (priceType === 'from')  return `À partir de ${price.toLocaleString('fr-FR')} MAD`;
  return `${price.toLocaleString('fr-FR')} MAD`;
}
