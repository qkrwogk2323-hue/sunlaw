'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public environment variables are missing.');
  }

  return createBrowserClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(window.location.hostname)
  });
}
