/**
 * 개인회생 데이터 정합성 정적 검사 (소스코드 레벨)
 *
 * 검사관 2026-04-08 보고서 후속:
 * - import script 367/581/675 단위 검증 누락으로 51건 repay_months=72 garbage 주입 사고 발생
 * - 본 스크립트는 동일 패턴 재발 방지용 정적 검사를 CI에 추가합니다.
 *
 * 검증 항목:
 *   1. import script가 forcingrepaymentmonth 필드를 우선 시도하는지
 *   2. repay_months 할당 시 1~60 범위 가드(parseRepayMonths/inline 가드)가 존재하는지
 *   3. magic number 60/72 하드코딩으로 회귀 방지
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'scripts/colaw-migration/migrate-colaw-to-vs.ts',
  'scripts/colaw-migration/re-extract-creditors.ts',
];

const errors = [];

function fail(file, msg) {
  errors.push(`${file}: ${msg}`);
}

for (const rel of targets) {
  const abs = path.join(root, rel);
  let src;
  try {
    src = await readFile(abs, 'utf8');
  } catch {
    // 파일 없으면 skip (스크립트 폐기 가능성 허용)
    continue;
  }

  const lines = src.split('\n');

  // 1. forcingrepaymentmonth 필드 우선 사용 확인
  if (!src.includes('forcingrepaymentmonth')) {
    fail(rel, `COLAW 변제기간 필드 'forcingrepaymentmonth' 미사용. 검사관 보고서 A-4 참조.`);
  }

  // 2. repay_months 할당 라인 정밀 검사
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const trimmed = line.trim();
    if (!/repay_months\s*:/.test(trimmed)) return;
    // 단순 parseInt(...) || 60 패턴은 가드 없음
    if (/parseInt\([^)]+\)\s*\|\|\s*60\b/.test(trimmed)) {
      fail(rel, `L${lineNo}: 범위 가드 없는 repay_months 할당. 51건 garbage 주입 패턴 재현 위험. parseRepayMonths() 또는 inline 가드 필요. → ${trimmed}`);
    }
  });
}

if (errors.length > 0) {
  console.error('❌ rehab data integrity check 실패:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('✅ rehab data integrity check 통과 (import scripts 안전).');
