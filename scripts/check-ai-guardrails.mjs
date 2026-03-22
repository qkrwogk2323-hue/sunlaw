#!/usr/bin/env node
/**
 * check-ai-guardrails.mjs
 * PROJECT_RULES.md AI 규칙 기반 — AI 기능 필수 가드레일 자동 검사
 *
 * 목적:
 * - src/lib/ai/ 하위의 변경된 파일에서
 *   source / requestId / modelVersion 반환이 있는지 검사한다.
 * - allowsMutation: false 가 선언됐는지 확인한다.
 * - requiresRedaction: true 인데 redact 호출이 없으면 경고한다.
 * - 위반 시 exit 1 (CI 게이트)
 *
 * 사용법:
 *   node scripts/check-ai-guardrails.mjs
 *   pnpm check:ai-guardrails
 */

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const AI_FILE_RE = /^src\/lib\/ai\/[^/]+\.(ts|tsx)$/;
const RULE_META_BLOCK_RE = /@rule-meta-start([\s\S]*?)@rule-meta-end/;
const EXEMPT_MARK_RE = /ai-guardrail-exempt:\s*([^\n]+)/i;

function hasOriginMain() {
  try {
    execSync('git rev-parse --verify origin/main', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getChangedFiles() {
  if (hasOriginMain()) {
    try {
      const mergeBase = execSync('git merge-base HEAD origin/main', { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (mergeBase) {
        const out = execSync(`git diff --name-only ${mergeBase}...HEAD`, { encoding: 'utf8', stdio: 'pipe' }).trim();
        if (out) return out.split('\n').filter(Boolean);
      }
    } catch {}
  }

  try {
    const out = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (out) return out.split('\n').filter(Boolean);
  } catch {}

  try {
    const out = execSync('git diff --name-only', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (out) return out.split('\n').filter(Boolean);
  } catch {}

  return [];
}

function parseMetaBlock(content) {
  const match = content.match(RULE_META_BLOCK_RE);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split('\n')) {
    const kv = line.trim().match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

function inspectAiFile(path) {
  if (!existsSync(path)) return { skip: true, reason: 'file not found' };
  const content = readFileSync(path, 'utf8');

  // 템플릿 파일 skip
  if (path.includes('src/templates/')) return { skip: true, reason: 'template file' };

  const exempt = content.match(EXEMPT_MARK_RE)?.[1]?.trim();
  if (exempt) return { ok: true, exempt };

  const issues = [];
  const warnings = [];

  const meta = parseMetaBlock(content);

  // 메타 선언이 있는 경우에만 상세 검사
  if (meta) {
    // allowsMutation 검사
    if (meta.allowsMutation && meta.allowsMutation !== 'false') {
      issues.push(`allowsMutation이 false가 아닙니다 (현재: ${meta.allowsMutation}) — AI는 자동 mutation 금지`);
    }

    // requiresRedaction 검사
    if (meta.requiresRedaction === 'true') {
      const hasRedact = /redact|마스킹|sensitive/i.test(content);
      if (!hasRedact) {
        warnings.push('requiresRedaction: true 인데 redact/마스킹 관련 코드가 보이지 않습니다');
      }
    }
  }

  // 반환 구조 검사 — source/requestId/modelVersion 필수 (메타 여부 무관)
  const hasReturn = /return\s*\{/.test(content) || /=>\s*\(?\{/.test(content);
  if (hasReturn) {
    if (!content.includes('requestId')) {
      issues.push('반환값에 requestId가 없습니다 (Rule AI-5)');
    }
    if (!content.includes('modelVersion')) {
      issues.push('반환값에 modelVersion이 없습니다 (Rule AI-5)');
    }
    if (!content.includes('source')) {
      issues.push('반환값에 source가 없습니다 (Rule AI-4)');
    }
  }

  return { ok: issues.length === 0, issues, warnings };
}

const changedFiles = getChangedFiles();
const targets = changedFiles.filter(f => AI_FILE_RE.test(f));

if (!targets.length) {
  console.log('✅ check:ai-guardrails skip — 변경된 AI 파일이 없습니다.');
  process.exit(0);
}

let errors = 0;
let checked = 0;

console.log('\n🤖 [ai-guardrails] AI 파일 가드레일 검사');

for (const file of targets) {
  const result = inspectAiFile(file);
  if (result.skip) continue;

  checked++;

  if (result.exempt) {
    console.log(`  ⏭  ${file} (exempt: ${result.exempt})`);
    continue;
  }

  if (result.warnings?.length) {
    for (const w of result.warnings) {
      console.warn(`  ⚠️  ${file}: ${w}`);
    }
  }

  if (result.ok) {
    console.log(`  ✅ ${file}`);
  } else {
    console.error(`  ❌ ${file}`);
    for (const issue of result.issues) {
      console.error(`     → ${issue}`);
    }
    errors++;
  }
}

if (checked === 0) {
  console.log('✅ check:ai-guardrails — 검사 대상 없음.');
  process.exit(0);
}

console.log(`\n검사 완료: ${checked}개 파일, 위반 ${errors}개`);
if (errors > 0) {
  console.error('\n❌ check:ai-guardrails FAILED — AI 가드레일 규칙 위반이 있습니다.');
  process.exit(1);
} else {
  console.log('✅ check:ai-guardrails PASSED');
}
