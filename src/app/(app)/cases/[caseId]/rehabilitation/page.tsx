import { requireCaseAccess } from '@/lib/case-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRehabModuleData } from '@/lib/queries/rehabilitation';
import { RehabModuleClient } from './rehab-module-client';

interface Props {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ creditorPage?: string }>;
}

export default async function RehabilitationPage({ params, searchParams }: Props) {
  const { caseId } = await params;
  const sp = await searchParams;
  const creditorPage = Math.max(1, parseInt(sp.creditorPage || '1', 10) || 1);

  const { caseRow } = await requireCaseAccess<{
    id: string;
    title: string;
    case_type: string | null;
    insolvency_subtype: string | null;
    organization_id: string;
    lifecycle_status?: string | null;
  }>(caseId, {
    select: 'id, title, case_type, insolvency_subtype, organization_id, lifecycle_status',
    insolvencySubtypePrefix: 'rehabilitation',
  });

  const supabase = await createSupabaseServerClient();

  // 의뢰인 정보 (신청인 탭에 프리필용)
  // case_clients는 profile_id로 profiles와 연결된다.
  // 주민번호/상세주소 등 암호화 필드는 client_private_profiles에 있으나
  // 서버 컴포넌트에서 직접 복호화는 하지 않고, 폼 기본값은 빈 문자열로 둔다.
  const { data: caseClients } = await supabase
    .from('case_clients')
    .select('profile_id, client_name, profiles(id, full_name, phone_e164, email)')
    .eq('case_id', caseId)
    .limit(5);

  const firstCaseClient = (caseClients?.[0] ?? null) as
    | { client_name: string | null; profiles: { full_name?: string | null; phone_e164?: string | null; email?: string | null } | null }
    | null;
  const linkedProfile = firstCaseClient?.profiles ?? null;
  const primaryClient: Record<string, unknown> | null = linkedProfile
    ? {
        full_name: linkedProfile.full_name ?? firstCaseClient?.client_name ?? '',
        phone: linkedProfile.phone_e164 ?? '',
        email: linkedProfile.email ?? '',
      }
    : firstCaseClient?.client_name
      ? { full_name: firstCaseClient.client_name }
      : null;

  // 개인회생 모듈 전체 데이터 병렬 조회
  const moduleData = await getRehabModuleData(caseId, creditorPage);

  return (
    <RehabModuleClient
      caseId={caseId}
      organizationId={caseRow.organization_id}
      caseTitle={caseRow.title}
      primaryClient={primaryClient}
      application={moduleData.application}
      creditorSettings={moduleData.creditorSettings}
      creditors={moduleData.creditors}
      creditorsPagination={moduleData.creditorsPagination}
      creditorsSummary={moduleData.creditorsSummary}
      securedProperties={moduleData.securedProperties}
      properties={moduleData.properties}
      propertyDeductions={moduleData.propertyDeductions}
      familyMembers={moduleData.familyMembers}
      incomeSettings={moduleData.incomeSettings}
      affidavit={moduleData.affidavit}
      planSections={moduleData.planSections}
    />
  );
}
