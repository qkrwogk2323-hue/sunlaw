import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing env vars');

const BASE = 'https://www.veinspiral.com';
const PLATFORM_EMAIL = 'qkrwogk2323@hanmail.net';
const GENERAL_EMAIL = 'org-463i-legal-office-demo-v1-manager@example.com';
const GENERAL_ORG_ID = '85022bbc-dcdc-40b5-ae83-3786f7906cde';

const pagesToCheck = ['/settings/features','/admin/audit','/admin/support','/settings/content','/settings/organization'];
const toBase64Url = (v)=>Buffer.from(v,'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const storageKeyFromSupabaseUrl = (u)=>`sb-${new URL(u).hostname.split('.')[0]}-auth-token`;

async function createSessionCookie(email) {
  const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken:false, detectSessionInUrl:false, persistSession:false } });
  const anon = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken:false, detectSessionInUrl:false, persistSession:false } });
  const generated = await admin.auth.admin.generateLink({ type:'magiclink', email, options:{ redirectTo: BASE } });
  if (generated.error || !generated.data?.properties?.email_otp) throw new Error(`generateLink failed for ${email}: ${generated.error?.message}`);
  const verify = await anon.auth.verifyOtp({ email, token: generated.data.properties.email_otp, type: generated.data.properties.verification_type });
  if (verify.error || !verify.data?.session) throw new Error(`verifyOtp failed for ${email}: ${verify.error?.message}`);
  const session = { ...verify.data.session }; delete session.user;
  return { key: storageKeyFromSupabaseUrl(NEXT_PUBLIC_SUPABASE_URL), value: `base64-${toBase64Url(JSON.stringify(session))}` };
}

async function checkPages(page) {
  const rows = [];
  for (const path of pagesToCheck) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil:'domcontentloaded' });
    rows.push({ path, status: res?.status() ?? null, finalUrl: page.url(), body: ((await page.textContent('body')) ?? '').replace(/\s+/g,' ').slice(0,220) });
  }
  return rows;
}

async function runScenario(email, contextOrgForSwitch) {
  const cookie = await createSessionCookie(email);
  const browser = await chromium.launch({ headless:true });
  const context = await browser.newContext();
  await context.addCookies([{ name: cookie.key, value: cookie.value, domain:'www.veinspiral.com', path:'/', httpOnly:false, secure:true, sameSite:'Lax' }]);
  const page = await context.newPage();

  const before = await checkPages(page);
  await page.goto(`${BASE}/dashboard`, { waitUntil:'domcontentloaded' });

  const switchWithContext = await page.evaluate(async ({targetOrg, contextOrg}) => {
    const fd = new FormData(); fd.set('organizationId', targetOrg); fd.set('contextOrganizationId', contextOrg || '');
    const r = await fetch('/dashboard', { method:'POST', body: fd });
    return { ok: r.ok, status: r.status };
  }, { targetOrg: GENERAL_ORG_ID, contextOrg: contextOrgForSwitch });

  const switchWithoutContext = await page.evaluate(async (targetOrg) => {
    const fd = new FormData(); fd.set('organizationId', targetOrg);
    const r = await fetch('/dashboard', { method:'POST', body: fd });
    return { ok: r.ok, status: r.status };
  }, GENERAL_ORG_ID);

  const after = await checkPages(page);
  await browser.close();
  return { email, before, switchWithContext, switchWithoutContext, after, cookie };
}

async function runCurl(cookie, organizationId) {
  const cookieHeader = `${cookie.key}=${cookie.value}`;
  const expUrl = `${BASE}/api/exports/calendar?organizationId=${organizationId}`;
  const exp = await fetch(expUrl, { headers: { Cookie: cookieHeader } });
  const expBody = await exp.text();

  const prvUrl = `${BASE}/api/dashboard-ai/preview`;
  const prv = await fetch(prvUrl, { method:'POST', headers:{ Cookie: cookieHeader, 'Content-Type':'application/json' }, body: JSON.stringify({ organizationId, content:'test' }) });
  const prvBody = await prv.text();

  return {
    exports: { status: exp.status, body: expBody.slice(0,260) },
    preview: { status: prv.status, body: prvBody.slice(0,260) }
  };
}

const platform = await runScenario(PLATFORM_EMAIL, 'b15ae343-9e9a-4177-aa01-88cd225ff31e');
const general = await runScenario(GENERAL_EMAIL, '85022bbc-dcdc-40b5-ae83-3786f7906cde');
const curlPlatform = await runCurl(platform.cookie, GENERAL_ORG_ID);
const curlGeneral = await runCurl(general.cookie, GENERAL_ORG_ID);
console.log(JSON.stringify({ platform, general, curlPlatform, curlGeneral }, null, 2));
