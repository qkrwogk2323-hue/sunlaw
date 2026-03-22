import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { legalAdminDemoModel } from '@/lib/demo/legal-admin-dummy';

/**
 * @rule-meta-start
 * surfaceScope: public
 * requiresAuth: false
 * requiresTraceability: false
 * traceEntity: public_legal_admin_demo
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

function toneByAlert(kind: 'urgent' | 'review' | 'meeting' | 'other') {
  if (kind === 'urgent') return 'red' as const;
  if (kind === 'review') return 'blue' as const;
  if (kind === 'meeting') return 'green' as const;
  return 'slate' as const;
}

export default function PublicLegalAdminDemoPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f5f7fb)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.07)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">공개 데모</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{legalAdminDemoModel.heroTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{legalAdminDemoModel.heroSummary}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {legalAdminDemoModel.stats.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-3xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-3 text-center text-xs text-slate-500">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>오늘 바로 확인할 알림</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {legalAdminDemoModel.alerts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={toneByAlert(item.kind)}>{item.time}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>권한 시뮬레이션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {legalAdminDemoModel.roles.map((role) => (
              <div key={role.roleKey} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{role.label}</p>
                  <Badge tone="slate">읽기 전용</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{role.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.focus.map((item) => (
                    <Badge key={item} tone="blue">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>샘플 사건 보드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {legalAdminDemoModel.cases.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone="slate">{item.stage}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.owner} · {item.dueLabel}</p>
                <p className="mt-1 text-sm text-slate-700">{item.amountLabel}</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-slate-900" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} tone="green">{tag}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>샘플 계약·비용 흐름</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {legalAdminDemoModel.contracts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone="amber">{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.counterparty}</p>
                <p className="mt-1 text-sm text-slate-700">{item.amountLabel}</p>
                <p className="mt-3 text-xs text-slate-500">동의 방식 · {item.consentMethod}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
