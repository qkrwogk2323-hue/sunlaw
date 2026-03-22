import type { Route } from 'next';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { getCaseHubList } from '@/lib/queries/case-hubs';
import { CaseHubListClient } from '@/components/case-hub-list-client';
import { HubContextStrip } from '@/components/hub-context-strip';
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
      <HubContextStrip hubs={hubs.slice(0, 4)} currentLabel="사건허브" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">사건허브 로비</h1>
          <p className="mt-1 text-sm text-slate-500">사건허브를 기준축으로 협업 좌석·열람 범위·미읽음·최근 활동을 한 화면에서 추적합니다.</p>
        </div>
        <Link
          href={'/cases' as Route}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
          aria-label="사건목록에서 허브 연동하기"
        >
          <Network className="size-4" aria-hidden="true" />
          사건에서 허브 연동하기
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
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
