import { Badge } from '@/components/ui/badge';
import { DemoWorkspaceClient } from '@/app/demo/demo-workspace-client';
import { DEMO_ROLES, type DemoRole } from '@/lib/demo/workspace-demo';

/**
 * @rule-meta-start
 * surfaceScope: public
 * requiresAuth: false
 * requiresTraceability: false
 * traceEntity: public_workspace_demo
 * @rule-meta-end
 */
export const dynamic = 'force-static';

export default async function DemoWorkspacePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const roleParam = typeof resolvedSearchParams.role === 'string' ? resolvedSearchParams.role : 'law';
  const initialRole = (DEMO_ROLES.some((item) => item.key === roleParam) ? roleParam : 'law') as DemoRole;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff,#eef5ff)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#111827,#334155)] p-6 text-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">공개 데모</p>
              <h1 className="text-3xl font-semibold tracking-tight">관리자 화면 탐방 데모</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-200">
                메인 카드 4개 중 하나를 누르면 역할별 관리자 화면처럼 보이는 데모가 열리고, 좌측 메뉴를 눌러 허브, 비용, 알림, 의뢰인 흐름을 계속 탐방할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs leading-5 text-slate-100">
              <Badge tone="blue">읽기 전용</Badge>
              <p className="mt-2">저장, 전송, 권한 변경은 일어나지 않습니다.</p>
            </div>
          </div>
        </div>

        <DemoWorkspaceClient initialRole={initialRole} />
      </div>
    </div>
  );
}
