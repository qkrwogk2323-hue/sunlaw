import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const organizationSignupDocumentBucket = 'organization-signup-documents';

function sanitizeDownloadFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[\r\n"]/g, '');
  return normalized || 'organization-signup-document';
}

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
    .select('id, requester_profile_id, business_registration_document_path, business_registration_document_name, business_registration_document_mime_type')
    .eq('id', requestId)
    .maybeSingle();

  if (!requestRow?.business_registration_document_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!isPlatformAdmin && requestRow.requester_profile_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin.storage
    .from(organizationSignupDocumentBucket)
    .download(requestRow.business_registration_document_path);

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
  }

  const fileBytes = new Uint8Array(await data.arrayBuffer());
  const fileName = sanitizeDownloadFileName(requestRow.business_registration_document_name ?? 'organization-signup-document');

  return new NextResponse(fileBytes, {
    status: 200,
    headers: {
      'Content-Type': requestRow.business_registration_document_mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
