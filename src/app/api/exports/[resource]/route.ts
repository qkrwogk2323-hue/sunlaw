import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildDocxBuffer, buildPdfBuffer, buildXlsxBuffer, type ExportFormat } from '@/lib/export/generate';
import { getBillingExportRows, getCalendarExportRows, getCaseBoardExportRows, getCollectionsExportRows, getReportExportRows } from '@/lib/queries/exports';
import { guardAccessDeniedResponse, guardConditionFailedResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

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
  const platformContextId = getPlatformOrganizationContextId(auth);
  const supabase = await createSupabaseServerClient();
  const { resource } = await context.params;
  const format = (request.nextUrl.searchParams.get('format') ?? 'xlsx') as ExportFormat;
  const caseId = request.nextUrl.searchParams.get('caseId') ?? undefined;
  const period = request.nextUrl.searchParams.get('period') ?? 'month';

  if (!['xlsx', 'docx', 'pdf'].includes(format)) {
    return guardValidationFailedResponse(400, {
      blocked: '내보내기 요청이 차단되었습니다.',
      cause: '지원하지 않는 파일 형식입니다.',
      resolution: 'xlsx, docx, pdf 중 하나를 선택해 주세요.'
    });
  }


  const ensurePermission = async () => {
    if (await hasActivePlatformAdminView(auth, platformContextId)) return true;
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
    return guardAccessDeniedResponse(403, {
      blocked: '내보내기 요청이 차단되었습니다.',
      cause: '현재 조직 또는 현재 계정 권한으로는 이 리소스를 내보낼 수 없습니다.',
      resolution: '조직 권한을 확인하거나 플랫폼 조직 관리자 권한으로 전환해 주세요.'
    });
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
      if (!caseId) {
        return guardValidationFailedResponse(400, {
          blocked: '청구 내보내기 요청이 차단되었습니다.',
          cause: 'caseId가 누락되었습니다.',
          resolution: '내보낼 사건을 선택한 뒤 다시 시도해 주세요.'
        });
      }
      title = `billing-${caseId}`;
      rows = await getBillingExportRows(caseId);
      break;
    case 'reports':
      title = 'reports';
      rows = await getReportExportRows(organizationId);
      break;
    default:
      return guardConditionFailedResponse(404, {
        blocked: '내보내기 요청이 차단되었습니다.',
        cause: '지원하지 않는 리소스 경로입니다.',
        resolution: '캘린더/사건/정산/리포트 메뉴에서 다시 실행해 주세요.'
      });
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
