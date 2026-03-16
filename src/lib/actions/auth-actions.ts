'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clearSupportSessionCookie } from '@/lib/support-cookie';

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await clearSupportSessionCookie();
  await supabase.auth.signOut();
  redirect('/login');
}
