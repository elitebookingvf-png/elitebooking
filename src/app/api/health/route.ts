import { NextResponse } from 'next/server';

// GET /api/health — deploy diagnostics: which commit is live and which env
// flags the serving project actually has (booleans only, never values)
export async function GET() {
  const rawApp = process.env.NEXT_PUBLIC_APP_URL || '';
  const app = rawApp.includes('=') ? rawApp.split('=').slice(1).join('=').trim()
            : (rawApp || 'https://www.elitebooking.ma');
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    project: process.env.VERCEL_PROJECT_ID || null,
    appUrl: app,
    env: {
      resendKey: !!process.env.RESEND_API_KEY,
      resendDomainVerified: process.env.RESEND_DOMAIN_VERIFIED === 'true',
      resendFrom: !!process.env.RESEND_FROM,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
