#!/usr/bin/env node
/**
 * check-rule-meta.mjs
 * PROJECT_RULES.md 5-20, 0-1 기반 — 새 파일 규칙 메타 선언 강제 검사
 *
 * 목적:
 * - 새로 추가된 page.tsx / actions/*.ts / lib/ai/*.ts 파일에
 *   @rule-meta-start ... @rule-meta-end 블록이 있는지 검사한다.
 * - 필수 필드가 선언됐는지 확인한다.
 * - 위반 시 exit 1 (CI 게이트)
 *
 * 대상:
 * - 신규 파일만 (기존 파일은 0-8 이행 원칙에 따라 점진적 적용)
 *
 * 사용법:
 *   node scripts/check-rule-meta.mjs
 *   pnpm check:rule-meta
 */

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PAGE_RE = /^src\/app\/.*\/page\.tsx$/;
const ACTION_RE = /^src\/lib\/actions\/[^/]+\.ts$/;
const AI_RE = /^src\/lib\/ai\/[^/]+\.ts$/;

const PAGE_REQUIRED_FIELDS = ['surfaceScope', 'requiresAuth', 'requiresTraceability', 'traceEntity'];
const ACTION_REQUIRED_FIELDS = ['actionScope', 'requiresAuthGuard', 'requiresAuditLog', 'requiredTests'];
const AI_REQUIRED_FIELDS = [
  'aiFeature', 'surfaceScope', 'allowedAnswerTypes',
  'requiresRedaction', 'requiresScopeCheck',
  'requiresSourceMeta', 'requiresRequestId', 'requiresModelVersion',
  'requiresFeedback', 'allowsMutation'
];

const RULE_META_BLOCK_RE = /@rule-meta-start([\s\S]*?)@rule-meta-end/;
const EXEMPT_MARK_RE = /rule-meta-exempt:\s*([^\n]+)/i;

function hasOriginMain() {
  try {
    execSync('git rev-parse --verify origin/main', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getNewFiles() {
  if (hasOriginMain()) {
    try {
      const mergeBase = execSync('git merge-base HEAD origin/main', { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (mergeBase) {
        const out = execSync(`git diff --name-only --diff-filter=A ${mergeBase}...HEAD`, { encoding: 'utf8', stdio: 'pipe' }).trim();
        if (out) return out.split('\n').filter(Boolean);
      }
    } catch {}
  }

  try {
    const out = execSync('git diff --name-only --diff-filter=A HEAD~1..HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (out) return out.split('\n').filter(Boolean);
  } catch {}

  try {
    const out = execSync('git diff --name-only --diff-filter=A', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (out) return out.split('\n').filter(Boolean);
  } catch {}

  return [];
}

function parseMetaBlock(content) {
  const match = content.match(RULE_META_BLOCK_RE);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split('\n')) {
    const normalized = line.trim().replace(/^\*\s*/, '');
    const kv = normalized.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

function checkFile(path, requiredFields, fileType) {
  if (!existsSync(path)) return { skip: true };
  const content = readFileSync(path, 'utf8');

  const exempt = content.match(EXEMPT_MARK_RE)?.[1]?.trim();
  if (exempt) {
    return { ok: true, exempt, note: `exempt: ${exempt}` };
  }

  // 템플릿 파일 자체는 skip
  if (path.includes('src/templates/')) return { skip: true, reason: 'template file' };

  const meta = parseMetaBlock(content);
  if (!meta) {
    return {
      ok: false,
      reason: `@rule-meta-start ... @rule-meta-end 블록이 없습니다. (${fileType} 필수) — src/templates/${
        fileType === 'page' ? 'page.template.tsx' :
        fileType === 'action' ? 'action.template.ts' : 'ai.template.ts'
      }를 참고하세요`
    };
  }

  const missing = requiredFields.filter(f => !(f in meta));
  if (missing.length > 0) {
    return { ok: false, reason: `필수 메타 필드 누락: ${missing.join(', ')}` };
  }

  return { ok: true };
}

const newFiles = getNewFiles();
const targets = newFiles.filter(f => PAGE_RE.test(f) || ACTION_RE.test(f) || AI_RE.test(f));

if (!targets.length) {
  console.log('✅ check:rule-meta skip — 새로 추가된 page/action/ai 파일이 없습니다.');
  process.exit(0);
}

let errors = 0;
let checked = 0;

console.log('\n📋 [rule-meta] 새 파일 메타 선언 검사');

for (const file of targets) {
  let requiredFields;
  let fileType;

  if (PAGE_RE.test(file)) {
    requiredFields = PAGE_REQUIRED_FIELDS;
    fileType = 'page';
  } else if (ACTION_RE.test(file)) {
    requiredFields = ACTION_REQUIRED_FIELDS;
    fileType = 'action';
  } else if (AI_RE.test(file)) {
    requiredFields = AI_REQUIRED_FIELDS;
    fileType = 'ai';
  }

  const result = checkFile(file, requiredFields, fileType);

  if (result.skip) continue;

  checked++;
  if (result.ok) {
    const note = result.exempt ? ` (exempt: ${result.exempt})` : '';
    console.log(`  ✅ [${fileType}] ${file}${note}`);
  } else {
    console.error(`  ❌ [${fileType}] ${file}`);
    console.error(`     → ${result.reason}`);
    errors++;
  }
}

if (checked === 0) {
  console.log('✅ check:rule-meta — 검사 대상 없음.');
  process.exit(0);
}

console.log(`\n검사 완료: ${checked}개 파일, 위반 ${errors}개`);
if (errors > 0) {
  console.error('\n❌ check:rule-meta FAILED — 새 파일에 규칙 메타 선언이 필요합니다.');
  console.error('   src/templates/ 내 템플릿 파일을 복사해 시작하세요.');
  process.exit(1);
} else {
  console.log('✅ check:rule-meta PASSED');
}
