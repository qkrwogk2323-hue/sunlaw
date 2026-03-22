import Link from 'next/link';
import type { Route } from 'next';
import { Boxes, Building2, CreditCard, FileStack, Scale, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { moduleCatalog } from '@/lib/module-catalog';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';
import { buttonStyles } from '@/components/ui/button';

const toneClasses = {
  blue: 'border-sky-200 bg-sky-50 text-sky-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800'
} as const;

const toneBadges = {
  blue: 'blue' as const,
  green: 'green' as const,
  amber: 'amber' as const
};

function getGroupIcon(groupKey: string) {
  if (groupKey === 'common') return CreditCard;
  if (groupKey === 'legal') return Scale;
  if (groupKey === 'collections') return FileStack;
  return Boxes;
}

export default async function AdminModulesPage() {
  const auth = await requireAuthenticatedUser();
  const canAccess = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!canAccess) {
    return (
      <AccessDeniedBlock
        blocked="플랫폼 관리자 전용 화면 접근이 차단되었습니다."
        cause="현재 조직 또는 현재 계정 권한으로는 모듈 카탈로그를 관리할 수 없습니다."
        resolution="플랫폼 조직 관리자 권한으로 전환하거나, 권한 승인을 요청해 주세요."
      />
    );
  }

  const totalFamilies = moduleCatalog.length;
  const totalModules = moduleCatalog.reduce((sum, group) => sum + group.entries.length, 0);
  const totalSubmodules = moduleCatalog.reduce((sum, group) => sum + group.entries.reduce((inner, entry) => inner + entry.submodules.length, 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[1.8rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.35),_transparent_32%),linear-gradient(135deg,#f8fbff,#eef6ff_42%,#f8fafc)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700">
              <Sparkles className="size-3.5" />
              플랫폼 관리자 전용 모듈 카탈로그
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">추가 모듈</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                플랫폼 관리자 시야에서 전체 업종 모듈을 한 번에 검토할 수 있는 페이지입니다. 법률/법무, 채권추심업, 공통 비용관리까지
                현재 제공 중인 모듈과 확장 후보 하위 모듈을 함께 정리했습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">모듈군</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalFamilies}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">대표 모듈</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalModules}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">하위 모듈</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalSubmodules}</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>운영 기준</CardTitle>
            <Link
              href={'/admin/audit?tab=general&table=organization_module_overrides' as Route}
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
            >
              설정 이력 보기
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="font-medium text-slate-900">공통 모듈</p>
            <p className="mt-2 leading-6">비용관리, 리포트, 의뢰인 포털처럼 업종과 무관하게 공유되는 모듈입니다.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="font-medium text-slate-900">업종 특화 모듈</p>
            <p className="mt-2 leading-6">법률/법무와 채권추심업에 맞는 핵심 모듈과 하위 확장 모듈을 분리해서 관리합니다.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="font-medium text-slate-900">확장 후보</p>
            <p className="mt-2 leading-6">회생/파산, 추심-법무 협업처럼 향후 세분화할 하위 모듈을 같은 목록에서 검토할 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        {moduleCatalog.map((group) => {
          const Icon = getGroupIcon(group.key);

          return (
            <Card key={group.key} className="overflow-hidden">
              <CardHeader className={`border-b px-5 py-5 ${toneClasses[group.tone]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-sm">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="mt-4">{group.title}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{group.description}</p>
                  </div>
                  <Badge tone={toneBadges[group.tone]}>{group.entries.length}개 모듈</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {group.entries.map((entry) => (
                  <div key={entry.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{entry.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{entry.summary}</p>
                      </div>
                      <Badge tone={entry.defaultStatus === '기본 제공' ? 'green' : entry.defaultStatus.includes('기본') ? 'blue' : 'amber'}>{entry.defaultStatus}</Badge>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-900">적용 대상</span> · {entry.audience}
                      </p>
                      {entry.route ? (
                        <p>
                          <span className="font-medium text-slate-900">대표 경로</span> · <Link href={entry.route as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'ml-2 h-8 rounded-lg px-2 text-[11px]' })}>{entry.route}</Link>
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">하위 모듈</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.submodules.map((submodule) => (
                          <span key={submodule} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            {submodule}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">운영 포인트</p>
                      <div className="mt-2 space-y-1.5">
                        {entry.highlights.map((highlight) => (
                          <p key={highlight}>• {highlight}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>활용 가이드</CardTitle>
            <Link
              href={'/admin/audit?tab=general&table=organization_module_overrides' as Route}
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
            >
              감사로그에서 확인
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 text-slate-900">
              <Building2 className="size-4" />
              <p className="font-medium">조직 개설 검토와 함께 사용</p>
            </div>
            <p className="mt-2 leading-6">조직 신청을 승인할 때 어떤 업종 모듈을 기본 노출할지 이 페이지 기준으로 판단할 수 있습니다.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 text-slate-900">
              <Boxes className="size-4" />
              <p className="font-medium">향후 확장 기준 정리</p>
            </div>
            <p className="mt-2 leading-6">회생/파산, 추심-법무 협업 같은 하위 모듈은 여기서 먼저 정의해 두고 이후 기능 설정이나 조직별 계약 옵션으로 연결하면 됩니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
