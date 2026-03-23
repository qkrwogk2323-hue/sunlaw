import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'contract-receipt';
}

function agreementTypeLabel(type?: string | null) {
  if (type === 'retainer') return '착수금';
  if (type === 'flat_fee') return '정액 보수';
  if (type === 'success_fee') return '성공보수';
  if (type === 'expense_reimbursement') return '실비 정산';
  if (type === 'installment_plan') return '분납 약정';
  if (type === 'internal_settlement') return '내부 정산';
  return type ?? '계약';
}

function signatureMethodLabel(method?: string | null) {
  if (method === 'electronic_signature') return '전자서명';
  if (method === 'kakao_confirmation') return '카카오 확인';
  if (method === 'signed_document_upload') return '서명본 업로드';
  return '플랫폼 동의 확인';
}

function signatureStatusLabel(status?: string | null) {
  if (status === 'completed') return '동의 완료';
  if (status === 'pending') return '응답 대기';
  return status ?? '상태 미지정';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ agreementId: string }> }) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { agreementId } = await params;

  const { data: agreement } = await supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, effective_from, effective_to, bill_to_case_client_id, case_id, cases(title, organization_id), terms_json')
    .eq('id', agreementId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!agreement) {
    return NextResponse.json({ error: '계약 체결 기록을 찾지 못했습니다.' }, { status: 404 });
  }

  const caseRow = Array.isArray(agreement.cases) ? agreement.cases[0] : agreement.cases;
  const caseTitle = caseRow?.title ?? '사건';
  const organizationId = caseRow?.organization_id ?? null;
  const organizationAllowed = organizationId
    ? auth.memberships.some((membership) => membership.organization_id === organizationId)
    : false;

  let portalAllowed = false;
  if (!organizationAllowed && agreement.bill_to_case_client_id) {
    const { data: caseClient } = await supabase
      .from('case_clients')
      .select('id')
      .eq('id', agreement.bill_to_case_client_id)
      .eq('profile_id', auth.user.id)
      .eq('is_portal_enabled', true)
      .maybeSingle();
    portalAllowed = Boolean(caseClient);
  }

  if (!organizationAllowed && !portalAllowed) {
    return NextResponse.json({ error: '이 계약 체결 기록에 접근할 수 없습니다.' }, { status: 403 });
  }

  const terms = (agreement.terms_json as Record<string, unknown> | null) ?? {};
  const sender = (terms.sender_snapshot as Record<string, unknown> | null) ?? {};
  const signatureLogs = Array.isArray(terms.signature_logs) ? (terms.signature_logs as Array<Record<string, unknown>>) : [];

  const lines = [
    '# 계약 체결 기록',
    '',
    `계약명: ${agreement.title}`,
    `사건: ${caseTitle}`,
    `계약 구분: ${agreementTypeLabel(agreement.agreement_type)}`,
    `적용 기간: ${agreement.effective_from ?? '-'} ~ ${agreement.effective_to ?? '-'}`,
    `계약 요약: ${typeof terms.contract_summary === 'string' && terms.contract_summary.trim() ? terms.contract_summary : '-'}`,
    '',
    '[갑 정보]',
    `조직명: ${typeof sender.organization_name === 'string' ? sender.organization_name : '-'}`,
    `대표자: ${typeof sender.representative_name === 'string' ? sender.representative_name : '-'}`,
    `주소: ${typeof sender.address === 'string' ? sender.address : '-'}`,
    `등록번호: ${typeof sender.registration_number === 'string' ? sender.registration_number : '-'}`,
    '',
    '[동의 정보]',
    `동의 방법: ${signatureMethodLabel(typeof terms.signature_method === 'string' ? terms.signature_method : null)}`,
    `현재 상태: ${signatureStatusLabel(typeof terms.signature_status === 'string' ? terms.signature_status : null)}`,
    `동의 완료 시각: ${typeof terms.signature_completed_at === 'string' ? terms.signature_completed_at : '-'}`,
    `동의 완료자: ${typeof terms.signature_completed_by_name === 'string' ? terms.signature_completed_by_name : '-'}`,
    '',
    '[동의 확인 로그]'
  ];

  if (signatureLogs.length) {
    signatureLogs.forEach((entry, index) => {
      lines.push(
        `${index + 1}. 시각: ${typeof entry.confirmed_at === 'string' ? entry.confirmed_at : '-'}`,
        `   확인자: ${typeof entry.actor_name === 'string' ? entry.actor_name : '-'}`,
        `   1쪽 확인: ${entry.checked_page_one ? '예' : '아니오'}`,
        `   계약 본문 확인: ${entry.checked_contract_body ? '예' : '아니오'}`,
        `   최종 동의 확인: ${entry.checked_final_consent ? '예' : '아니오'}`,
        `   방식: ${typeof entry.method === 'string' ? signatureMethodLabel(entry.method) : '-'}`,
        ''
      );
    });
  } else {
    lines.push('기록된 동의 로그가 없습니다.');
  }

  const body = lines.join('\n');
  const fileName = `${sanitizeFileName(agreement.title)}-체결기록.txt`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
    }
  });
}
