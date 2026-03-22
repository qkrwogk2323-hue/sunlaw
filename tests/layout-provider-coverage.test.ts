import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('layout provider coverage', () => {
  it('루트 레이아웃이 전역 ToastProvider를 제공한다', () => {
    const source = read('src/app/layout.tsx');

    expect(source).toContain("import { ToastProvider } from '@/components/ui/toast-provider';");
    expect(source).toContain('<ToastProvider>{children}</ToastProvider>');
  });

  it('(app) 레이아웃은 중복 ToastProvider를 두지 않는다', () => {
    const source = read('src/app/(app)/layout.tsx');

    expect(source).not.toContain("import { ToastProvider } from '@/components/ui/toast-provider';");
    expect(source).not.toContain('<ToastProvider>');
  });
});
