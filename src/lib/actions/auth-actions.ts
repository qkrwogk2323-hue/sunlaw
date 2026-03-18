'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/login');
}

export async function completeTemporaryCredentialPasswordResetAction() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      must_change_password: false,
      must_complete_profile: true
    })
    .eq('id', auth.user.id);
  if (profileError) throw profileError;

  const { error: credentialError } = await supabase
    .from('organization_staff_temp_credentials')
    .update({
      must_change_password: false,
      last_password_changed_at: new Date().toISOString()
    })
    .eq('profile_id', auth.user.id);
  if (credentialError) throw credentialError;

  revalidatePath('/settings/team');
  revalidatePath('/login');
}
