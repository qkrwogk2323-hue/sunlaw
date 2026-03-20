import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const BASE='https://www.veinspiral.com';
const EMAIL='qkrwogk2323@hanmail.net';
const TARGET_ORG='6b83d234-897e-43ef-8cf8-c7c7cf0a9f39';
const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const toBase64Url=(v)=>Buffer.from(v,'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const key=`sb-${new URL(NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

async function cookieFor(email){
  const admin=createClient(NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:false,persistSession:false}});
  const anon=createClient(NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:false,persistSession:false}});
  const g=await admin.auth.admin.generateLink({type:'magiclink',email,options:{redirectTo:BASE}});
  const v=await anon.auth.verifyOtp({email,token:g.data.properties.email_otp,type:g.data.properties.verification_type});
  const s={...v.data.session}; delete s.user;
  return `base64-${toBase64Url(JSON.stringify(s))}`;
}

const value=await cookieFor(EMAIL);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addCookies([{name:key,value,domain:'www.veinspiral.com',path:'/',httpOnly:false,secure:true,sameSite:'Lax'}]);
const page=await context.newPage();

await page.goto(`${BASE}/dashboard`,{waitUntil:'domcontentloaded'});

const form = page.locator('form:has(select[name="organizationId"])').first();
const hasContext = await form.locator('input[name="contextOrganizationId"]').count();

await form.locator('select[name="organizationId"]').selectOption(TARGET_ORG).catch(()=>{});
await Promise.all([
  page.waitForLoadState('domcontentloaded'),
  form.locator('button:has-text("변경"),button:has-text("조직 전환")').first().click()
]);
const afterNormal = page.url();

await page.goto(`${BASE}/dashboard`,{waitUntil:'domcontentloaded'});
const form2 = page.locator('form:has(select[name="organizationId"])').first();
await form2.evaluate((node)=>{ const i=node.querySelector('input[name="contextOrganizationId"]'); if(i) i.remove(); });
await form2.locator('select[name="organizationId"]').selectOption(TARGET_ORG).catch(()=>{});
await Promise.all([
  page.waitForLoadState('domcontentloaded').catch(()=>{}),
  form2.locator('button:has-text("변경"),button:has-text("조직 전환")').first().click().catch(()=>{})
]);
const body = ((await page.textContent('body'))||'').replace(/\s+/g,' ').slice(0,300);
const afterMissing = page.url();

console.log(JSON.stringify({hasContext,afterNormal,afterMissing,body},null,2));
await browser.close();
