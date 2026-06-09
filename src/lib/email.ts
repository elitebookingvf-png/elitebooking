import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = 'EliteBooking <onboarding@resend.dev>';
const APP    = process.env.NEXT_PUBLIC_APP_URL || 'https://elitebooking-lac.vercel.app';

// Until a custom domain is verified, Resend only allows sending to the account owner email.
// VERIFIED_EMAIL is the email you signed up with on resend.com
const VERIFIED_EMAIL = process.env.RESEND_VERIFIED_EMAIL || 'elitebookingvf@gmail.com';

async function send(to: string, subject: string, html: string) {
  // If domain not verified, redirect to the verified email so at least owner gets it
  const actualTo = process.env.RESEND_DOMAIN_VERIFIED === 'true' ? to : VERIFIED_EMAIL;
  const { data, error } = await resend.emails.send({ from: FROM, to: actualTo, subject: actualTo !== to ? `[Pour: ${to}] ${subject}` : subject, html });
  if (error) console.error('[email] Resend error:', JSON.stringify(error), '→ to:', actualTo);
  else console.log('[email] Sent ok id:', data?.id, '→ to:', actualTo);
}

const S = {
  body:   'margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222',
  wrap:   'max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden',
  header: 'background:#111;padding:28px 32px;text-align:center',
  logo:   'color:#C17B4E;font-size:1.5rem;font-weight:800',
  logoW:  'color:#fff;font-style:normal',
  inner:  'padding:32px',
  h2:     'margin:0 0 12px;font-size:1.2rem;font-weight:800;color:#111',
  p:      'margin:0 0 14px;font-size:0.9rem;line-height:1.6;color:#555',
  card:   'background:#f9f9f9;border-radius:10px;padding:16px 20px;margin:18px 0;font-size:0.88rem;line-height:1.9;color:#333',
  footer: 'background:#f7f7f7;padding:14px 32px;text-align:center;font-size:0.73rem;color:#aaa;border-top:1px solid #eee',
  btnP:   'display:inline-block;background:#C17B4E;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:0.88rem;margin:4px 6px 4px 0',
  btnD:   'display:inline-block;background:#EB5757;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:0.88rem;margin:4px 6px 4px 0',
  btnS:   'display:inline-block;background:#eeeeee;color:#333333;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:0.88rem;margin:4px 6px 4px 0',
}

function base(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="${S.body}">
<div style="${S.wrap}">
  <div style="${S.header}"><span style="${S.logo}"><em style="${S.logoW}">Elite</em>Booking</span></div>
  <div style="${S.inner}">${content}</div>
  <div style="${S.footer}">© ${new Date().getFullYear()} EliteBooking &middot; Maroc &middot; <a href="${APP}" style="color:#C17B4E;text-decoration:none">elitebooking-lac.vercel.app</a></div>
</div></body></html>`;
}

// ─── Welcome email (new account) ─────────────────────────────
export async function sendWelcomeEmail(to: string, firstname: string, type: 'client' | 'pro') {
  const isPro = type === 'pro';
  const html = base(`
    <h2 style="${S.h2}">Bienvenue sur EliteBooking, ${firstname} ! 🎉</h2>
    <p style="${S.p}">Nous sommes ravis de vous compter parmi ${isPro ? 'nos partenaires professionnels' : 'notre communauté'}.</p>
    ${isPro ? `
    <p style="${S.p}">Votre salon est maintenant créé. Vous pouvez dès maintenant :</p>
    <ul style="padding-left:20px;color:#555;line-height:2;font-size:0.9rem">
      <li>Configurer vos horaires d'ouverture</li>
      <li>Ajouter vos employés et prestations</li>
      <li>Gérer vos rendez-vous via l'agenda</li>
    </ul>` : `
    <p style="${S.p}">Vous pouvez dès maintenant :</p>
    <ul style="padding-left:20px;color:#555;line-height:2;font-size:0.9rem">
      <li>Découvrir les meilleurs salons près de chez vous</li>
      <li>Réserver vos prestations en quelques clics</li>
      <li>Gérer tous vos rendez-vous depuis votre espace</li>
    </ul>`}
    <p style="margin:20px 0 8px">
      <a href="${APP}" style="${S.btnP}">${isPro ? 'Accéder à mon espace pro' : 'Réserver maintenant'}</a>
    </p>
    <p style="font-size:0.8rem;color:#aaa;margin-top:16px">Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.</p>
  `);
  await send(to, `Bienvenue sur EliteBooking, ${firstname} !`, html);
}

// ─── RDV confirmation (to client) ────────────────────────────
export async function sendRdvConfirmationEmail(to: string, rdvId: string, params: {
  clientName: string; salonName: string; serviceName: string;
  staffName: string; date: string; time: string; duration: number; price: string;
}) {
  const cancelUrl = `${APP}/rdv/action?id=${rdvId}&action=cancel`;
  const modifyUrl = `${APP}/rdv/action?id=${rdvId}&action=modify`;
  const dateFormatted = new Date(params.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const html = base(`
    <h2 style="${S.h2}">Votre rendez-vous est confirmé ✅</h2>
    <p style="${S.p}">Bonjour <strong>${params.clientName}</strong>, votre réservation a bien été enregistrée.</p>
    <div style="${S.card}">
      <strong>Salon :</strong> ${params.salonName}<br/>
      <strong>Prestation :</strong> ${params.serviceName}<br/>
      <strong>Avec :</strong> ${params.staffName}<br/>
      <strong>Date :</strong> ${dateFormatted}<br/>
      <strong>Heure :</strong> ${params.time}<br/>
      <strong>Durée :</strong> ${params.duration} min<br/>
      <strong>Prix :</strong> ${params.price}
    </div>
    <p style="${S.p}">Besoin de modifier ou d'annuler votre rendez-vous ?</p>
    <p style="margin:0 0 16px">
      <a href="${modifyUrl}" style="${S.btnS}">✏️ Modifier</a>
      <a href="${cancelUrl}" style="${S.btnD}">✕ Annuler</a>
    </p>
    <p style="font-size:0.8rem;color:#aaa">Ces liens sont valables 48h avant votre rendez-vous.</p>
  `);
  await send(to, `RDV confirmé — ${params.salonName} le ${params.date} à ${params.time}`, html);
}

// ─── New RDV notification (to salon owner) ───────────────────
export async function sendNewRdvNotificationEmail(to: string, params: {
  clientName: string; clientPhone?: string | null; serviceName: string;
  staffName: string; date: string; time: string; duration: number;
}) {
  const dateFormatted = new Date(params.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const html = base(`
    <h2 style="${S.h2}">Nouveau rendez-vous 📅</h2>
    <p style="${S.p}">Un client vient de réserver en ligne.</p>
    <div style="${S.card}">
      <strong>Client :</strong> ${params.clientName}${params.clientPhone ? ` &middot; 📞 ${params.clientPhone}` : ''}<br/>
      <strong>Prestation :</strong> ${params.serviceName}<br/>
      <strong>Employé :</strong> ${params.staffName}<br/>
      <strong>Date :</strong> ${dateFormatted}<br/>
      <strong>Heure :</strong> ${params.time}<br/>
      <strong>Durée :</strong> ${params.duration} min
    </div>
    <p style="margin:20px 0 8px">
      <a href="${APP}/pro/agenda" style="${S.btnP}">Voir l'agenda</a>
    </p>
  `);
  await send(to, `Nouveau RDV — ${params.clientName} le ${params.date} à ${params.time}`, html);
}
