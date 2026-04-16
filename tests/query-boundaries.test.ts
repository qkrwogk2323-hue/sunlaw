/**
 * Portal 과다조회 차단 테스트 — 2026-04-16 Task 7 중 3번.
 *
 * 리뷰어 지시: "의뢰인 포털의 case_clients / parties / handlers / organizations
 * 과다 조회 차단을 위해 쿼리 계층을 분리한다." 이 테스트는 오늘 만든
 * `scripts/check-query-boundaries.mjs`가 실제로 위반 케이스에서 실패를 내는지
 * + 현재 코드베이스에 위반이 없는지 검증.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHECK_SCRIPT = path.resolve(process.cwd(), 'scripts/check-query-boundaries.mjs');

function runCheck(cwd: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(`node ${CHECK_SCRIPT}`, { cwd, encoding: 'utf8' });
    return { code: 0, stdout, stderr: '' };
  } catch (err: any) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? err.message,
    };
  }
}

function makeFakeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vein-check-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return root;
}

describe('check-query-boundaries.mjs — portal 과다조회 차단', () => {
  it('현재 repo에서는 위반 0건 (회귀 baseline)', () => {
    const result = runCheck(process.cwd());
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('쿼리 경계 위반 없음');
  });

  it('portal에서 clients 쿼리 import 시도 → 위반 감지', () => {
    const root = makeFakeRepo({
      'src/app/portal/bad.tsx': `import { listClients } from '@/lib/queries/clients';\nexport {};`,
    });
    try {
      const result = runCheck(root);
      expect(result.code).toBe(2);
      expect(result.stderr + result.stdout).toMatch(/clients.ts/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('직원 앱에서 portal 쿼리 import 시도 → 위반 감지', () => {
    const root = makeFakeRepo({
      'src/app/(app)/dashboard/bad.tsx': `import { getPortalCases } from '@/lib/queries/portal';\nexport {};`,
    });
    try {
      const result = runCheck(root);
      expect(result.code).toBe(2);
      expect(result.stderr + result.stdout).toMatch(/portal/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('허용된 조합 (portal → portal, app → clients)은 통과', () => {
    const root = makeFakeRepo({
      'src/app/portal/good.tsx': `import { getPortalCases } from '@/lib/queries/portal';\nexport {};`,
      'src/app/(app)/clients/good.tsx': `import { listClients } from '@/lib/queries/clients';\nexport {};`,
    });
    try {
      const result = runCheck(root);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('쿼리 경계 위반 없음');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
