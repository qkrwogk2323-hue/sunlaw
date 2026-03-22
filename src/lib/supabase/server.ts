import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public environment variables are missing.');
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as any);
          });
        } catch (err) {
          // Server Components에서는 쓰기 실패 가능 (Read-only context).
          // 예외를 전파하지 않되, 개발 환경에서는 경고를 남겨 디버깅을 돕습니다.
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Supabase] 쿠키 쓰기 실패 (Read-only context):', (err as Error).message);
          }
        }
      }
    }
  });
}
