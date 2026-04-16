import type { Route } from 'next';
import Link from 'next/link';
import { requireCaseAccess } from '@/lib/case-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/lib/routes/registry';

export const dynamic = 'force-dynamic';

async function getCaseCoverData(caseId: string) {
  const { caseRow } = await requireCaseAccess<{
    id: string;
    title: string | null;
    case_number: string | null;
    court_name: string | null;
    opened_on: string | null;
    summary: string | null;
    court_division: string | null;
    presiding_judge: string | null;
    assigned_judge: string | null;
    court_room: string | null;
    appeal_court_name: string | null;
    appeal_division: string | null;
    appeal_case_number: string | null;
    appeal_presiding_judge: string | null;
    appeal_assigned_judge: string | null;
    appeal_court_room: string | null;
    supreme_case_number: string | null;
    supreme_division: string | null;
    supreme_presiding_judge: string | null;
    supreme_assigned_judge: string | null;
    opponent_counsel_name: string | null;
    opponent_counsel_phone: string | null;
    opponent_counsel_fax: string | null;
    client_contact_address: string | null;
    client_contact_phone: string | null;
    client_contact_fax: string | null;
    deadline_filing: string | null;
    deadline_appeal: string | null;
    deadline_final_appeal: string | null;
    cover_notes: string | null;
    organization_id: string;
    lifecycle_status?: string | null;
  }>(caseId, {
    select: `
      id, title, case_number, court_name, opened_on, summary,
      court_division, presiding_judge, assigned_judge, court_room,
      appeal_court_name, appeal_division, appeal_case_number,
      appeal_presiding_judge, appeal_assigned_judge, appeal_court_room,
      supreme_case_number, supreme_division, supreme_presiding_judge, supreme_assigned_judge,
      opponent_counsel_name, opponent_counsel_phone, opponent_counsel_fax,
      client_contact_address, client_contact_phone, client_contact_fax,
      deadline_filing, deadline_appeal, deadline_final_appeal, cover_notes,
      organization_id, lifecycle_status
    `,
  });
  const c = caseRow;
  const supabase = await createSupabaseServerClient();

  const { data: clients } = await supabase
    .from('case_clients')
    .select('client_name, relation_label')
    .eq('case_id', caseId)
    .limit(3);

  const { data: parties } = await supabase
    .from('case_parties')
    .select('display_name, party_role, phone')
    .eq('case_id', caseId)
    .limit(5);

  const { data: schedules } = await supabase
    .from('case_schedules')
    .select('title, schedule_kind, scheduled_start, location, notes')
    .eq('case_id', caseId)
    .order('scheduled_start', { ascending: true })
    .limit(30);

  return { c, clients: clients ?? [], parties: parties ?? [], schedules: schedules ?? [] };
}

function Cell({ label, value, w = 'auto' }: { label?: string; value?: string | null; w?: string }) {
  return (
    <td className={`border border-gray-700 px-1 py-0.5 text-[11px] align-top ${w}`}>
      {label && <span className="text-[9px] text-gray-500">{label} </span>}
      {value ?? ''}
    </td>
  );
}

export default async function CaseCoverPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const { c, clients, parties, schedules } = await getCaseCoverData(caseId);

  const plaintiff = clients[0]?.client_name ?? parties.find(p => ['plaintiff', 'petitioner', 'creditor'].includes(p.party_role))?.display_name ?? '';
  const defendant = parties.find(p => ['defendant', 'respondent', 'debtor'].includes(p.party_role))?.display_name ?? '';

  // 기일 목록 (최대 28칸, 2열)
  const scheduleRows = Array.from({ length: 14 }, (_, i) => ({
    left: schedules[i * 2] ?? null,
    right: schedules[i * 2 + 1] ?? null,
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* 인쇄 버튼 - 화면에서만 보임 */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          🖨 인쇄
        </button>
        <Link href={`${ROUTES.CASES}/${caseId}` as Route} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          ← 돌아가기
        </Link>
      </div>

      {/* A4 표지 */}
      <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-6 print:p-4 font-serif text-[12px]">

        {/* 헤더 */}
        <div className="flex justify-between border-b-2 border-gray-800 pb-2 mb-3">
          <div className="text-left">
            <div className="text-[15px] font-bold">민 사 소 송 기 록</div>
          </div>
          <div className="text-right text-[10px] text-gray-600 space-y-0.5">
            <div>수 임 :</div>
            <div>종 결 :</div>
          </div>
        </div>

        {/* 사건명 */}
        <table className="w-full border-collapse mb-1">
          <tbody>
            <tr>
              <td className="border border-gray-700 px-2 py-1 w-[60px] text-center text-[11px] font-medium" rowSpan={2}>사건명</td>
              <td className="border border-gray-700 px-2 py-1 text-[12px] font-semibold" colSpan={6}>{c.title}</td>
            </tr>
          </tbody>
        </table>

        {/* 심급 정보 */}
        <table className="w-full border-collapse mb-1 text-[10px]">
          <tbody>
            <tr>
              <td className="border border-gray-700 px-1 py-0.5 w-[50px] text-center font-medium" rowSpan={3}>제<br/>1<br/>심</td>
              <td className="border border-gray-700 px-1 py-0.5 w-[80px]">법원: {c.court_name ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5 w-[60px]">부단독: {c.court_division ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5 w-[50px] text-center font-medium" rowSpan={3}>항<br/>소<br/>심</td>
              <td className="border border-gray-700 px-1 py-0.5">법원: {c.appeal_court_name ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">제 {c.appeal_division ?? ''} 부</td>
              <td className="border border-gray-700 px-1 py-0.5 w-[50px] text-center font-medium" rowSpan={3}>상<br/>고</td>
              <td className="border border-gray-700 px-1 py-0.5">대법원 제 {c.supreme_division ?? ''} 부</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-1 py-0.5">사건번호: {c.case_number ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">호</td>
              <td className="border border-gray-700 px-1 py-0.5">사건번호: {c.appeal_case_number ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">호</td>
              <td className="border border-gray-700 px-1 py-0.5">사건번호: {c.supreme_case_number ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-1 py-0.5">재판장: {c.presiding_judge ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">주심: {c.assigned_judge ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">재판장: {c.appeal_presiding_judge ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">주심: {c.appeal_assigned_judge ?? ''}</td>
              <td className="border border-gray-700 px-1 py-0.5">주심: {c.supreme_assigned_judge ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-1 py-0.5" colSpan={1}></td>
              <td className="border border-gray-700 px-1 py-0.5">({c.court_room ?? '     '} 호실)</td>
              <td className="border border-gray-700 px-1 py-0.5">법정</td>
              <td className="border border-gray-700 px-1 py-0.5" colSpan={1}></td>
              <td className="border border-gray-700 px-1 py-0.5">({c.appeal_court_room ?? '     '} 호실)</td>
              <td className="border border-gray-700 px-1 py-0.5">법정</td>
              <td className="border border-gray-700 px-1 py-0.5" colSpan={1}></td>
              <td className="border border-gray-700 px-1 py-0.5"></td>
            </tr>
          </tbody>
        </table>

        {/* 당사자 */}
        <table className="w-full border-collapse mb-1 text-[10px]">
          <tbody>
            <tr>
              <td className="border border-gray-700 px-1 py-1 w-[50px] text-center font-medium" rowSpan={3}>의<br/>뢰<br/>인</td>
              <td className="border border-gray-700 px-2 py-1 w-[120px]">{plaintiff}</td>
              <td className="border border-gray-700 px-1 py-0.5 w-[30px] text-center">고</td>
              <td className="border border-gray-700 px-1 py-0.5 w-[30px] text-[9px]">통지처</td>
              <td className="border border-gray-700 px-1 py-0.5">{c.client_contact_address ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-2 py-0.5" colSpan={2}></td>
              <td className="border border-gray-700 px-1 py-0.5 text-[9px]">전화</td>
              <td className="border border-gray-700 px-1 py-0.5">{c.client_contact_phone ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-2 py-0.5" colSpan={2}></td>
              <td className="border border-gray-700 px-1 py-0.5 text-[9px]">팩스</td>
              <td className="border border-gray-700 px-1 py-0.5">{c.client_contact_fax ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-1 py-1 w-[50px] text-center font-medium" rowSpan={3}>상<br/>대<br/>방</td>
              <td className="border border-gray-700 px-2 py-1">{defendant}</td>
              <td className="border border-gray-700 px-1 py-0.5 text-center">고</td>
              <td className="border border-gray-700 px-1 py-0.5 text-[9px]">대리인</td>
              <td className="border border-gray-700 px-1 py-0.5">{c.opponent_counsel_name ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-2 py-0.5" colSpan={2}></td>
              <td className="border border-gray-700 px-1 py-0.5 text-[9px]">전화</td>
              <td className="border border-gray-700 px-1 py-0.5">{c.opponent_counsel_phone ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-2 py-0.5" colSpan={2}></td>
              <td className="border border-gray-700 px-1 py-0.5 text-[9px]">팩스</td>
              <td className="border border-gray-700 px-1 py-0.5">{c.opponent_counsel_fax ?? ''}</td>
            </tr>
          </tbody>
        </table>

        {/* 기일 표 */}
        <table className="w-full border-collapse mb-1 text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-700 px-1 py-0.5 w-[12px]"></th>
              <th className="border border-gray-700 px-1 py-0.5">월 일</th>
              <th className="border border-gray-700 px-1 py-0.5">시간</th>
              <th className="border border-gray-700 px-1 py-0.5">적 요</th>
              <th className="border border-gray-700 px-1 py-0.5 w-[20px]">요</th>
              <th className="border border-gray-700 px-1 py-0.5">월 일</th>
              <th className="border border-gray-700 px-1 py-0.5">시간</th>
              <th className="border border-gray-700 px-1 py-0.5">적 요</th>
              <th className="border border-gray-700 px-1 py-0.5 w-[20px]">요</th>
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((row, i) => {
              const left = row.left;
              const right = row.right;
              const leftDate = left?.scheduled_start ? new Date(left.scheduled_start) : null;
              const rightDate = right?.scheduled_start ? new Date(right.scheduled_start) : null;
              const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
              return (
                <tr key={i} className="h-[18px]">
                  <td className="border border-gray-700 px-0.5 text-[8px] text-gray-400 text-center">{i < 7 ? '기' : '일'}</td>
                  <td className="border border-gray-700 px-1">
                    {leftDate ? `${leftDate.getMonth() + 1}/${leftDate.getDate()}` : ''}
                  </td>
                  <td className="border border-gray-700 px-1">
                    {leftDate ? `${String(leftDate.getHours()).padStart(2, '0')}:${String(leftDate.getMinutes()).padStart(2, '0')}` : ''}
                  </td>
                  <td className="border border-gray-700 px-1">{left?.title ?? ''}</td>
                  <td className="border border-gray-700 px-1 text-center">
                    {leftDate ? dayNames[leftDate.getDay()] : ''}
                  </td>
                  <td className="border border-gray-700 px-1">
                    {rightDate ? `${rightDate.getMonth() + 1}/${rightDate.getDate()}` : ''}
                  </td>
                  <td className="border border-gray-700 px-1">
                    {rightDate ? `${String(rightDate.getHours()).padStart(2, '0')}:${String(rightDate.getMinutes()).padStart(2, '0')}` : ''}
                  </td>
                  <td className="border border-gray-700 px-1">{right?.title ?? ''}</td>
                  <td className="border border-gray-700 px-1 text-center">
                    {rightDate ? dayNames[rightDate.getDay()] : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 불변기일 */}
        <table className="w-full border-collapse mb-1 text-[10px]">
          <tbody>
            <tr>
              <td className="border border-gray-700 px-1 py-0.5 w-[60px] font-medium text-center">불변기일</td>
              <td className="border border-gray-700 px-1 py-0.5">제소기한: {c.deadline_filing ? formatDate(c.deadline_filing) : '.'}</td>
              <td className="border border-gray-700 px-1 py-0.5">항소: {c.deadline_appeal ? formatDate(c.deadline_appeal) : '.'}</td>
              <td className="border border-gray-700 px-1 py-0.5">상고: {c.deadline_final_appeal ? formatDate(c.deadline_final_appeal) : '.'}</td>
            </tr>
          </tbody>
        </table>

        {/* 비고 */}
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="border border-gray-700 px-1 py-1 w-[30px] text-center font-medium" rowSpan={2}>비<br/>고</td>
              <td className="border border-gray-700 px-2 py-0.5 h-[40px] align-top">특기사항: {c.cover_notes ?? ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-2 py-0.5 h-[20px]"></td>
            </tr>
          </tbody>
        </table>

      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
