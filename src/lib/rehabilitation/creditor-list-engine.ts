/**
 * D5106 채권자목록 엔진 — 입력 모델 → 출력 모델 변환.
 *
 * 기존 document-generator.ts의 generateCreditorList()는 입력 처리·계산·HTML 렌더를
 * 한 함수에서 240줄로 처리. 이 파일은 **데이터 변환만** 담당하고, HTML 렌더는
 * document-generator.ts가 계속 담당.
 *
 * 설계 원칙:
 *   - 입력 모델(creditors DB row) ≠ 출력 모델(표기용 순번·안분 결과·문구)
 *   - 같은 입력 → 항상 같은 출력 (순수 함수, side-effect 없음)
 *   - 이 파일만 테스트하면 "채권자목록 데이터 정합성"을 증명할 수 있음
 */

// ─── 출력 모델 타입 ──────────────────────────────────────────────────

export type CreditorListHeader = {
  debtorName: string;
  debtorBirth: string;
  courtName: string;
  caseNumber: string;
  assessmentDate: string;
  listDate: string;
};

export type CreditorListSummary = {
  totalCapital: number;
  totalInterest: number;
  totalAmount: number;
  securedTotal: number;
  unsecuredTotal: number;
};

export type CreditorDisplayRow = {
  bondNumber: string;
  creditorName: string;
  cause: string;
  bondContent: string;
  capital: number;
  interest: number;
  totalClaim: number;
  capitalCompute: string;
  interestCompute: string;
  address: string;
  phone: string;
  fax: string;
  mobile: string;
  subrogationNote: string;
  attachments: number[];
  isSecured: boolean;
  isUnsettled: boolean;
};

export type UnsettledCreditorRow = {
  bondNumber: string;
  creditorName: string;
  cause: string;
  reason: string;
  amount: number;
};

export type CreditorListOutput = {
  header: CreditorListHeader;
  summary: CreditorListSummary;
  rows: CreditorDisplayRow[];
  unsettledRows: UnsettledCreditorRow[];
};

// ─── 입력 타입 (DB row 기반) ─────────────────────────────────────────

type RawCreditor = Record<string, any>;
type RawApplication = Record<string, any>;
type RawCreditorSettings = Record<string, any>;

// ─── 빌더 ────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = dateStr.replace(/-/g, '. ');
  return d.endsWith('.') ? d : `${d}.`;
}

export function buildCreditorListOutput(
  application: RawApplication,
  creditorSettings: RawCreditorSettings,
  creditors: RawCreditor[],
): CreditorListOutput {

  // ── Header ──
  const courtName = application.court_name || application.court_detail || '';
  const caseYear = application.case_year || '';
  const caseNum = application.case_number || '';
  const caseNumber = caseYear && caseNum
    ? `${caseYear} ${caseNum}`
    : caseNum || `${new Date().getFullYear()} 호`;
  const assessmentDate = creditorSettings.bond_date || creditorSettings.list_date || '';
  const listDate = creditorSettings.list_date || new Date().toISOString().split('T')[0];

  const header: CreditorListHeader = {
    debtorName: application.applicant_name || '',
    debtorBirth: application.resident_number_front || '',
    courtName,
    caseNumber,
    assessmentDate,
    listDate,
  };

  // ── Summary ──
  // 담보부/무담보 분류: 담보채권은 담보가치 회수분과 부족액(무담보 편입)으로 분리
  let totalCapital = 0;
  let totalInterest = 0;
  let securedTotal = 0;
  let unsecuredTotal = 0;

  for (const cred of creditors) {
    const capital = cred.capital || 0;
    const interest = cred.interest || 0;
    const totalClaim = capital + interest;
    totalCapital += capital;
    totalInterest += interest;

    if (cred.is_secured) {
      const collateralValue = Number(cred.secured_collateral_value) || 0;
      const covered = Math.min(collateralValue, totalClaim);
      const deficiency = Math.max(0, totalClaim - covered);
      securedTotal += covered;
      unsecuredTotal += deficiency;
    } else {
      unsecuredTotal += totalClaim;
    }
  }

  const summary: CreditorListSummary = {
    totalCapital,
    totalInterest,
    totalAmount: totalCapital + totalInterest,
    securedTotal,
    unsecuredTotal,
  };

  // ── Rows (정렬 + 가지번호) ──
  const sorted = [...creditors].sort((a, b) => {
    const aNum = a.bond_number || 0;
    const bNum = b.bond_number || 0;
    const aParent = a.parent_creditor_id ? creditors.find((p) => p.id === a.parent_creditor_id) : null;
    const bParent = b.parent_creditor_id ? creditors.find((p) => p.id === b.parent_creditor_id) : null;
    const aSortKey = aParent ? (aParent.bond_number || 0) + (a.sub_number || 0) * 0.01 : aNum;
    const bSortKey = bParent ? (bParent.bond_number || 0) + (b.sub_number || 0) * 0.01 : bNum;
    return aSortKey - bSortKey;
  });

  const rows: CreditorDisplayRow[] = sorted.map((cred, idx) => {
    const parentCred = cred.parent_creditor_id
      ? creditors.find((p) => p.id === cred.parent_creditor_id)
      : null;
    const bondNumber = parentCred && cred.sub_number != null
      ? `${parentCred.bond_number || '?'}-${cred.sub_number}`
      : String(cred.bond_number || idx + 1);

    const capital = cred.capital || 0;
    const interest = cred.interest || 0;
    const totalClaim = capital + interest;
    const guarantorAmount = cred.guarantor_amount || 0;
    const guarantorName = cred.guarantor_name || '';
    const isMainDebtor = !cred.bond_type || cred.bond_type === '주채무';

    let subrogationNote = '';
    if (isMainDebtor && guarantorAmount > 0) {
      subrogationNote = guarantorAmount >= capital
        ? `(전액대위변제: ${guarantorName}, 원금 0, 이자만 잔존)`
        : `(일부대위변제: ${guarantorName} ${guarantorAmount.toLocaleString('ko-KR')}원)`;
    }

    const capitalCompute = cred.capital_compute || `부채증명서 참조(산정기준일：${formatDate(assessmentDate)})`;
    const interestCompute = cred.interest_compute || `부채증명서 참조(산정기준일：${formatDate(assessmentDate)})`;

    return {
      bondNumber,
      creditorName: cred.creditor_name || '',
      cause: cred.bond_cause || '',
      bondContent: cred.bond_content || `원리금 ${totalClaim.toLocaleString('ko-KR')}원 및 그 중 원금 ${capital.toLocaleString('ko-KR')}원에 대한 연체이율의 비율에 의한 금원.`,
      capital,
      interest,
      totalClaim,
      capitalCompute,
      interestCompute,
      address: cred.address || '',
      phone: cred.phone || '',
      fax: cred.fax || '',
      mobile: cred.mobile || '',
      subrogationNote,
      attachments: cred.attachments || [],
      isSecured: Boolean(cred.is_secured),
      isUnsettled: Boolean(cred.is_unsettled),
    };
  });

  // ── 미확정 채권 ──
  const unsettledRows: UnsettledCreditorRow[] = creditors
    .filter((c) => c.is_unsettled || (c.is_secured && (c.remaining_unsecured || 0) > 0))
    .map((c) => ({
      bondNumber: String(c.bond_number || ''),
      creditorName: c.creditor_name || '',
      cause: c.bond_cause || '',
      reason: c.is_unsettled
        ? (c.unsettled_reason || '채권액 미확정')
        : '별제권행사 부족액',
      amount: c.is_unsettled
        ? (c.unsettled_amount || c.capital || 0)
        : (c.remaining_unsecured || 0),
    }));

  return { header, summary, rows, unsettledRows };
}
