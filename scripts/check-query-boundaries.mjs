#!/usr/bin/env node
/**
 * check-query-boundaries.mjs
 *
 * 목적: 직원 쿼리 계층(clients.ts 등)과 의뢰인 포털 쿼리 계층(portal.ts)이
 *       **서로 교차 import되지 않도록** 차단.
 *
 * 리뷰어 2026-04-16 hotfix 우려 (의뢰인 포털의 case_clients/parties/handlers/
 * organizations 과다조회 차단)를 구조적으로 방지하기 위함. 쿼리 파일 상단
 * 주석으로 규약을 박았고 (clients.ts / portal.ts), 이 스크립트는 그 규약이
 * 위반되면 CI 실패를 낸다.
 *
 * 검사 규칙:
 *   1. `src/app/portal/**` 의 모든 파일 → `@/lib/queries/clients` import 금지
 *   2. `src/app/portal/**` 의 모든 파일 → `@/lib/queries/client-account`(직원용) import 금지
 *   3. `src/app/(app)/**` 의 파일 → `@/lib/queries/portal` import 금지
 *
 * 예외:
 *   - `src/lib/**` 내부의 shared util은 허용 (barrel export 가능성)
 *
 * 사용:
 *   node scripts/check-query-boundaries.mjs
 *   pnpm check:query-boundaries
 *
 * Exit code:
 *   0: 모든 경계 지켜짐
 *   2: 위반 발견
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function getSourceFiles() {
  const cmds = [
    "rg --files src -g '*.ts' -g '*.tsx'",
    "find src -type f \\( -name '*.ts' -o -name '*.tsx' \\)",
  ];
  for (const cmd of cmds) {
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (out) return out.split('\n').filter(Boolean);
    } catch {
      // try next
    }
  }
  return [];
}

const RULES = [
  {
    name: 'Portal must not import roster queries (clients.ts)',
    filePattern: /^src\/app\/portal\//,
    forbiddenImport: /@\/lib\/queries\/clients(?:['"]|$)/,
  },
  {
    name: 'Portal must not import client-account (staff-facing)',
    filePattern: /^src\/app\/portal\//,
    forbiddenImport: /@\/lib\/queries\/client-account(?:['"]|$)/,
  },
  {
    name: 'Staff app must not import portal queries',
    filePattern: /^src\/app\/\(app\)\//,
    forbiddenImport: /@\/lib\/queries\/portal(?:['"]|$)/,
  },
];

const IMPORT_RE = /import\s+[^;]*?from\s+['"]([^'"]+)['"]/g;

function checkFile(file) {
  const violations = [];
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return violations;
  }
  const lines = content.split('\n');

  for (const rule of RULES) {
    if (!rule.filePattern.test(file)) continue;
    for (const match of content.matchAll(IMPORT_RE)) {
      const spec = match[1];
      if (!rule.forbiddenImport.test(spec)) continue;
      const upto = content.slice(0, match.index ?? 0);
      const lineNo = upto.split('\n').length;
      violations.push({ file, lineNo, import: spec, rule: rule.name, line: (lines[lineNo - 1] ?? '').trim() });
    }
  }
  return violations;
}

const files = getSourceFiles();
const allViolations = [];
for (const f of files) {
  allViolations.push(...checkFile(f));
}

console.log(`\n[check-query-boundaries] 검사 파일: ${files.length}`);

if (!allViolations.length) {
  console.log('✅ 쿼리 경계 위반 없음');
  process.exit(0);
}

console.error(`\n❌ 쿼리 경계 위반 ${allViolations.length}개 발견`);
console.error('   규약: src/lib/queries/clients.ts 및 portal.ts 상단 주석 참조');
console.error('');
for (const v of allViolations) {
  console.error(`  ${v.file}:${v.lineNo}`);
  console.error(`    rule: ${v.rule}`);
  console.error(`    import: ${v.import}`);
}
process.exit(2);
