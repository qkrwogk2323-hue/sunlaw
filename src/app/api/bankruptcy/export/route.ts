import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const caseId = searchParams.get('caseId');
  const organizationId = searchParams.get('organizationId');

  if (!caseId || !organizationId) {
    return NextResponse.json({ ok: false, userMessage: 'caseId와 organizationId가 필요합니다.' }, { status: 400 });
  }

  await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  // 조직 멤버 확인
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, userMessage: '권한이 없습니다.' }, { status: 403 });
  }

  const { data: creditors, error } = await supabase
    .from('insolvency_creditors')
    .select('creditor_name, creditor_type, claim_class, principal_amount, interest_amount, penalty_amount, total_claim_amount, interest_rate_pct, has_guarantor, guarantor_name, is_confirmed, ai_extracted, ai_confidence_score, source_page_reference')
    .eq('case_id', caseId)
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted')
    .order('claim_class')
    .order('principal_amount', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, userMessage: '데이터 조회에 실패했습니다.' }, { status: 500 });
  }

  const CLAIM_CLASS_LABEL: Record<string, string> = {
    secured: '별제권부',
    priority: '우선변제',
    general: '일반채권'
  };

  const headers = [
    '채권자명', '채권자유형', '채권구분', '원금', '이자', '지연손해금', '합계채권액',
    '이자율(%)', '보증인여부', '보증인명', '확정여부', 'AI추출여부', 'AI신뢰도', '출처페이지'
  ];

  const rows = (creditors ?? []).map((c) => [
    c.creditor_name ?? '',
    c.creditor_type ?? '',
    CLAIM_CLASS_LABEL[c.claim_class] ?? c.claim_class,
    c.principal_amount ?? 0,
    c.interest_amount ?? 0,
    c.penalty_amount ?? 0,
    c.total_claim_amount ?? 0,
    c.interest_rate_pct ?? '',
    c.has_guarantor ? 'Y' : 'N',
    c.guarantor_name ?? '',
    c.is_confirmed ? '확정' : '미확정',
    c.ai_extracted ? 'Y' : 'N',
    c.ai_confidence_score != null ? Math.round(c.ai_confidence_score * 100) + '%' : '',
    c.source_page_reference ?? ''
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
  ];

  const csv = '\uFEFF' + csvLines.join('\r\n'); // BOM for Excel Korean encoding

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="creditors-${caseId}.csv"`
    }
  });
}
