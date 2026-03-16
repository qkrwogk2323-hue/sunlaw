import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createAuthenticatedSmokeAdminClient, maskEmail, resolveAuthenticatedSmokeAccount } from './authenticated-smoke-account.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const storageStatePath = resolve(currentDir, '../../playwright/.auth/authenticated-smoke.json');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function resolveStorageKey(supabaseUrl) {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

export default async function globalSetup(config) {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const { email, source } = await resolveAuthenticatedSmokeAccount();
  const password = process.env.E2E_AUTH_SMOKE_PASSWORD;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseURL = config.projects[0]?.use?.baseURL;

  if (typeof baseURL !== 'string') {
    throw new Error('Authenticated production smoke requires a string baseURL.');
  }

  console.log(`[auth-smoke] using ${source} account ${maskEmail(email)}`);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });

  let data;
  let error;

  if (serviceRoleKey) {
    const admin = createAuthenticatedSmokeAdminClient();

    const generated = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: baseURL
      }
    });

    if (generated.error || !generated.data.properties?.email_otp) {
      throw new Error(`Failed to generate authenticated smoke OTP: ${generated.error?.message ?? 'No OTP returned.'}`);
    }

    ({ data, error } = await supabase.auth.verifyOtp({
      email,
      token: generated.data.properties.email_otp,
      type: generated.data.properties.verification_type
    }));
  } else {
    if (!password) {
      throw new Error('Authenticated smoke requires SUPABASE_SERVICE_ROLE_KEY or E2E_AUTH_SMOKE_PASSWORD.');
    }

    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
  }

  if (error || !data.session) {
    throw new Error(`Failed to create authenticated smoke session: ${error?.message ?? 'No session returned.'}`);
  }

  const session = { ...data.session };
  delete session.user;

  const baseUrlObject = new URL(baseURL);
  const storageKey = resolveStorageKey(supabaseUrl);
  const cookieValue = `base64-${toBase64Url(JSON.stringify(session))}`;

  await mkdir(dirname(storageStatePath), { recursive: true });
  await writeFile(
    storageStatePath,
    JSON.stringify(
      {
        cookies: [
          {
            name: storageKey,
            value: cookieValue,
            domain: baseUrlObject.hostname,
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 60 * 60,
            httpOnly: false,
            secure: baseUrlObject.protocol === 'https:',
            sameSite: 'Lax'
          }
        ],
        origins: []
      },
      null,
      2
    )
  );
}