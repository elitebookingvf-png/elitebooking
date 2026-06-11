import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = 'EliteBooking <onboarding@resend.dev>';
const APP    = process.env.NEXT_PUBLIC_APP_URL || 'https://elitebooking-lac.vercel.app';
const VERIFIED_EMAIL = process.env.RESEND_VERIFIED_EMAIL || 'elitebookingvf@gmail.com';

async function send(to: string, subject: string, html: string) {
  const actualTo = process.env.RESEND_DOMAIN_VERIFIED === 'true' ? to : VERIFIED_EMAIL;
  const { data, error } = await resend.emails.send({ from: FROM, to: actualTo, subject: actualTo !== to ? `[Pour: ${to}] ${subject}` : subject, html });
  if (error) console.error('[email] Resend error:', JSON.stringify(error), '→ to:', actualTo);
  else console.log('[email] Sent ok id:', data?.id, '→ to:', actualTo);
}

// Bulletproof button — table-based, works in Gmail/Outlook/Apple Mail
function btn(href: string, label: string, bg: string, fg: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-table;margin:4px 8px 4px 0"><tr><td style="border-radius:10px;background:${bg}"><a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:${fg};text-decoration:none;border-radius:10px;background:${bg};mso-padding-alt:0">${label}</a></td></tr></table>`
}

function base(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden">
  <div style="background:#111;padding:28px 32px;text-align:center">
    <span style="color:#C17B4E;font-size:1.5rem;font-weight:800"><em style="color:#fff;font-style:normal">Elite</em>Booking</span>
  </div>
  <div style="padding:32px">${content}</div>
  <div style="background:#f7f7f7;padding:14px 32px;text-align:center;font-size:12px;color:#aaa;border-top:1px solid #eee">
    &copy; ${new Date().getFullYear()} EliteBooking &middot; Maroc &middot;
    <a href="${APP}" style="color:#C17B4E;text-decoration:none">elitebooking-lac.vercel.app</a>
  </div>
</div></body></html>`;
}

// ─── Welcome email ────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, firstname: string, type: 'client' | 'pro') {
  const isPro = type === 'pro';
  const html = base(`
    <h2 style="margin:0 0 12px;font-size:1.2rem;font-weight:800;color:#111">Bienvenue sur EliteBooking, ${firstname} ! 🎉</h2>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#555">Nous sommes ravis de vous compter parmi ${isPro ? 'nos partenaires professionnels' : 'notre communauté'}.</p>
    ${isPro ? `
    <p style="margin:0 0 8px;font-size:14px;color:#555">Votre salon est maintenant créé. Vous pouvez dès maintenant :</p>
    <ul style="padding-left:20px;color:#555;line-height:2;font-size:14px;margin:0 0 16px">
      <li>Configurer vos horaires d'ouverture</li>
      <li>Ajouter vos employés et prestations</li>
      <li>Gérer vos rendez-vous via l'agenda</li>
    </ul>` : `
    <p style="margin:0 0 8px;font-size:14px;color:#555">Vous pouvez dès maintenant :</p>
    <ul style="padding-left:20px;color:#555;line-height:2;font-size:14px;margin:0 0 16px">
      <li>Découvrir les meilleurs salons près de chez vous</li>
      <li>Réserver vos prestations en quelques clics</li>
      <li>Gérer tous vos rendez-vous depuis votre espace</li>
    </ul>`}
    <p style="margin:20px 0 8px">${btn(APP, isPro ? 'Accéder à mon espace pro' : 'Réserver maintenant', '#C17B4E', '#ffffff')}</p>
    <p style="font-size:12px;color:#aaa;margin-top:16px">Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.</p>
  `);
  await send(to, `Bienvenue sur EliteBooking, ${firstname} !`, html);
}

// ─── RDV confirmation (client) ────────────────────────────────
export async function sendRdvConfirmationEmail(to: string, rdvId: string, params: {
  clientName: string; salonName: string; serviceName: string;
  staffName: string; date: string; time: string; duration: number; price: string;
}) {
  const cancelUrl = `${APP}/rdv/action?id=${rdvId}&amp;action=cancel`;
  const modifyUrl = `${APP}/rdv/action?id=${rdvId}&amp;action=modify`;
  const dateFormatted = new Date(params.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const html = base(`
    <h2 style="margin:0 0 12px;font-size:1.2rem;font-weight:800;color:#111">Votre rendez-vous est confirmé ✅</h2>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#555">Bonjour <strong>${params.clientName}</strong>, votre réservation a bien été enregistrée.</p>
    <div style="background:#f9f9f9;border-radius:10px;padding:16px 20px;margin:18px 0;font-size:14px;line-height:2;color:#333">
      <strong>Salon :</strong> ${params.salonName}<br/>
      <strong>Prestation :</strong> ${params.serviceName}<br/>
      <strong>Avec :</strong> ${params.staffName}<br/>
      <strong>Date :</strong> ${dateFormatted}<br/>
      <strong>Heure :</strong> ${params.time}<br/>
      <strong>Durée :</strong> ${params.duration} min<br/>
      <strong>Prix :</strong> ${params.price}
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#555">Besoin de modifier ou d'annuler votre rendez-vous ?</p>
    <p style="margin:0 0 16px">
      ${btn(modifyUrl, '✏️ Modifier', '#eeeeee', '#333333')}
      ${btn(cancelUrl, '✕ Annuler', '#EB5757', '#ffffff')}
    </p>
    <p style="font-size:12px;color:#aaa">Ces liens sont valables 48h avant votre rendez-vous.</p>
  `);
  await send(to, `RDV confirmé — ${params.salonName} le ${params.date} à ${params.time}`, html);
}

// ─── New RDV notification (salon owner) ──────────────────────
export async function sendNewRdvNotificationEmail(to: string, params: {
  clientName: string; clientPhone?: string | null; serviceName: string;
  staffName: string; date: string; time: string; duration: number;
}) {
  const dateFormatted = new Date(params.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const html = base(`
    <h2 style="margin:0 0 12px;font-size:1.2rem;font-weight:800;color:#111">Nouveau rendez-vous 📅</h2>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#555">Un client vient de réserver en ligne.</p>
    <div style="background:#f9f9f9;border-radius:10px;padding:16px 20px;margin:18px 0;font-size:14px;line-height:2;color:#333">
      <strong>Client :</strong> ${params.clientName}${params.clientPhone ? ` &middot; 📞 ${params.clientPhone}` : ''}<br/>
      <strong>Prestation :</strong> ${params.serviceName}<br/>
      <strong>Employé :</strong> ${params.staffName}<br/>
      <strong>Date :</strong> ${dateFormatted}<br/>
      <strong>Heure :</strong> ${params.time}<br/>
      <strong>Durée :</strong> ${params.duration} min
    </div>
    <p style="margin:20px 0 8px">${btn(`${APP}/pro`, 'Voir l\'agenda', '#C17B4E', '#ffffff')}</p>
  `);
  await send(to, `Nouveau RDV — ${params.clientName} le ${params.date} à ${params.time}`, html);
}
