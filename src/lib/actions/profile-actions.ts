'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getAuthenticatedHomePath } from '@/lib/client-account';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { profileLegalNameSchema } from '@/lib/validators';

function isMissingLegalNameColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || Boolean(error?.message?.includes('legal_name'));
}

export async function completeLegalNameAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const parsed = profileLegalNameSchema.parse({
    legalName: formData.get('legalName')
  });
  const supabase = await createSupabaseServerClient();
  const confirmedAt = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.legalName,
      legal_name: parsed.legalName,
      legal_name_confirmed_at: confirmedAt
    })
    .eq('id', auth.user.id);

  if (error) {
    if (!isMissingLegalNameColumnError(error)) {
      throw error;
    }

    const { error: fallbackError } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.legalName
      })
      .eq('id', auth.user.id);

    if (fallbackError) throw fallbackError;
  }

  revalidatePath('/login');
  revalidatePath('/dashboard');
  revalidatePath('/portal');
  revalidatePath('/start/profile-name');
  redirect(getAuthenticatedHomePath({
    ...auth,
    profile: {
      ...auth.profile,
      full_name: parsed.legalName,
      legal_name: parsed.legalName,
      legal_name_confirmed_at: confirmedAt
    }
  }) as Route);
}