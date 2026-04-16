import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes/registry';

export default function AppNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">페이지를 찾을 수 없습니다.</h1>
        <p className="text-sm text-slate-600">요청한 리소스가 없거나 현재 권한으로 접근할 수 없습니다.</p>
        <Link href={ROUTES.DASHBOARD} className={buttonStyles()}>
          대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
