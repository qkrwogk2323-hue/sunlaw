/**
 * Storage cleanup endpoint — platform admin only.
 * Physically removes storage files for soft-deleted case_documents
 * that have been deleted for more than the retention period (default: 30 days).
 *
 * This closes the storage lifecycle: soft delete protects against data loss;
 * this endpoint completes the lifecycle by reclaiming storage space.
 *
 * Invoke manually or from a scheduled cron (e.g., Supabase Edge Functions / pg_cron).
 */
import { NextResponse } from 'next/server';
import { requirePlatformAdminAction } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const RETENTION_DAYS = 30;
const BATCH_SIZE = 100;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'case-files';

export async function POST() {
  await requirePlatformAdminAction('스토리지 정리는 플랫폼 관리자만 실행할 수 있습니다.');

  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Fetch soft-deleted documents past the retention window
  const { data: rows, error } = await admin
    .from('case_documents')
    .select('id, storage_path')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
    .not('storage_path', 'is', null)
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json(
      { ok: false, code: 'QUERY_ERROR', userMessage: '삭제 대상 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, purged: 0, message: '정리할 파일이 없습니다.' });
  }

  const storagePaths = rows.map(r => r.storage_path as string).filter(Boolean);
  const docIds = rows.map(r => r.id as string);

  // Remove files from storage
  const { error: storageError } = await admin.storage.from(BUCKET).remove(storagePaths);
  if (storageError) {
    return NextResponse.json(
      { ok: false, code: 'STORAGE_ERROR', userMessage: '스토리지 파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }

  // Null out storage_path to signal physical file is gone (DB row kept for audit)
  await admin
    .from('case_documents')
    .update({ storage_path: null })
    .in('id', docIds);

  return NextResponse.json({ ok: true, purged: storagePaths.length });
}
