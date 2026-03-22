import type { Route } from 'next';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { getCaseHubList } from '@/lib/queries/case-hubs';
import { CaseHubListClient } from '@/components/case-hub-list-client';
import { PremiumPageHeader } from '@/components/premium-page-header';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';

export const metadata = { title: '사건허브' };

export default async function CaseHubsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const query = `${resolved?.q ?? ''}`.trim();

  const hubs = await getCaseHubList(organizationId);

  return (
    <div className="space-y-8">
      <PremiumPageHeader
        eyebrow="사건 협업"
        title="사건허브 로비"
        description="사건허브를 사건 관련 메뉴의 기준축으로 두고, 협업 좌석·열람 범위·미읽음·최근 활동을 한 화면에서 추적합니다."
        metrics={[
          { label: '전체 허브', value: hubs.length, helper: '현재 조직이 운영 중인 허브' },
          { label: '협업 중', value: hubs.filter((hub) => hub.status === 'active').length, helper: '즉시 입장 가능한 활성 로비' },
          { label: '설정 필요', value: hubs.filter((hub) => hub.status === 'setup_required' || hub.status === 'draft').length, helper: '참여자/범위 보완이 필요한 허브' }
        ]}
        actions={(
          <Link
            href={'/cases' as Route}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
            aria-label="사건목록에서 허브 연동하기"
          >
            <Network className="size-4" aria-hidden="true" />
            사건에서 허브 연동하기
          </Link>
        )}
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={'/admin/audit?tab=general&table=case_hubs' as Route} className="font-medium text-sky-700 underline underline-offset-4">
          허브 생성·상태 변경 기록 보기
        </Link>
        <Link href={'/admin/audit?tab=general&table=case_hub_organizations' as Route} className="font-medium text-sky-700 underline underline-offset-4">
          허브 참여 조직 기록 보기
        </Link>
      </div>

      <UnifiedListSearch
        action="/case-hubs"
        defaultValue={query}
        placeholder="사건명, 의뢰인, 참조번호 검색"
        ariaLabel="사건허브 목록 검색"
      />

      <CaseHubListClient hubs={hubs} query={query} />
    </div>
  );
}
