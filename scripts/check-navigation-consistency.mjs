#!/usr/bin/env node
/**
 * check-navigation-consistency.mjs
 *
 * 목적:
 * - 코드 전역의 하드코딩 경로 문자열을 수집한다.
 * - singular/plural 경로 충돌(/service vs /services)을 탐지한다.
 *
 * 사용:
 *   node scripts/check-navigation-consistency.mjs
 *   pnpm check:navigation-consistency
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PATH_LITERAL_RE = /['"`](\/[a-zA-Z0-9\-_/[\]?=&%.#:]*)['"`]/g;
function getSourceFiles() {
  const out = execSync("rg --files src -g '*.ts' -g '*.tsx'", { encoding: 'utf8', stdio: 'pipe' }).trim();
  if (!out) return [];
  return out.split('\n').filter(Boolean);
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

const { fileToPaths, pathToFiles } = collectPaths();
const allPaths = Array.from(pathToFiles.keys());
const conflicts = singularPluralConflicts(allPaths);

console.log('\n[Navigation] 경로 문자열 검사');
console.log(`- 검사 파일 수: ${fileToPaths.size}`);
console.log(`- 경로 리터럴 수: ${allPaths.length}`);

if (!conflicts.length) {
  console.log('✅ singular/plural 경로 충돌 없음');
  process.exit(0);
}

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

process.exit(1);
