import { quickLinkExistingClientAction } from '@/lib/actions/case-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ExistingClientLinkForm({
  caseId,
  clients
}: {
  caseId: string;
  clients: Array<{ id: string; client_name: string; client_email_snapshot: string | null; cases?: { title?: string | null } | Array<{ title?: string | null }> | null }>;
}) {
  const action = quickLinkExistingClientAction.bind(null, caseId);

  if (!clients.length) {
    return <p className="text-sm text-slate-500">다른 사건 또는 미연결 상태로 저장된 의뢰인이 아직 없습니다.</p>;
  }

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div>
        <p className="text-sm font-medium text-slate-900">저장된 의뢰인 바로 연결</p>
        <p className="mt-1 text-xs text-slate-500">기존 의뢰인을 선택하면 이메일을 다시 입력하지 않고 현재 사건에 복사 연결합니다.</p>
      </div>
      <select name="existingClientId" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" required>
        <option value="">의뢰인 선택</option>
        {clients.map((client) => {
          const linkedCaseTitle = Array.isArray(client.cases) ? client.cases[0]?.title : client.cases?.title;
          return (
            <option key={client.id} value={client.id}>
              {client.client_name} · {client.client_email_snapshot ?? '-'}{linkedCaseTitle ? ` · ${linkedCaseTitle}` : ''}
            </option>
          );
        })}
      </select>
      <SubmitButton pendingLabel="연결 중..." variant="secondary">기존 의뢰인 연결</SubmitButton>
    </form>
  );
}
