#!/usr/bin/env node
/**
 * Supabase 생성 타입과 저장소에 커밋된 타입 파일을 비교.
 *
 * 목적: 스키마와 코드 계약을 자동으로 고정 (지시서 4.7).
 *   migration이 바뀌었는데 src/types/supabase.generated.ts가 갱신되지 않으면
 *   CI 실패.
 *
 * 사용법:
 *   # 로컬에서 types 갱신 (수동):
 *   pnpm types:gen
 *
 *   # CI에서 diff 감지 (env 필요):
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_ID=... pnpm types:check
 *
 * env 미설정 시 graceful skip (exit 0) — 로컬 개발 무해.
 * CI 파이프라인에서는 secrets 세팅 후 exit 2면 PR 머지 차단.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TYPES_PATH = resolve(process.cwd(), 'src/types/supabase.generated.ts');
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_REF;
const MODE = process.argv[2] ?? 'check'; // 'check' | 'gen'

if (!ACCESS_TOKEN || !PROJECT_ID) {
  console.warn('[check-supabase-types] SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_ID not set; skipping.');
  process.exit(0);
}

function generateTypes() {
  try {
    const output = execSync(
      `supabase gen types typescript --project-id ${PROJECT_ID}`,
      {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    return output;
  } catch (err) {
    console.error('[check-supabase-types] supabase gen types failed:');
    if (err && typeof err === 'object' && 'stderr' in err) {
      console.error(String(err.stderr));
    } else {
      console.error(String(err));
    }
    process.exit(1);
  }
}

const freshTypes = generateTypes();

if (MODE === 'gen') {
  writeFileSync(TYPES_PATH, freshTypes, 'utf8');
  console.log(`[check-supabase-types] wrote ${TYPES_PATH} (${freshTypes.length} bytes).`);
  process.exit(0);
}

// check 모드
if (!existsSync(TYPES_PATH)) {
  console.error(`[check-supabase-types] committed types file missing: ${TYPES_PATH}`);
  console.error("→ 'pnpm types:gen'을 실행해 생성하고 커밋하세요.");
  process.exit(2);
}

const committedTypes = readFileSync(TYPES_PATH, 'utf8');

if (committedTypes.trim() === freshTypes.trim()) {
  console.log(`[check-supabase-types] OK — types match remote schema (${committedTypes.length} bytes).`);
  process.exit(0);
}

console.error('[check-supabase-types] DRIFT — remote Supabase schema does not match committed types file.');
console.error('  Expected:', TYPES_PATH);
console.error('  Remote   : supabase gen types typescript --project-id', PROJECT_ID);
console.error('');
console.error("→ 'pnpm types:gen'으로 재생성 후 커밋하세요. migration이 누락됐을 수도 있습니다.");
process.exit(2);
