#!/usr/bin/env node
/**
 * check-test-coverage.mjs
 * PROJECT_RULES.md 5-7 규칙 자동 검사
 *
 * 검사 항목:
 * 1. src/lib/actions/ 의 모든 액션 파일에 대응하는 테스트가 tests/ 에 있는지
 * 2. tests/ 의 액션 테스트가 happy path + error path 둘 다 포함하는지
 * 3. tests/e2e/ 에 critical-path 테스트가 존재하는지
 * 4. 각 액션 파일에 requireXxxAccess가 있으면 권한 차단 테스트도 있는지
 *
 * 사용법: node scripts/check-test-coverage.mjs
 *        pnpm check:test-coverage
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const ROOT = process.cwd();
const ACTIONS_DIR = join(ROOT, 'src/lib/actions');
const TESTS_DIR = join(ROOT, 'tests');
const E2E_DIR = join(TESTS_DIR, 'e2e');

let errors = 0;
let warnings = 0;
const passed = [];

function error(msg) {
  console.error(`  ❌ ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`  ⚠️  ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`  ✅ ${msg}`);
  passed.push(msg);
}

// ─── 1. 액션 파일 → 테스트 커버리지 검사 ────────────────────────────────────
console.log('\n📋 [1] 액션 파일 테스트 커버리지 검사');

const actionFiles = readdirSync(ACTIONS_DIR).filter(f => f.endsWith('.ts'));

// tests/ 하위 모든 .test.ts 파일의 내용을 합친 인덱스
const testFiles = readdirSync(TESTS_DIR)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => ({ name: f, path: join(TESTS_DIR, f), content: readFileSync(join(TESTS_DIR, f), 'utf-8') }));

for (const actionFile of actionFiles) {
  const stem = basename(actionFile, '.ts'); // e.g. auth-actions
  const shortName = stem.replace(/-actions$/, ''); // e.g. auth

  // 해당 액션을 import하는 테스트 파일 찾기
  const covering = testFiles.filter(t =>
    t.content.includes(`@/lib/actions/${stem}`) ||
    t.content.includes(`/${stem}`)
  );

  const actionContent = readFileSync(join(ACTIONS_DIR, actionFile), 'utf-8');
  const exportedActions = [...actionContent.matchAll(/^export async function (\w+)/gm)]
    .map(m => m[1]);

  if (exportedActions.length === 0) {
    // 익스포트 없는 파일은 스킵
    continue;
  }

  if (covering.length === 0) {
    error(`${actionFile} — 테스트 파일 없음 (export: ${exportedActions.slice(0,3).join(', ')}${exportedActions.length > 3 ? '...' : ''})`);
    continue;
  }

  // ─── 2. happy path + error path 확인 ──────────────────────────────────────
  const combinedTestContent = covering.map(t => t.content).join('\n');

  const hasHappyPath = /success|성공|통과|happy|✓|정상/.test(combinedTestContent);
  const hasErrorPath = /error|실패|에러|throw|rejects|오류|차단|fail/.test(combinedTestContent);

  if (!hasHappyPath) {
    warn(`${actionFile} — 성공 경로(happy path) 테스트 없음 (테스트 파일: ${covering.map(t => t.name).join(', ')})`);
  }
  if (!hasErrorPath) {
    warn(`${actionFile} — 실패 경로(error path) 테스트 없음 (테스트 파일: ${covering.map(t => t.name).join(', ')})`);
  }

  // ─── 3. requireXxxAccess → 권한 차단 테스트 확인 ──────────────────────────
  const hasAuthGuard = /requireOrganizationActionAccess|requireOrganizationUserManagementAccess|requirePlatformAdminAction|requirePlatformAdmin|requireAuthenticatedUser/.test(actionContent);
  if (hasAuthGuard) {
    const hasAuthTest = /권한|관리자만|차단|unauthorized|forbidden|403|access denied|requireOrganization|requirePlatform/i.test(combinedTestContent);
    if (!hasAuthTest) {
      warn(`${actionFile} — 권한 가드 있지만 권한 차단 테스트 없음`);
    } else {
      ok(`${actionFile} — 권한 차단 테스트 확인됨`);
    }
  }

  if (hasHappyPath && hasErrorPath) {
    ok(`${actionFile} — happy/error path 커버됨 (${covering.map(t => t.name).join(', ')})`);
  }
}

// ─── 4. E2E critical-path 파일 존재 확인 ─────────────────────────────────────
console.log('\n📋 [2] E2E 테스트 파일 검사');

const e2eFiles = existsSync(E2E_DIR) ? readdirSync(E2E_DIR).filter(f => f.endsWith('.spec.ts') || f.endsWith('.ts') && !f.endsWith('.d.ts')) : [];

if (e2eFiles.length === 0) {
  error('tests/e2e/ — E2E 테스트 파일이 하나도 없음');
} else {
  const hasCriticalPath = e2eFiles.some(f => f.includes('critical-path') || f.includes('smoke'));
  if (!hasCriticalPath) {
    warn('tests/e2e/ — critical-path 또는 smoke 테스트 없음');
  } else {
    ok(`E2E critical-path/smoke 테스트 존재: ${e2eFiles.filter(f => f.includes('critical') || f.includes('smoke')).join(', ')}`);
  }
  ok(`E2E 테스트 파일 총 ${e2eFiles.length}개: ${e2eFiles.join(', ')}`);
}

// ─── 5. 신규 액션 함수에 JSDoc 최소 확인 ─────────────────────────────────────
console.log('\n📋 [3] 액션 함수 문서화 검사');

let undocumented = 0;
for (const actionFile of actionFiles) {
  const content = readFileSync(join(ACTIONS_DIR, actionFile), 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^export async function/.test(lines[i])) {
      const prev = lines[i - 1] ?? '';
      if (!prev.trim().startsWith('*') && !prev.trim().startsWith('//') && !prev.trim().startsWith('/*')) {
        undocumented++;
      }
    }
  }
}
if (undocumented > 0) {
  warn(`JSDoc/주석 없는 export async function ${undocumented}개 발견 (권장사항)`);
} else {
  ok('모든 export async function에 주석 존재');
}

// ─── 결과 요약 ────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`✅ 통과: ${passed.length}개`);
console.log(`⚠️  경고: ${warnings}개`);
console.log(`❌ 오류: ${errors}개`);
console.log('─'.repeat(60));

if (errors > 0) {
  console.error(`\n🚨 check:test-coverage 실패 — ${errors}개 규칙 위반 (PROJECT_RULES.md 5-7)`);
  console.error('   새 액션 파일을 추가할 때 반드시 tests/ 에 대응 테스트를 함께 커밋하세요.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\n⚠️  경고 ${warnings}개 — 테스트 품질을 높이세요. (빌드는 통과)\n`);
  process.exit(0);
} else {
  console.log('\n🎉 모든 테스트 커버리지 규칙 통과!\n');
  process.exit(0);
}
