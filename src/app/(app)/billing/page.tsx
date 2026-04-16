import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { getBillingPageSnapshot } from '@/lib/queries/billing';
import { LogButton } from '@/components/ui/log-button';
import { ROUTES } from '@/lib/routes/registry';

// 비용 리포트 페이지 (2026-04-17 재정의).
//
// 이전: 조직 전체 비용 관리 허브. 청구·약정 쓰기 폼을 이 페이지에서 제공.
// 현재: **읽기 전용 리포트**. 쓰기 액션은 사건 허브 비용 탭(`?tab=billing`)에서만.
// 이유:
//   - 비용 워크플로는 근본적으로 사건 단위(청구/수금/약정 모두 사건 기준)
//   - 2 개 경로(허브 탭 + 글로벌 메뉴) 유지 시 "어디서 해야 하지" 혼란
//   - notification destination은 2026-04-17 정책 수렴 시 이미 hub 탭으로 고정됨(0b59fad)
// 이 페이지의 남은 역할:
//   - 조직 전체 집계 요약(보수/공과금/약정/미납 수) KPI 카드
//   - 각 KPI 클릭 → anchor로 하단 리스트 섹션 스크롤
//   - 상세·수정은 각 항목의 사건 허브 링크로 유도
export default async function BillingPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const isManager = Boolean(membership && isManagementRole(membership.role));
  const billing = await getBillingPageSnapshot(organizationId);

  const openStatuses = new Set(['draft', 'issued', 'partial']);
  const clientVisibleEntries = billing.entries.filter((entry: any) => Boolean(entry.bill_to_case_client_id));
  const clientAttentionEntries = clientVisibleEntries.filter((entry: any) => openStatuses.has(entry.status)).slice(0, 8);
  const remunerationEntries = billing.entries.filter((entry: any) => ['retainer_fee', 'flat_fee', 'success_fee', 'service_fee', 'adjustment', 'discount'].includes(entry.entry_kind));
  const publicChargeEntries = billing.entries.filter((entry: any) => ['expense', 'court_fee'].includes(entry.entry_kind));
  const installmentAgreements = billing.agreements.filter((agreement: any) => agreement.agreement_type === 'installment_plan' && agreement.is_active);
  const topCards = [
    {
      label: '보수',
      value: remunerationEntries.length,
      href: '/billing#remuneration' as Route
    },
    {
      label: '공과금',
      value: publicChargeEntries.length,
      href: '/billing#public-charges' as Route
    },
    {
      label: '분할납부약정금액',
      value: installmentAgreements.length,
      href: '/billing#installment-agreements' as Route
    },
    {
      label: '미납 금액',
      value: clientAttentionEntries.length,
      href: '/billing#outstanding-amounts' as Route
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 리포트</h1>
          <p className="mt-1 text-sm text-slate-500">
            조직 전체 보수·공과금·분납·미납 현황을 사건 기준으로 한 번에 봅니다.
            청구 발행·수금 기록·약정 체결은 각 사건 허브의 <span className="font-medium text-slate-700">비용 탭</span>에서 수행합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {isManager && organizationId && (
            <LogButton
              organizationId={organizationId}
              surface="billing"
              label="비용 기록"
              title="비용·약정·구독 기록"
              description="청구 항목 생성·수정, 약정 변경, 입금 기록, 구독 상태 변경 이력입니다."
            />
          )}
          <Link href={'/billing/history' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            비용 기록 보기
          </Link>
          <Link href={ROUTES.CONTRACTS} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
            계약 관리
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {topCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 leading-tight">{card.label}</p>
            <p className="mt-3 text-center text-2xl font-semibold text-slate-950 tabular-nums">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <BillingReadonlySection
          id="remuneration"
          title="보수"
          items={remunerationEntries}
          emptyMessage="등록된 보수 항목이 없습니다. 사건 허브 비용 탭에서 추가합니다."
        />
        <BillingReadonlySection
          id="public-charges"
          title="공과금"
          items={publicChargeEntries}
          emptyMessage="등록된 공과금이 없습니다."
        />
        <BillingReadonlySection
          id="installment-agreements"
          title="분할납부약정"
          items={installmentAgreements}
          emptyMessage="현재 활성 분할납부약정이 없습니다."
          renderItem={(agreement: any) => ({
            title: agreement.title ?? '분할납부약정',
            subtitle: [
              agreement.cases?.title ?? null,
              agreement.effective_from ? `시작 ${agreement.effective_from}` : null
            ].filter(Boolean).join(' · '),
            caseId: agreement.case_id ?? null
          })}
        />
        <BillingReadonlySection
          id="outstanding-amounts"
          title="미납 금액"
          items={clientAttentionEntries}
          emptyMessage="의뢰인 미납 항목이 없습니다."
        />
      </section>
    </div>
  );
}

// 읽기 전용 섹션 — /billing의 쓰기 역할 제거 후 리포트 성격으로 축소.
// 각 항목은 원본 사건 허브로 drill-down 링크만 제공.
function BillingReadonlySection({
  id,
  title,
  items,
  emptyMessage,
  renderItem
}: {
  id: string;
  title: string;
  items: Array<Record<string, any>>;
  emptyMessage: string;
  renderItem?: (item: any) => { title: string; subtitle: string; caseId: string | null };
}) {
  return (
    <section id={id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-500">{items.length}건</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item: any) => {
            const rendered = renderItem
              ? renderItem(item)
              : {
                  title: item.title ?? '항목',
                  subtitle: [
                    item.cases?.title ?? (Array.isArray(item.cases) ? item.cases[0]?.title : null) ?? null,
                    item.due_on ? `기한 ${item.due_on}` : null
                  ].filter(Boolean).join(' · '),
                  caseId: item.case_id ?? null
                };
            const hubHref = (rendered.caseId
              ? `/cases/${rendered.caseId}?tab=billing`
              : '/cases') as Route;
            return (
              <li key={item.id}>
                <Link
                  href={hubHref}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm transition hover:border-slate-200 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{rendered.title}</p>
                    {rendered.subtitle ? (
                      <p className="truncate text-xs text-slate-500">{rendered.subtitle}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-sky-700">사건 허브 열기 →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
