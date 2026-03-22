#!/usr/bin/env node
/**
 * check-audit-traceability.mjs
 * PROJECT_RULES.md 5-19 규칙 자동 검사 (변경 파일 기준)
 *
 * 목적:
 * - 신청/요청/승인/반려/삭제/복구/보관/세션강제종료 UI를 수정할 때
 *   감사로그 진입 링크가 함께 반영되었는지 검사한다.
 *
 * v2: 파일 범위 확장 + exemption 구조화 강화
 * - 대상: page.tsx, layout.tsx, actions, api routes, components
 * - exemption 필수 포맷: reason=...; fallback=...; expires=YYYY-MM-DD; approvedBy=...
 *
 * 기본 동작:
 * - 변경된 파일만 검사(기존 누적 부채는 별도 정리)
 * - 위반 시 exit 1 (CI 게이트)
 *
 * 사용법:
 *   node scripts/check-audit-traceability.mjs
 *   pnpm check:audit-traceability
 */

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 파일 범위: page, layout, actions, api routes, 주요 컴포넌트 (v2 확장)
const TARGET_FILE_RE = /^src\/(app\/.*\/(page|layout)\.tsx|lib\/actions\/[^/]+\.ts|app\/api\/.*\.ts|components\/.*\.tsx)$/;
const TRACE_KEYWORD_RE = /신청|요청|승인|반려|삭제|복구|보관|이력|세션 강제 종료|session|approve|reject|archive|delete|restore|revoke|suspend|terminate/i;
const AUDIT_LINK_RE = /\/admin\/audit(?:\?|["'])|\/organization-audit(?:\?|["'])|audit-link|TraceabilityLink|HistoryEntryLink|AuditLink/i;

// 구조화된 exemption 포맷 (v2): reason=...; fallback=...; expires=YYYY-MM-DD; approvedBy=...
const EXEMPT_MARK_RE = /audit-link-exempt:\s*([^\n]+)/i;
const EXEMPT_REASON_RE = /reason=([^;]+)/i;
const EXEMPT_FALLBACK_RE = /fallback=([^;]+)/i;
const EXEMPT_EXPIRES_RE = /expires=(\d{4}-\d{2}-\d{2})/i;
const EXEMPT_APPROVED_RE = /approvedBy=([^;]+)/i;

function getChangedFiles() {
  try {
    const mergeBase = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    if (mergeBase) {
      const out = execSync(`git diff --name-only ${mergeBase}...HEAD`, { encoding: 'utf8' }).trim();
      if (out) return out.split('\n').filter(Boolean);
    }
  } catch {}

  try {
    const out = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8' }).trim();
    if (out) return out.split('\n').filter(Boolean);
  } catch {}

  try {
    const out = execSync('git diff --name-only', { encoding: 'utf8' }).trim();
    if (out) return out.split('\n').filter(Boolean);
  } catch {}

  return [];
}

function validateExemption(exemptText) {
  const today = new Date().toISOString().slice(0, 10);
  const issues = [];

  if (!EXEMPT_REASON_RE.test(exemptText)) issues.push('reason= 없음');
  if (!EXEMPT_FALLBACK_RE.test(exemptText)) issues.push('fallback= 없음');
  if (!EXEMPT_APPROVED_RE.test(exemptText)) issues.push('approvedBy= 없음');

  const expiresMatch = exemptText.match(EXEMPT_EXPIRES_RE);
  if (!expiresMatch) {
    issues.push('expires=YYYY-MM-DD 없음');
  } else if (expiresMatch[1] < today) {
    issues.push(`exemption 만료됨 (expires=${expiresMatch[1]}, today=${today})`);
  }

  return issues;
}

function inspectFile(path) {
  if (!existsSync(path)) return { skip: true, reason: 'file not found' };
  const content = readFileSync(path, 'utf8');
  if (!TRACE_KEYWORD_RE.test(content)) return { skip: true, reason: 'no traceability keyword' };

  const exempt = content.match(EXEMPT_MARK_RE)?.[1]?.trim();
  if (exempt) {
    // v2: exemption 구조 검증
    const exemptIssues = validateExemption(exempt);
    if (exemptIssues.length > 0) {
      return {
        ok: false,
        reason: `audit-link-exempt 포맷 오류: ${exemptIssues.join(', ')}\n     필수 포맷: audit-link-exempt: reason=...; fallback=...; expires=YYYY-MM-DD; approvedBy=...`
      };
    }
    return { ok: true, exempt };
  }

  if (!AUDIT_LINK_RE.test(content)) {
    return { ok: false, reason: 'audit link 또는 TraceabilityLinks/HistoryEntryLink 컴포넌트가 없습니다' };
  }

  return { ok: true };
}

const changedFiles = getChangedFiles();
const targets = changedFiles.filter((file) => TARGET_FILE_RE.test(file));

if (!targets.length) {
  console.log('✅ check:audit-traceability skip — 변경된 page.tsx 대상이 없습니다.');
  process.exit(0);
}

let errors = 0;
let checked = 0;

console.log('📋 [audit-traceability] 변경 파일 검사');
for (const file of targets) {
  const result = inspectFile(file);
  if (result.skip) {
    continue;
  }
  checked++;
  if (result.ok) {
    if (result.exempt) {
      console.log(`  ⚠️  EXEMPT ${file} (${result.exempt})`);
    } else {
      console.log(`  ✅ ${file}`);
    }
  } else {
    errors++;
    console.error(`  ❌ ${file} — ${result.reason}`);
    console.error('     해결: 신청/요청/승인/반려/삭제/복구/보관/이력 UI에는 감사로그 진입 링크를 추가하세요.');
  }
}

if (!checked) {
  console.log('✅ check:audit-traceability skip — 추적성 키워드 대상 변경이 없습니다.');
  process.exit(0);
}

if (errors > 0) {
  console.error(`\n🚨 check:audit-traceability 실패 — ${errors}개 파일에서 로그 진입 링크 누락`);
  process.exit(1);
}

console.log('\n🎉 check:audit-traceability 통과');
process.exit(0);

