import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const organizationSignupDocumentBucket = 'organization-signup-documents';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getCurrentAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { requestId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: requestRow } = await supabase
    .from('organization_signup_requests')
    .select('id, requester_profile_id, business_registration_document_path')
    .eq('id', requestId)
    .maybeSingle();

  if (!requestRow?.business_registration_document_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (auth.profile.platform_role !== 'platform_admin' && requestRow.requester_profile_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin.storage
    .from(organizationSignupDocumentBucket)
    .createSignedUrl(requestRow.business_registration_document_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}