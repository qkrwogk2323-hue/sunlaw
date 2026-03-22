/**
 * [PAGE TEMPLATE] — 새 page를 만들 때 이 파일을 복사해서 시작하세요.
 * 사용법: cp src/templates/page.template.tsx src/app/(app)/your-route/page.tsx
 *
 * RULE META (필수 — CI check:rule-meta가 검사합니다)
 * @rule-meta-start
 * surfaceScope: tenant
 * orgTypes: law_firm,credit_company,general_business,others
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: none
 * historyPath:
 * currentStatePath:
 * allowsAi: false
 * aiFeatures:
 * @rule-meta-end
 */

import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
// import { requireOrganizationActionAccess } from '@/lib/auth'; // 권한 체크 필요 시

export default async function YourPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);

  // 데이터 조회 — 이 페이지의 도메인 데이터만 blocking 조회 (Rule 5-20)
  // const items = await getYourItems(organizationId);

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 — 항상 필수 */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">페이지 제목</h1>
        <p className="mt-1 text-sm text-slate-500">페이지 설명</p>
      </div>

      {/* 감사로그/이력 진입 경로 (requiresTraceability: true 시 필수) */}
      {/* <Link href="/admin/audit?entity=..." className="text-xs text-slate-400 hover:underline">기록 보기</Link> */}

      {/* 빈 상태 — 항상 필수 */}
      {/* {items.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <p className="font-medium">아직 항목이 없습니다</p>
          <p className="mt-1 text-sm">다음 행동을 안내합니다.</p>
        </div>
      )} */}

      {/* 콘텐츠 */}
    </div>
  );
}
