import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public environment variables are missing.');
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const forwardedProto = headerStore.get('x-forwarded-proto');
  const requestHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host');

  return createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(requestHost, forwardedProto),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as any);
          });
        } catch {
          // Server Components read-only context: ignore cookie write attempts.
        }
      }
    }
  });
}
