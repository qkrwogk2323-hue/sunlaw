'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { addOrganizationBillingEntryAction, deleteBillingEntryAction, updateBillingEntryAction } from '@/lib/actions/case-actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/format';

type PartyOption = { id: string; name: string };
type CaseOption = {
  id: string;
  title: string;
  clients: PartyOption[];
  organizations: PartyOption[];
};

type EntryItem = {
  id: string;
  title: string;
  entry_kind: string;
  amount: number;
  tax_amount?: number | null;
  totalAmount: number;
  status: string;
  dueStatus: string;
  due_on?: string | null;
  notes?: string | null;
  case_id?: string | null;
  bill_to_case_client_id?: string | null;
  bill_to_case_organization_id?: string | null;
  targetLabel: string;
  hub?: { id: string; title: string } | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type EntryTypeOption = { value: string; label: string };

function relatedTitle(value?: { title?: string | null } | Array<{ title?: string | null }> | null) {
  if (Array.isArray(value)) return value[0]?.title ?? null;
  return value?.title ?? null;
}

function statusLabel(status: string) {
  if (status === 'draft') return '초안';
  if (status === 'issued') return '발행';
  if (status === 'partial') return '일부 입금';
  if (status === 'paid') return '입금 완료';
  if (status === 'overdue') return '연체';
  if (status === 'cancelled') return '취소';
  return status;
}

function dueLabel(status: string) {
  if (status === 'overdue') return '기한 지남';
  if (status === 'upcoming') return '기한 예정';
  return '기한 없음';
}

function tone(status: string) {
  if (status === 'overdue' || status === 'cancelled') return 'red' as const;
  if (status === 'upcoming' || status === 'partial') return 'amber' as const;
  if (status === 'issued') return 'blue' as const;
  return 'slate' as const;
}

function EntryEditor({
  item,
  caseOptions,
  entryTypeOptions
}: {
  item: EntryItem;
  caseOptions: CaseOption[];
  entryTypeOptions: EntryTypeOption[];
}) {
  const currentCase = caseOptions.find((option) => option.id === item.case_id) ?? caseOptions[0] ?? null;
  const [partyKind, setPartyKind] = useState<'case_client' | 'case_organization'>(item.bill_to_case_client_id ? 'case_client' : 'case_organization');

  const targetOptions = partyKind === 'case_client' ? (currentCase?.clients ?? []) : (currentCase?.organizations ?? []);
  const targetDefaultValue = partyKind === 'case_client'
    ? (item.bill_to_case_client_id ?? '')
    : (item.bill_to_case_organization_id ?? '');

  return (
    <ClientActionForm
      action={updateBillingEntryAction.bind(null, item.id)}
      successTitle="비용 항목을 수정했습니다."
      errorTitle="비용 항목 수정에 실패했습니다."
      errorCause="입력값 또는 청구 대상 정보가 올바르지 않습니다."
      errorResolution="항목명, 금액, 청구 대상을 확인한 뒤 다시 저장해 주세요."
      className="grid gap-3 md:grid-cols-2"
    >
      <select name="entryType" defaultValue={item.entry_kind} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
        {entryTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select
        name="billToPartyKind"
        value={partyKind}
        onChange={(event) => setPartyKind(event.target.value as 'case_client' | 'case_organization')}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
      >
        <option value="case_client">의뢰인</option>
        <option value="case_organization">참여 조직</option>
      </select>
      <select
        key={`${item.id}:${partyKind}:${targetDefaultValue}`}
        name={partyKind === 'case_client' ? 'billToCaseClientId' : 'billToCaseOrganizationId'}
        defaultValue={targetDefaultValue}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 md:col-span-2"
      >
        <option value="">대상 선택</option>
        {targetOptions.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
      {partyKind === 'case_client' ? <input type="hidden" name="billToCaseOrganizationId" value="" /> : <input type="hidden" name="billToCaseClientId" value="" />}
      <Input name="title" defaultValue={item.title} placeholder="항목명" required className="md:col-span-2" />
      <Input name="amount" type="number" min="0" step="0.01" defaultValue={String(item.amount ?? 0)} placeholder="공급가액" required />
      <Input name="taxAmount" type="number" min="0" step="0.01" defaultValue={String(item.tax_amount ?? 0)} placeholder="부가세" />
      <Input name="dueOn" type="date" defaultValue={item.due_on ?? ''} />
      <Textarea name="notes" defaultValue={item.notes ?? ''} placeholder="메모" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="수정 저장 중...">수정 저장</SubmitButton>
      </div>
    </ClientActionForm>
  );
}

export function BillingEntrySectionPanel({
  title,
  createLabel,
  caseOptions,
  items,
  entryTypeOptions,
  forceClientTarget = false
}: {
  title: string;
  createLabel: string;
  caseOptions: CaseOption[];
  items: EntryItem[];
  entryTypeOptions: EntryTypeOption[];
  forceClientTarget?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState(caseOptions[0]?.id ?? '');
  const [partyKind, setPartyKind] = useState<'case_client' | 'case_organization'>(forceClientTarget ? 'case_client' : 'case_client');

  const selectedCase = useMemo(
    () => caseOptions.find((option) => option.id === selectedCaseId) ?? caseOptions[0] ?? null,
    [caseOptions, selectedCaseId]
  );
  const targetOptions = partyKind === 'case_client' ? (selectedCase?.clients ?? []) : (selectedCase?.organizations ?? []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen((current) => !current)}>
          <Plus className="mr-1 size-4" />
          {createOpen ? '닫기' : createLabel}
        </Button>
      </div>

      {createOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <ClientActionForm
            action={addOrganizationBillingEntryAction}
            successTitle={`${title} 항목을 추가했습니다.`}
            errorTitle={`${title} 항목 추가에 실패했습니다.`}
            errorCause="사건 또는 청구 대상 선택이 맞지 않거나 금액 입력이 비어 있습니다."
            errorResolution="사건, 대상, 금액을 확인한 뒤 다시 저장해 주세요."
            onSuccess={() => setCreateOpen(false)}
            className="grid gap-3 md:grid-cols-2"
          >
            <select
              name="caseId"
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {caseOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.title}</option>
              ))}
            </select>
            <select name="entryType" defaultValue={entryTypeOptions[0]?.value} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
              {entryTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              name="billToPartyKind"
              value={partyKind}
              onChange={(event) => setPartyKind(event.target.value as 'case_client' | 'case_organization')}
              disabled={forceClientTarget}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="case_client">의뢰인</option>
              <option value="case_organization">참여 조직</option>
            </select>
            <select
              name={partyKind === 'case_client' ? 'billToCaseClientId' : 'billToCaseOrganizationId'}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">대상 선택</option>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
            {partyKind === 'case_client' ? <input type="hidden" name="billToCaseOrganizationId" value="" /> : <input type="hidden" name="billToCaseClientId" value="" />}
            <Input name="title" placeholder="항목명" required className="md:col-span-2" />
            <Input name="amount" type="number" min="0" step="0.01" placeholder="공급가액" required />
            <Input name="taxAmount" type="number" min="0" step="0.01" placeholder="부가세" defaultValue={0} />
            <Input name="dueOn" type="date" />
            <Textarea name="notes" placeholder="메모" className="md:col-span-2" />
            <div className="md:col-span-2">
              <SubmitButton pendingLabel="추가 중...">추가</SubmitButton>
            </div>
          </ClientActionForm>
        </div>
      ) : null}

      {items.length ? items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{relatedTitle(item.cases) ?? '사건'} · {item.targetLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone(item.status)}>{statusLabel(item.status)}</Badge>
              <Badge tone={tone(item.dueStatus)}>{dueLabel(item.dueStatus)}</Badge>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p>공급가액 {formatCurrency(item.amount)} · 부가세 {formatCurrency(item.tax_amount ?? 0)}</p>
            <p>합계 {formatCurrency(item.totalAmount)} · 기한 {formatDate(item.due_on)}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/cases/${item.case_id}?tab=billing`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>사건에서 보기</Link>
            {item.hub?.id ? (
              <Link href={`/inbox/${item.hub.id}` as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>허브에서 보기</Link>
            ) : null}
            {item.bill_to_case_client_id ? (
              <Link href={'/portal/billing' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>의뢰인 화면 보기</Link>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId((current) => current === item.id ? null : item.id)}>
              <Pencil className="mr-1 size-4" />
              {editingId === item.id ? '수정 닫기' : '수정'}
            </Button>
            <DangerActionButton
              action={deleteBillingEntryAction}
              fields={{ entryId: item.id }}
              confirmTitle="이 비용 항목을 삭제할까요?"
              confirmDescription="삭제하면 비용 목록과 기록에서 제외됩니다."
              highlightedInfo={item.title}
              confirmLabel="삭제"
              buttonVariant="secondary"
              className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="mr-1 size-4" />
              삭제
            </DangerActionButton>
          </div>
          {editingId === item.id ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <EntryEditor item={item} caseOptions={caseOptions} entryTypeOptions={entryTypeOptions} />
            </div>
          ) : null}
        </div>
      )) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          현재 등록된 항목이 없습니다.
        </div>
      )}
    </div>
  );
}
