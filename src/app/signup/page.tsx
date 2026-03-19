import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft } from 'lucide-react';
import { GeneralSignupForm } from '@/components/forms/general-signup-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function SimpleSignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <Card className="w-full rounded-[1.8rem]">
        <CardHeader className="border-none pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">일반회원가입</p>
          <CardTitle className="mt-2 text-3xl">회원가입을 먼저 완료하세요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-slate-600">
            카카오 로그인 지연과 관계없이, 이 화면에서 이메일 기반 일반회원가입을 바로 진행할 수 있습니다.
          </p>
          <GeneralSignupForm />
          <div>
            <Link
              href={'/start' as Route}
              className={buttonStyles({ variant: 'ghost', className: 'min-h-12 rounded-[1.25rem] px-4 text-base' })}
            >
              <ArrowLeft className="size-4" /> 시작 화면으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
