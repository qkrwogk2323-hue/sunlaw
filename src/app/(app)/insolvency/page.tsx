import Link from 'next/link';
import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Scale, CheckCircle, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';

function formatCurrency(n: number | null) {
  if (n == null) return '-';
  return new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원';
}

const SUBTYPE_LABEL: Record<string, string> = {
  individual_rehabilitation: '개인회생',
  individual_bankruptcy: '개인파산',
  corporate_rehabilitation: '법인회생',
  corporate_bankruptcy: '법인파산'
};

const PLAN_STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  confirmed: '확정',
  filed: '제출완료',
  approved: '인가',
  rejected: '기각',
  cancelled: '취소'
};

const PLAN_STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-blue-100 text-blue-700',
  filed: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-slate-100 text-slate-400'
};

export default async function InsolvencyDashboardPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const supabase = await createSupabaseServerClient();

  if (!organizationId) {
    return (
      <div className="p-6">
        <p className="text-slate-500">조직을 먼저 선택해주세요.</p>
      </div>
    );
  }

  // 도산 사건 목록 (insolvency case_type)
  const { data: insolvencyCases } = await supabase
    .from('cases')
    .select('id, title, case_number, insolvency_subtype, stage, created_at')
    .eq('organization_id', organizationId)
    .eq('case_type', 'insolvency')
    .neq('lifecycle_status', 'soft_deleted')
    .order('created_at', { ascending: false });

  const cases = insolvencyCases ?? [];
  const caseIds = cases.map((c) => c.id);

  // 채권자 통계
  const { data: creditorStats } = caseIds.length > 0
    ? await supabase
        .from('insolvency_creditors')
        .select('case_id, claim_class, total_claim_amount, is_confirmed')
        .in('case_id', caseIds)
        .neq('lifecycle_status', 'soft_deleted')
    : { data: [] };

  // 변제계획 최신 버전 per case
  const { data: planStats } = caseIds.length > 0
    ? await supabase
        .from('insolvency_repayment_plans')
        .select('case_id, version_number, status, general_repayment_rate_pct, total_claim_amount, repayment_months, plan_start_date, plan_end_date')
        .in('case_id', caseIds)
        .order('version_number', { ascending: false })
    : { data: [] };

  // 액션패킷 통계
  const { data: packetStats } = caseIds.length > 0
    ? await supabase
        .from('insolvency_client_action_packets')
        .select('case_id, status, completed_count, total_count')
        .in('case_id', caseIds)
    : { data: [] };

  // 집계
  const creditorsByCaseId = (creditorStats ?? []).reduce<Record<string, typeof creditorStats>>((acc, c) => {
    if (!c) return acc;
    (acc[c.case_id] ??= []).push(c);
    return acc;
  }, {});

  const latestPlanByCaseId: Record<string, NonNullable<typeof planStats>[0]> = {};
  for (const plan of (planStats ?? [])) {
    if (!plan) continue;
    if (!latestPlanByCaseId[plan.case_id]) latestPlanByCaseId[plan.case_id] = plan;
  }

  const packetsByCaseId = (packetStats ?? []).reduce<Record<string, typeof packetStats>>((acc, p) => {
    if (!p) return acc;
    (acc[p.case_id] ??= []).push(p);
    return acc;
  }, {});

  // 요약 KPI
  const totalCases = cases.length;
  const totalCreditors = (creditorStats ?? []).length;
  const totalClaim = (creditorStats ?? []).reduce((s, c) => s + (c?.total_claim_amount ?? 0), 0);
  const activePlans = Object.values(latestPlanByCaseId).filter((p) => p && ['confirmed', 'filed', 'approved'].includes(p.status)).length;

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">도산 현황판</h1>
        <p className="mt-1 text-sm text-slate-500">개인회생·파산·법인 도산 사건 진행 현황 (M09)</p>
      </div>

      {/* 요약 KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '도산 사건 수', value: totalCases, icon: Scale, color: 'text-blue-600' },
          { label: '총 채권자 수', value: totalCreditors, icon: Users, color: 'text-orange-600' },
          { label: '총 채권액', value: formatCurrency(totalClaim), icon: TrendingUp, color: 'text-purple-600' },
          { label: '활성 변제계획', value: activePlans, icon: CheckCircle, color: 'text-green-600' }
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} aria-hidden="true" />
              <p className="text-xs text-slate-500">{kpi.label}</p>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 사건 목록 */}
      {cases.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
          <Scale className="mx-auto mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="font-medium text-slate-600">아직 도산 사건이 없습니다</p>
          <p className="mt-1 text-sm text-slate-400">
            사건 등록 시 유형을 &quot;insolvency&quot;로 선택하면 이 현황판에 표시됩니다
          </p>
          <Link
            href="/cases"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            사건 목록으로 이동
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">도산 사건 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="도산 사건 목록">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">사건명</th>
                  <th className="px-3 py-3 font-medium">유형</th>
                  <th className="px-3 py-3 text-right font-medium">채권자</th>
                  <th className="px-3 py-3 text-right font-medium">총 채권액</th>
                  <th className="px-3 py-3 font-medium">변제계획</th>
                  <th className="px-3 py-3 text-right font-medium">변제율</th>
                  <th className="px-3 py-3 font-medium">액션패킷</th>
                  <th className="px-3 py-3 font-medium"><span className="sr-only">바로가기</span></th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const caseCreditors = creditorsByCaseId[c.id] ?? [];
                  const caseClaim = caseCreditors.reduce((s, cr) => s + (cr?.total_claim_amount ?? 0), 0);
                  const confirmedCount = caseCreditors.filter((cr) => cr?.is_confirmed).length;
                  const plan = latestPlanByCaseId[c.id];
                  const casePackets = packetsByCaseId[c.id] ?? [];
                  const packetCompleted = casePackets.filter((p) => p?.status === 'completed').length;

                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{c.title}</p>
                        {c.case_number && (
                          <p className="text-xs text-slate-400">{c.case_number}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {c.insolvency_subtype ? SUBTYPE_LABEL[c.insolvency_subtype] ?? c.insolvency_subtype : '미지정'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="font-medium">{caseCreditors.length}</p>
                        {confirmedCount < caseCreditors.length && caseCreditors.length > 0 && (
                          <p className="flex items-center justify-end gap-0.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {caseCreditors.length - confirmedCount}건 미확정
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">{formatCurrency(caseClaim)}</td>
                      <td className="px-3 py-3">
                        {plan ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STATUS_COLOR[plan.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {PLAN_STATUS_LABEL[plan.status] ?? plan.status}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" aria-hidden="true" /> 미작성
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {plan?.general_repayment_rate_pct != null ? (
                          <span className={`font-medium ${plan.general_repayment_rate_pct >= 100 ? 'text-green-600' : plan.general_repayment_rate_pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                            {Number(plan.general_repayment_rate_pct).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {casePackets.length > 0 ? (
                          <span className="text-xs text-slate-600">
                            {packetCompleted}/{casePackets.length} 완료
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">없음</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/cases/${c.id}/bankruptcy` as never}
                          aria-label={`${c.title} 도산 모듈 이동`}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          모듈 →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
