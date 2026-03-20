import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildDocxBuffer, buildPdfBuffer, buildXlsxBuffer, type ExportFormat } from '@/lib/export/generate';
import { getBillingExportRows, getCalendarExportRows, getCaseBoardExportRows, getCollectionsExportRows, getReportExportRows } from '@/lib/queries/exports';

const MIME: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf'
};

const EXT: Record<ExportFormat, string> = { xlsx: 'xlsx', docx: 'docx', pdf: 'pdf' };

function sanitizeFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9가-힣-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}


export async function GET(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const auth = await requireAuthenticatedUser();
  const requestedOrganizationId = `${request.nextUrl.searchParams.get('organizationId') ?? ''}`.trim() || null;
  const organizationId = requestedOrganizationId ?? getEffectiveOrganizationId(auth);
  const platformContextOrganizationId = requestedOrganizationId ?? getPlatformOrganizationContextId(auth);
  const supabase = await createSupabaseServerClient();
  const { resource } = await context.params;
  const format = (request.nextUrl.searchParams.get('format') ?? 'xlsx') as ExportFormat;
  const caseId = request.nextUrl.searchParams.get('caseId') ?? undefined;
  const period = request.nextUrl.searchParams.get('period') ?? 'month';

  if (!['xlsx', 'docx', 'pdf'].includes(format)) {
    return NextResponse.json({ error: '지원하지 않는 내보내기 형식입니다.' }, { status: 400 });
  }


  const ensurePermission = async () => {
    if (await hasActivePlatformAdminView(auth, platformContextOrganizationId)) return true;
    if (resource === 'calendar') return Boolean(organizationId && hasPermission(auth, organizationId, 'calendar_export'));
    if (resource === 'case-board') return Boolean(organizationId && hasPermission(auth, organizationId, 'case_board_export'));
    if (resource === 'collections') return Boolean(organizationId && hasPermission(auth, organizationId, 'collection_compensation_export'));
    if (resource === 'reports') return Boolean(organizationId && hasPermission(auth, organizationId, 'report_export'));
    if (resource === 'billing' && caseId) {
      const { data: caseRow } = await supabase.from('cases').select('organization_id').eq('id', caseId).maybeSingle();
      return Boolean(caseRow?.organization_id && hasPermission(auth, caseRow.organization_id, 'billing_export'));
    }
    return false;
  };

  if (!(await ensurePermission())) {
    return NextResponse.json({ error: '내보내기 권한이 없습니다.' }, { status: 403 });
  }
  let title = 'vein-spiral-export';
  let rows: Record<string, unknown>[] = [];

  switch (resource) {
    case 'calendar':
      title = 'calendar';
      rows = await getCalendarExportRows(organizationId);
      break;
    case 'case-board':
      title = 'case-board';
      rows = await getCaseBoardExportRows(organizationId);
      break;
    case 'collections':
      title = `collections-${period}`;
      rows = await getCollectionsExportRows(organizationId, period);
      break;
    case 'billing':
      if (!caseId) return NextResponse.json({ error: 'caseId가 필요합니다.' }, { status: 400 });
      title = `billing-${caseId}`;
      rows = await getBillingExportRows(caseId);
      break;
    case 'reports':
      title = 'reports';
      rows = await getReportExportRows(organizationId);
      break;
    default:
      return NextResponse.json({ error: '지원하지 않는 리소스입니다.' }, { status: 404 });
  }

  let buffer: Buffer;
  if (format === 'xlsx') buffer = buildXlsxBuffer(title, rows);
  else if (format === 'docx') buffer = await buildDocxBuffer(title, rows);
  else buffer = await buildPdfBuffer(title, rows);


  return new NextResponse(buffer as BodyInit, {
    headers: {
      'Content-Type': MIME[format],
      'Content-Disposition': `attachment; filename="${sanitizeFileName(title)}.${EXT[format]}"`
    }
  });
}
