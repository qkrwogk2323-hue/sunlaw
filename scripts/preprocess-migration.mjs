#!/usr/bin/env node
/**
 * Supabase Management API `/v1/projects/:ref/database/query` 엔드포인트는 PostgreSQL
 * 원본 파서가 아니라 prepared-statement 기반이라, pg_dump 출력의 몇몇 특수 케이스를
 * 있는 그대로 적용하지 못한다. 이 스크립트는 staging 자동 배포 파이프라인이
 * 사용하는 3종 정규화를 수행한다.
 *
 * 수행 변환:
 *   1. `AS $tag$` 함수 body 종료 지점의 누락된 세미콜론 보완
 *   2. `CREATE TRIGGER` 앞에 `DROP TRIGGER IF EXISTS` 삽입(멱등)
 *   3. nested `$$`(태그 없음) 블록을 호출 컨텍스트 따라 `$inner_tag$`로 구분
 *
 * 사용법:
 *   node scripts/preprocess-migration.mjs < input.sql > output.sql
 *   node scripts/preprocess-migration.mjs input.sql           # stdout으로 출력
 *   node scripts/preprocess-migration.mjs input.sql -o out.sql
 *
 * 2026-04-15 staging 분리 작업에서 수동으로 사용한 Python 로직의 Node 포팅.
 * 재현 대상: migrations 20개가 전부 `siljimybhmmtbligzbms` 프로젝트에 적용되는 것.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { argv, stdin, stdout, exit } from 'node:process';

/**
 * 1) CREATE FUNCTION body `AS $tag$ ... $tag$` 의 닫는 $tag$ 뒤 세미콜론 보완.
 *    라인 상태 머신: `AS $tag$`로 끝나는 라인을 보면 `in_func=true`, 다음으로
 *    그 태그만 단독으로 있는 라인을 만나면 body 종료. 그 라인이 이미 ;로 끝나거나
 *    다음 라인이 ;로 시작하면 그대로 두고, 아니면 ; 추가.
 */
function fixFunctionBodies(text) {
  const lines = text.split('\n');
  const out = [];
  let inFunc = false;
  let funcTag = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFunc) {
      const m = line.match(/\bAS\s+(\$[a-z_]*\$)\s*$/i);
      if (m) {
        inFunc = true;
        funcTag = m[1];
      }
      out.push(line);
    } else {
      if (line.trim() === funcTag) {
        const next = i + 1 < lines.length ? lines[i + 1].trimStart() : '';
        if (line.trimEnd().endsWith(';') || next.startsWith(';')) {
          out.push(line);
        } else {
          out.push(line.replace(funcTag, funcTag + ';'));
        }
        inFunc = false;
        funcTag = null;
      } else {
        out.push(line);
      }
    }
  }
  return out.join('\n');
}

/**
 * 2a) CREATE TRIGGER 앞에 DROP TRIGGER IF EXISTS 삽입(멱등).
 *     기존에 이미 DROP IF EXISTS가 같은 트리거로 선행돼 있으면 중복 추가하지 않음.
 */
function addIdempotentTriggerDrops(text) {
  const pattern = /(?<!\S)(create\s+trigger\s+)([a-z_][a-z0-9_]*)(\s+(?:before|after|instead\s+of)[\s\S]*?on\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?))/gi;
  return text.replace(pattern, (match, head, trig, tail, tbl, offset, str) => {
    const recent = str.slice(Math.max(0, offset - 500), offset);
    const dropRe = new RegExp(`drop\\s+trigger\\s+if\\s+exists\\s+${trig}\\s+on\\s+${tbl.replace('.', '\\.')}`, 'i');
    if (dropRe.test(recent)) return match;
    return `drop trigger if exists ${trig} on ${tbl};\n${head}${trig}${tail}`;
  });
}

/**
 * 2b) CREATE POLICY 앞에 DROP POLICY IF EXISTS 삽입(멱등).
 *     policy 이름은 따옴표 또는 non-quoted 둘 다 대응.
 */
function addIdempotentPolicyDrops(text) {
  // CREATE POLICY "name" ON schema.table  또는  CREATE POLICY name ON schema.table
  const pattern = /(?<!\S)(create\s+policy\s+)("[^"]+"|[a-z_][a-z0-9_]*)(\s+on\s+(?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*)/gi;
  return text.replace(pattern, (match, head, name, tail, offset, str) => {
    const recent = str.slice(Math.max(0, offset - 500), offset);
    // Escape name for regex (quotes, identifiers)
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dropRe = new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${esc}`, 'i');
    if (dropRe.test(recent)) return match;
    // table 이름 추출
    const tblMatch = tail.match(/\s+on\s+((?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*)/i);
    const tbl = tblMatch ? tblMatch[1] : '';
    return `drop policy if exists ${name} on ${tbl};\n${head}${name}${tail}`;
  });
}

/**
 * 3) `perform cron.schedule(name, cronspec, $$ ... $$);` 형태에서 inner `$$`를 `$cron_body$`로 치환.
 *    seed_data의 `do $$ ... perform cron.schedule(...,$$ ... $$) ... end $$;` 가 outer-inner 동일 태그로
 *    생성되어 파서가 중첩을 식별 못 함. tag 이름을 구분해야 응답 성공.
 *    다른 함수형 nested $$도 같은 시그니처면 일반화 가능하지만, 보수적으로 `cron.schedule`만 대상.
 */
function disambiguateNestedCronSchedule(text) {
  // perform cron.schedule(..., $$body$$) 의 inner $$ → $cron_body$
  return text.replace(
    /(perform\s+cron\.schedule\s*\([^)]*?)(\$\$)([\s\S]*?)(\$\$)(\s*\))/gi,
    (_m, pre, _open, body, _close, post) => `${pre}$cron_body$${body}$cron_body$${post}`
  );
}

/**
 * 4) 권한이 없는 SUPABASE 관리 객체에 대한 COMMENT ON 문장 제거.
 *    `COMMENT ON TABLE storage.buckets IS ...;` 같은 문장은 Supabase 관리자 권한이
 *    아니므로 실행 불가. Management API 사용자가 must be owner 에러로 실패.
 *    해당 문장만 주석 처리하여 건너뜀. 앱 기능에 영향 없음.
 */
function stripUnownedComments(text) {
  return text.replace(
    /COMMENT\s+ON\s+TABLE\s+storage\.buckets\s+IS[\s\S]*?;/gi,
    '-- COMMENT ON TABLE storage.buckets (skipped: not owner)'
  );
}

export function preprocess(sql) {
  let out = sql;
  out = fixFunctionBodies(out);
  out = addIdempotentTriggerDrops(out);
  out = addIdempotentPolicyDrops(out);
  out = disambiguateNestedCronSchedule(out);
  out = stripUnownedComments(out);
  return out;
}

async function readStdin() {
  return await new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf-8');
    stdin.on('data', (chunk) => { data += chunk; });
    stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const args = argv.slice(2);
  let inputPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') {
      outputPath = args[++i];
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log('Usage: preprocess-migration.mjs [input.sql] [-o output.sql]');
      console.log('       preprocess-migration.mjs < input.sql > output.sql');
      exit(0);
    } else {
      inputPath = args[i];
    }
  }

  const src = inputPath ? readFileSync(inputPath, 'utf-8') : await readStdin();
  const out = preprocess(src);

  if (outputPath) {
    writeFileSync(outputPath, out, 'utf-8');
    console.error(`[preprocess-migration] wrote ${outputPath} (${out.length} bytes)`);
  } else {
    stdout.write(out);
  }
}

// CLI 진입점 (import로 쓰이면 실행 안 됨)
if (import.meta.url === `file://${argv[1]}`) {
  main().catch((e) => { console.error(e); exit(1); });
}
