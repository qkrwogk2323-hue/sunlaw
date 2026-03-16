import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Bell, FileText, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAuth } from '@/lib/auth';
import { getPortalCases } from '@/lib/queries/portal';
import { formatDateTime } from '@/lib/format';

export default async function PortalHomePage() {
  const auth = await getCurrentAuth();
  if (!auth) redirect('/login');
  const cases = await getPortalCases();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">의뢰인 포털</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">내 사건의 진행 흐름을 한눈에 확인합니다.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">문서, 요청, 일정, 청구 상태까지 사건별로 이어서 보여주어 다음 확인 포인트가 분명하게 보이도록 구성했습니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><FolderOpen className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">내 사건 {cases.length}건</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><FileText className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">문서 흐름 확인</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><Bell className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">알림과 요청 확인</p></div>
          </div>
        </div>
      </div>
      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>내 사건 흐름</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {cases.length ? cases.map((item: any) => (
            <Link key={item.id} href={`/portal/cases/${item.case_id}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-slate-900">
              <p className="font-medium text-slate-900">{item.cases?.title ?? item.client_name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.cases?.reference_no ?? '-'} · {item.cases?.case_status ?? '-'} · {item.cases?.stage_key ?? '-'}</p>
              <p className="mt-2 text-xs text-slate-400">최근 변경: {formatDateTime(item.cases?.updated_at)}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700">사건 자세히 보기 <ArrowRight className="size-4" /></div>
            </Link>
          )) : <p className="text-sm text-slate-500">현재 연결된 사건이 없습니다. 담당자에게 포털 연결 여부를 문의해 주세요.</p>}
        </CardContent>
      </Card>
    </main>
  );
}
