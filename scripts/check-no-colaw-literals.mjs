#!/usr/bin/env node
/**
 * Golden Case 사건 특정 숫자가 런타임 코드에 들어가지 않았는지 검사.
 *
 * 허용: tests/**, docs/**, scripts/**
 * 금지: src/lib/rehabilitation/**, src/app/**, src/lib/actions/**
 *
 * CI에서 실행: node scripts/check-no-colaw-literals.mjs
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

// Golden Case 001 (김형태) 사건 특정 숫자 — 런타임 코드 금지
const FORBIDDEN_LITERALS = [
  '920000000',    // 담보부 합계
  '658160000',    // 무담보 합계
  '2461463',      // 월 변제액
  '88612668',     // 총 변제예정액
  '490000000',    // 우리은행 환가예상액
  '420000000',    // 농협은행 환가예상액
  '10000000',     // 현대캐피탈 환가예상액 (10M — 다른 의미로도 쓸 수 있어 주의)
];

// 허용 디렉토리 (테스트·문서·스크립트)
const ALLOWED_DIRS = ['tests/', 'docs/', 'scripts/', '__tests__/', 'fixtures/'];

// 검사 대상 확장자
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

const root = process.cwd();
const violations = [];

for await (const filePath of walkDir(root)) {
  const rel = relative(root, filePath);

  // 허용 디렉토리 skip
  if (ALLOWED_DIRS.some((d) => rel.startsWith(d))) continue;

  // 확장자 필터
  if (!TARGET_EXTENSIONS.some((ext) => filePath.endsWith(ext))) continue;

  const content = await readFile(filePath, 'utf-8');

  for (const literal of FORBIDDEN_LITERALS) {
    // 숫자 리터럴로 등장하는 경우만 (언더스코어 포함: 920_000_000)
    const patterns = [
      literal,
      literal.replace(/(\d)(?=(\d{3})+$)/g, '$1_'), // 920_000_000
      literal.replace(/(\d)(?=(\d{3})+$)/g, '$1,'), // 920,000,000 (문자열 내)
    ];

    for (const pat of patterns) {
      if (content.includes(pat)) {
        // 주석인지 확인 (단순 휴리스틱)
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(pat)) {
            const trimmed = line.trim();
            // 주석은 경고만
            const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
            violations.push({
              file: rel,
              line: i + 1,
              literal: pat,
              isComment,
              content: trimmed.slice(0, 100),
            });
          }
        }
      }
    }
  }
}

if (violations.length === 0) {
  console.log('✅ No COLAW case-specific literals found in runtime code.');
  process.exit(0);
}

const runtimeViolations = violations.filter((v) => !v.isComment);
const commentWarnings = violations.filter((v) => v.isComment);

if (commentWarnings.length > 0) {
  console.log(`\n⚠ ${commentWarnings.length} comment(s) contain case-specific literals (warning only):`);
  for (const v of commentWarnings) {
    console.log(`  ${v.file}:${v.line} — ${v.literal}`);
  }
}

if (runtimeViolations.length > 0) {
  console.log(`\n❌ ${runtimeViolations.length} runtime violation(s) found:`);
  for (const v of runtimeViolations) {
    console.log(`  ${v.file}:${v.line} — literal "${v.literal}"`);
    console.log(`    ${v.content}`);
  }
  process.exit(1);
}

console.log('\n✅ All case-specific literals are in comments only (no runtime violations).');
process.exit(0);
