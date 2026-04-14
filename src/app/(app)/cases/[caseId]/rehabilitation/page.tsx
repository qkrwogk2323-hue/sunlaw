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
  const { data: caseClients } = await supabase
    .from('case_clients')
    .select('client_id, clients(id, full_name, phone, email, address, resident_number_front, resident_number_back)')
    .eq('case_id', caseId)
    .limit(5);

  const primaryClient = caseClients?.[0]?.clients ?? null;

  // 개인회생 모듈 전체 데이터 병렬 조회
  const moduleData = await getRehabModuleData(caseId, creditorPage);

  return (
    <RehabModuleClient
      caseId={caseId}
      organizationId={caseRow.organization_id}
      caseTitle={caseRow.title}
      primaryClient={primaryClient as Record<string, unknown> | null}
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
