import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireAuthenticatedUser } from '@/lib/auth';
import { listPlatformSupportTickets } from '@/lib/queries/support';
import { PlatformSupportTicketForm } from '@/components/forms/platform-support-ticket-form';
import { formatDateTime } from '@/lib/format';

const statusTone: Record<string, 'amber' | 'blue' | 'green' | 'slate'> = {
  received: 'amber',
  in_review: 'blue',
  answered: 'green',
  closed: 'slate'
};

const statusLabel: Record<string, string> = {
  received: '접수됨',
  in_review: '검토 중',
  answered: '답변 완료',
  closed: '종료'
};

const categoryLabel: Record<string, string> = {
  question: '문의',
  request: '요청',
  bug: '오류 신고',
  opinion: '의견'
};

export default async function SupportCenterPage() {
  await requireAuthenticatedUser();
  const tickets = await listPlatformSupportTickets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">고객센터</h1>
        <p className="mt-2 text-sm text-slate-600">서비스 운영팀에 요청, 의견, 오류 신고를 남기고 현재 처리 상태를 확인합니다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[1.6rem] border-sky-200 bg-[linear-gradient(180deg,#f8fbff,#eef6ff)]">
          <CardHeader>
            <CardTitle>문의 남기기</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformSupportTicketForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내 문의 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.length ? tickets.map((ticket: any) => (
              <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{ticket.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{categoryLabel[ticket.category] ?? ticket.category} · {ticket.organization_name_snapshot ?? '개인 문의'}</p>
                  </div>
                  <Badge tone={statusTone[ticket.status] ?? 'slate'}>{statusLabel[ticket.status] ?? ticket.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{ticket.body}</p>
                {ticket.handled_note ? (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    <p className="font-medium">운영팀 답변</p>
                    <p className="mt-1 leading-7">{ticket.handled_note}</p>
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-slate-400">접수 {formatDateTime(ticket.created_at)} · 처리자 {ticket.handled_by_name ?? '-'}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">아직 고객센터 문의 내역이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
