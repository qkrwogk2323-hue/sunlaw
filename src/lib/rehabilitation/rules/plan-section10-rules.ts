/**
 * 변제계획안 제10항(기타사항) 자동 생성 규칙.
 *
 * §10은 "자유 기재"가 아님. 사건 데이터에서 5종 조건을 판별해
 * 해당 법률 문구를 자동 삽입해야 함.
 *
 * 근거: 처리지침 §9, 가이드 p.9, 법원 작성례
 */

export type Section10Clause = {
  id: string;
  condition: string;
  text: string;
};

type RawCreditor = Record<string, any>;

/**
 * 사건 데이터로부터 §10 기타사항에 들어갈 문구 목록을 자동 생성.
 * 해당 조건이 없으면 빈 배열 → "해당 없음".
 */
export function buildSection10Clauses(
  creditors: RawCreditor[],
  formType: 'D5110' | 'D5111',
  disposePeriod?: number,
  disposeMultiplier?: number,
): Section10Clause[] {
  const clauses: Section10Clause[] = [];

  // A. 보증인·연대보증·대위변제 → 장래 구상권 처리
  const guarantorCreditors = creditors.filter((c) =>
    c.bond_type === '보증채무' || c.bond_type === '연대보증' || (c.guarantor_amount ?? 0) > 0
  );
  for (const gc of guarantorCreditors) {
    const bondNum = gc.bond_number ?? '?';
    const subNum = gc.sub_number != null ? `-${gc.sub_number}` : '';
    const name = gc.creditor_name ?? gc.guarantor_name ?? '채권자';
    clauses.push({
      id: `guarantor_${gc.id ?? bondNum}`,
      condition: '보증인·연대보증·대위변제',
      text: `<채권번호 ${bondNum}${subNum}번 채권자 ${name}의 장래 구상권의 처리>\n위 채권은 채무자회생법 제581조 제2항, 제430조 규정에 의하여 처리한다.`,
    });
  }

  // B. 별제권 부족액(미확정) → 부족분 처리
  const securedDeficiency = creditors.filter((c) =>
    c.is_secured && (c.remaining_unsecured ?? 0) > 0
  );
  if (securedDeficiency.length > 0) {
    clauses.push({
      id: 'secured_deficiency',
      condition: '별제권부 채권 부족액',
      text: '별제권 부족액은 미확정채권으로 처리하며, 확정 후 잔여 변제액은 일반채권과 동일한 비율로 안분한다.',
    });
  }

  // C. 미확정 채권 (소송 중·조건부·장래 구상권) → 유보 처리
  const unsettled = creditors.filter((c) => c.is_unsettled);
  if (unsettled.length > 0) {
    clauses.push({
      id: 'unsettled_claims',
      condition: '미확정 개인회생채권',
      text: '해당 채권은 미확정채권으로 처리하며, 확정 시 유보액을 일시 변제하고 잔액은 일반채권 비율로 안분한다.',
    });
  }

  // D. 재산처분 승수 (D5111만) → 승수 설명
  if (formType === 'D5111') {
    const period = disposePeriod ?? 1;
    const multiplier = disposeMultiplier ?? (period <= 1 ? 1.3 : 1.5);
    clauses.push({
      id: 'disposal_multiplier',
      condition: '재산처분 승수 적용',
      text: `재산처분 변제투입예정액은 ${period}년 이내 승수 ${multiplier} 적용하여 조달한다.`,
    });
  }

  // E. 조세·우선변제채권 → 100% 변제 특례
  const priorityClaims = creditors.filter((c) => c.has_priority_repay);
  if (priorityClaims.length > 0) {
    clauses.push({
      id: 'priority_100pct',
      condition: '조세·우선변제채권 특례',
      text: '우선변제채권은 법정 우선순위에 따라 100% 변제한다.',
    });
  }

  return clauses;
}
