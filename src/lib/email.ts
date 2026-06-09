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

function baseHtml(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#222}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:#111;padding:32px 32px 24px;text-align:center}
  .header span{color:#C17B4E;font-size:1.6rem;font-weight:800;letter-spacing:-0.5px}
  .header span em{color:#fff;font-style:normal}
  .body{padding:32px}
  .body h2{margin:0 0 12px;font-size:1.25rem;font-weight:700}
  .body p{margin:0 0 16px;font-size:0.95rem;line-height:1.6;color:#444}
  .card{background:#f9f9f9;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:0.9rem;line-height:1.8}
  .card b{color:#111}
  .btns{display:flex;gap:12px;margin:24px 0;flex-wrap:wrap}
  .btn{display:inline-block;padding:12px 24px;border-radius:10px;font-weight:700;font-size:0.9rem;text-decoration:none;text-align:center}
  .btn-primary{background:#C17B4E;color:#fff}
  .btn-danger{background:#EB5757;color:#fff}
  .btn-secondary{background:#f0f0f0;color:#333}
  .footer{background:#f7f7f7;padding:16px 32px;text-align:center;font-size:0.75rem;color:#aaa;border-top:1px solid #eee}
</style></head><body>
<div class="wrap">
  <div class="header"><span><em>Elite</em>Booking</span></div>
  <div class="body">${content}</div>
  <div class="footer">© ${new Date().getFullYear()} EliteBooking · Maroc · <a href="${APP}" style="color:#C17B4E;text-decoration:none">elitebooking.ma</a></div>
</div></body></html>`;
}

// ─── Welcome email (new account) ─────────────────────────────
export async function sendWelcomeEmail(to: string, firstname: string, type: 'client' | 'pro') {
  const isPro = type === 'pro';
  const content = `
    <h2>Bienvenue sur EliteBooking, ${firstname} ! 🎉</h2>
    <p>Nous sommes ravis de vous compter parmi ${isPro ? 'nos partenaires professionnels' : 'notre communauté'}.</p>
    ${isPro ? `
    <p>Votre salon est maintenant créé. Vous pouvez dès maintenant :</p>
    <ul style="padding-left:20px;color:#444;line-height:2">
      <li>Configurer vos horaires d'ouverture</li>
      <li>Ajouter vos employés et prestations</li>
      <li>Gérer vos rendez-vous via l'agenda</li>
    </ul>
    ` : `
    <p>Vous pouvez dès maintenant :</p>
    <ul style="padding-left:20px;color:#444;line-height:2">
      <li>Découvrir les meilleurs salons près de chez vous</li>
      <li>Réserver vos prestations en quelques clics</li>
      <li>Gérer tous vos rendez-vous depuis votre espace</li>
    </ul>
    `}
    <div class="btns">
      <a href="${APP}" class="btn btn-primary">${isPro ? 'Accéder à mon espace pro' : 'Réserver maintenant'}</a>
    </div>
    <p style="font-size:0.85rem;color:#aaa">Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.</p>
  `;
  await send(to, `Bienvenue sur EliteBooking, ${firstname} !`, baseHtml(content));
}

// ─── RDV confirmation (to client) ────────────────────────────
export async function sendRdvConfirmationEmail(to: string, rdvId: string, params: {
  clientName: string; salonName: string; serviceName: string;
  staffName: string; date: string; time: string; duration: number; price: string;
}) {
  const cancelUrl = `${APP}/rdv/action?id=${rdvId}&action=cancel`;
  const modifyUrl = `${APP}/rdv/action?id=${rdvId}&action=modify`;
  const dateFormatted = new Date(params.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const content = `
    <h2>Votre rendez-vous est confirmé ✅</h2>
    <p>Bonjour <b>${params.clientName}</b>, votre réservation a bien été enregistrée.</p>
    <div class="card">
      <b>Salon :</b> ${params.salonName}<br/>
      <b>Prestation :</b> ${params.serviceName}<br/>
      <b>Avec :</b> ${params.staffName}<br/>
      <b>Date :</b> ${dateFormatted}<br/>
      <b>Heure :</b> ${params.time}<br/>
      <b>Durée :</b> ${params.duration} min<br/>
      <b>Prix :</b> ${params.price}
    </div>
    <p>Besoin de modifier ou d'annuler votre rendez-vous ?</p>
    <div class="btns">
      <a href="${modifyUrl}" class="btn btn-secondary">✏️ Modifier</a>
      <a href="${cancelUrl}" class="btn btn-danger">✕ Annuler</a>
    </div>
    <p style="font-size:0.82rem;color:#aaa">Ces liens sont valables 48h avant votre rendez-vous.</p>
  `;
  await send(to, `RDV confirmé — ${params.salonName} le ${params.date} à ${params.time}`, baseHtml(content));
}

// ─── New RDV notification (to salon owner) ───────────────────
export async function sendNewRdvNotificationEmail(to: string, params: {
  clientName: string; clientPhone?: string | null; serviceName: string;
  staffName: string; date: string; time: string; duration: number;
}) {
  const dateFormatted = new Date(params.date + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const content = `
    <h2>Nouveau rendez-vous 📅</h2>
    <p>Un client vient de réserver en ligne.</p>
    <div class="card">
      <b>Client :</b> ${params.clientName}${params.clientPhone ? ` · 📞 ${params.clientPhone}` : ''}<br/>
      <b>Prestation :</b> ${params.serviceName}<br/>
      <b>Employé :</b> ${params.staffName}<br/>
      <b>Date :</b> ${dateFormatted}<br/>
      <b>Heure :</b> ${params.time}<br/>
      <b>Durée :</b> ${params.duration} min
    </div>
    <div class="btns">
      <a href="${APP}/pro/agenda" class="btn btn-primary">Voir l'agenda</a>
    </div>
  `;
  await send(to, `Nouveau RDV — ${params.clientName} le ${params.date} à ${params.time}`, baseHtml(content));
}
