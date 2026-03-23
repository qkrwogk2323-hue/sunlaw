import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: document } = await supabase
    .from('case_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!document?.storage_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'case-files';
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(document.storage_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
