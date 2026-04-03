import { notFound } from 'next/navigation';
import { requireAuthenticatedUser, findMembership } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRehabModuleData } from '@/lib/queries/rehabilitation';
import { RehabModuleClient } from './rehab-module-client';

interface Props {
  params: Promise<{ caseId: string }>;
}

export default async function RehabilitationPage({ params }: Props) {
  const { caseId } = await params;
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  // 사건 기본 정보
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, case_type, insolvency_subtype, organization_id')
    .eq('id', caseId)
    .single();

  if (!caseRow) notFound();

  // 조직 멤버 확인
  const membership = findMembership(auth, caseRow.organization_id);
  if (!membership) notFound();

  // 의뢰인 정보 (신청인 탭에 프리필용)
  const { data: caseClients } = await supabase
    .from('case_clients')
    .select('client_id, clients(id, full_name, phone, email, address, resident_number_front, resident_number_back)')
    .eq('case_id', caseId)
    .limit(5);

  const primaryClient = caseClients?.[0]?.clients ?? null;

  // 개인회생 모듈 전체 데이터 병렬 조회
  const moduleData = await getRehabModuleData(caseId);

  return (
    <RehabModuleClient
      caseId={caseId}
      organizationId={caseRow.organization_id}
      caseTitle={caseRow.title}
      primaryClient={primaryClient as Record<string, unknown> | null}
      application={moduleData.application}
      creditorSettings={moduleData.creditorSettings}
      creditors={moduleData.creditors}
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
