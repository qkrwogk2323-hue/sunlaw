#!/usr/bin/env node
/**
 * check-navigation-consistency.mjs
 *
 * 목적:
 * - 코드 전역의 하드코딩 경로 문자열을 수집한다.
 * - singular/plural 경로 충돌(/service vs /services)을 탐지한다.
 * - UI 렌더 파일(`src/app/**`, `src/components/**`)에서 `href=`, `router.push(`,
 *   `redirect(`의 **내부 URL 하드코딩**을 감지해 ROUTES 상수 경유를 강제한다.
 *   (2026-04-16 거버넌스 규약: `docs/page-specs/*`, `CLAUDE.md` "페이지·인터랙션 계약 규약" 참조)
 *
 * 사용:
 *   node scripts/check-navigation-consistency.mjs
 *   pnpm check:navigation-consistency
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PATH_LITERAL_RE = /['"`](\/[a-zA-Z0-9\-_/[\]?=&%.#:]*)['"`]/g;
function getSourceFiles() {
  // Prefer ripgrep (fast); fall back to POSIX find when rg is unavailable (e.g. fresh CI runners).
  const cmds = [
    "rg --files src -g '*.ts' -g '*.tsx'",
    "find src -type f \\( -name '*.ts' -o -name '*.tsx' \\)"
  ];
  for (const cmd of cmds) {
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (out) return out.split('\n').filter(Boolean);
    } catch {
      // try next fallback
    }
  }
  return [];
}

function normalizePathLiteral(raw) {
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('/api/')) return null;
  if (raw.startsWith('/_next/')) return null;
  return raw.split('?')[0].split('#')[0];
}

function extractLiterals(file) {
  const content = readFileSync(file, 'utf8');
  const found = [];
  for (const match of content.matchAll(PATH_LITERAL_RE)) {
    const literal = match[1];
    const normalized = normalizePathLiteral(literal);
    if (!normalized) continue;
    found.push(normalized);
  }
  return found;
}

function collectPaths() {
  const fileToPaths = new Map();
  const pathToFiles = new Map();

  for (const file of getSourceFiles()) {
    const literals = extractLiterals(file);
    if (!literals.length) continue;
    fileToPaths.set(file, literals);
    for (const path of literals) {
      const list = pathToFiles.get(path) ?? [];
      list.push(file);
      pathToFiles.set(path, list);
    }
  }

  return { fileToPaths, pathToFiles };
}

function singularPluralConflicts(paths) {
  const set = new Set(paths);
  const conflicts = [];

  for (const path of set) {
    const segments = path.split('/').filter(Boolean);
    if (!segments.length) continue;

    const first = segments[0];
    if (first.endsWith('s')) continue;
    const pluralFirst = `${first}s`;
    const candidate = `/${[pluralFirst, ...segments.slice(1)].join('/')}`;
    if (set.has(candidate)) {
      conflicts.push({ singular: path, plural: candidate });
    }
  }

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────
// UI 렌더 파일의 하드코딩 href / router.push / redirect 감지
// ─────────────────────────────────────────────────────────────────
// 허용:
//   - ROUTES.X 또는 ${ROUTES.X}/... 템플릿
//   - resolveInteractionHref(...)
//   - NAVIGATION_MAP[...] 경유
// 금지:
//   - href="/cases/..." (문자열 literal)
//   - href={`/cases/...`} (템플릿이지만 ROUTES 미경유)
//   - router.push('/cases')
//   - redirect('/cases')
//
// 감지는 UI 렌더 경로에만 적용 (src/app, src/components). 서버 액션 내부 redirect
// 등은 별도 고려가 필요하므로 현재는 UI만 대상.

const UI_DIRS = ['src/app/', 'src/components/'];
const HARDCODE_PATTERNS = [
  // href="/something"
  {
    name: 'hardcoded href (string literal)',
    re: /\bhref\s*=\s*["'](\/[a-zA-Z0-9\-_/[\]?=&%.#:]+)["']/g,
  },
  // href={`/something/${id}`} — 템플릿 안의 선행 슬래시
  {
    name: 'hardcoded href (template literal)',
    re: /\bhref\s*=\s*\{\s*`(\/[a-zA-Z0-9\-_/[\]?=&%.#:${}]+)`/g,
  },
  // router.push('/something')
  {
    name: 'router.push hardcoded',
    re: /\brouter\.push\s*\(\s*["'`](\/[a-zA-Z0-9\-_/[\]?=&%.#:${}]+)["'`]/g,
  },
  // redirect('/something') — UI 서버 컴포넌트 안의 next/navigation redirect
  {
    name: 'redirect hardcoded',
    re: /(?<!\bafter_)\bredirect\s*\(\s*["'`](\/[a-zA-Z0-9\-_/[\]?=&%.#:${}]+)["'`]/g,
  },
];

// 템플릿이더라도 ROUTES.가 앞에 있으면 예외. 해당 감지는 라인 단위 추가 체크.
function lineUsesRoutesConstant(line) {
  return (
    /\bROUTES\.[A-Z_]+/.test(line) ||
    /\bresolveInteractionHref\s*\(/.test(line) ||
    /\bNAVIGATION_MAP\s*[\[.]/.test(line)
  );
}

// 일부 경로는 외부 표준이라 허용: /api, /_next, /#, /auth/callback?code=... 등은 이미 normalize에서 차단됨.
// 라우터 상수로 수렴 불가능한 정적 페이지(예: `/login`도 ROUTES.LOGIN 있으므로 감지 대상).

function collectHardcodedHrefs() {
  const findings = [];
  for (const file of getSourceFiles()) {
    if (!UI_DIRS.some((d) => file.startsWith(d))) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (const { name, re } of HARDCODE_PATTERNS) {
      const allMatches = [...content.matchAll(new RegExp(re.source, re.flags))];
      for (const match of allMatches) {
        const path = match[1];
        if (!path || path.startsWith('/api/') || path.startsWith('/_next/')) continue;
        // 라인 위치 파악
        const upto = content.slice(0, match.index ?? 0);
        const lineNo = upto.split('\n').length;
        const line = lines[lineNo - 1] ?? '';
        if (lineUsesRoutesConstant(line)) continue; // ROUTES 경유 면제
        findings.push({ file, lineNo, pattern: name, path, line: line.trim() });
      }
    }
  }
  return findings;
}

const { fileToPaths, pathToFiles } = collectPaths();
const allPaths = Array.from(pathToFiles.keys());
const conflicts = singularPluralConflicts(allPaths);
const hardcoded = collectHardcodedHrefs();

console.log('\n[Navigation] 경로 문자열 검사');
console.log(`- 검사 파일 수: ${fileToPaths.size}`);
console.log(`- 경로 리터럴 수: ${allPaths.length}`);
console.log(`- UI 하드코딩 href/push/redirect: ${hardcoded.length}`);

let hasError = false;

if (conflicts.length) {
  hasError = true;
  console.error('\n❌ singular/plural 경로 충돌 발견');
  for (const item of conflicts) {
    console.error(`- ${item.singular} <-> ${item.plural}`);
    const singularFiles = pathToFiles.get(item.singular) ?? [];
    const pluralFiles = pathToFiles.get(item.plural) ?? [];
    if (singularFiles.length) {
      console.error(`  - singular files: ${[...new Set(singularFiles)].slice(0, 5).join(', ')}`);
    }
    if (pluralFiles.length) {
      console.error(`  - plural files: ${[...new Set(pluralFiles)].slice(0, 5).join(', ')}`);
    }
  }
} else {
  console.log('✅ singular/plural 경로 충돌 없음');
}

// 베이스라인: 2026-04-16 기준 기존 하드코딩 수. 이보다 많아지면 실패(회귀 차단).
// 시간을 두고 ROUTES 경유로 점진 교체. 완료되면 BASELINE을 0으로 낮추고
// hardcoded.length > 0으로 조건 변경.
// 2026-04-16 저녁 측정: /inbox, /portal/cases 정리 후 50개. 베이스라인 55로 하향.
// 신규 PR에서 이 수치를 늘리려면 반드시 baseline도 같이 낮춰야 한다.
// 장기 목표: 0.
const HARDCODED_BASELINE = 55;

if (hardcoded.length > HARDCODED_BASELINE) {
  hasError = true;
  console.error(`\n❌ UI 하드코딩 경로 ${hardcoded.length}개 (베이스라인 ${HARDCODED_BASELINE} 초과)`);
  console.error('   규약: CLAUDE.md "페이지·인터랙션 계약 규약" / docs/page-specs/*');
  console.error('   허용: ROUTES.X, ${ROUTES.X}/..., resolveInteractionHref(...), NAVIGATION_MAP[...]');
  console.error('   신규 추가분만 ROUTES 상수 경유로 작성 — 기존 건은 점진 교체.');
  console.error('');
  for (const f of hardcoded.slice(0, 20)) {
    console.error(`  ${f.file}:${f.lineNo}  [${f.pattern}]  ${f.path}`);
  }
  if (hardcoded.length > 20) {
    console.error(`  ... 외 ${hardcoded.length - 20}개`);
  }
} else if (hardcoded.length > 0) {
  console.log(`⚠️  UI 하드코딩 경로 ${hardcoded.length}개 (베이스라인 ${HARDCODED_BASELINE} 이하 — 경고만)`);
  console.log('   CLAUDE.md 규약에 따라 점진 교체 권장. 신규 추가분은 ROUTES 경유 필수.');
} else {
  console.log('✅ UI 하드코딩 href 없음');
}

if (hasError) process.exit(1);
process.exit(0);
