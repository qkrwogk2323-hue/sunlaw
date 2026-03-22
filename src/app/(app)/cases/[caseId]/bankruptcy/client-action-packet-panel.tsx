'use client';

import { useState, useCallback } from 'react';
import { ClipboardList, Plus, CheckCircle, Clock, User, Building2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { createClientActionPacket, checkClientActionItem } from '@/lib/actions/insolvency-actions';
import type { CorrectionNoticeSummaryRaw } from '@/lib/insolvency-types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionItem = {
  id: string;
  title: string;
  description: string | null;
  responsibility: 'client_self' | 'client_visit' | 'office_prepare';
  display_order: number;
  client_checked_at: string | null;
  staff_verified_at: string | null;
  is_completed: boolean;
  ai_extracted: boolean;
  client_note: string | null;
};

type ActionPacket = {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  completed_count: number;
  total_count: number;
  created_at: string;
  items: ActionItem[];
};

interface Props {
  caseId: string;
  organizationId: string;
  packets: ActionPacket[];
  correctionItemsFromAI: Array<{
    title: string;
    description: string | null;
    responsibility: 'client_self' | 'client_visit' | 'office_prepare';
    requestPurpose?: string | null;
    sourcePageReference?: string | null;
  }>;
  correctionNoticeSummaryFromAI: CorrectionNoticeSummaryRaw | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RESP_LABEL: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  client_self: { label: '본인처리', color: 'bg-blue-100 text-blue-700', Icon: User },
  client_visit: { label: '직접방문', color: 'bg-amber-100 text-amber-700', Icon: MapPin },
  office_prepare: { label: '사무소준비', color: 'bg-slate-100 text-slate-600', Icon: Building2 }
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소'
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600'
};

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs text-slate-500">{completed}/{total}</span>
    </div>
  );
}

// ─── New Packet Form ──────────────────────────────────────────────────────────

function NewPacketForm({
  caseId,
  organizationId,
  correctionItemsFromAI,
  correctionNoticeSummaryFromAI,
  onCreated
}: {
  caseId: string;
  organizationId: string;
  correctionItemsFromAI: Props['correctionItemsFromAI'];
  correctionNoticeSummaryFromAI: Props['correctionNoticeSummaryFromAI'];
  onCreated: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(correctionNoticeSummaryFromAI?.correctionDeadline ?? '');
  const [useAI, setUseAI] = useState(correctionItemsFromAI.length > 0);
  const [customItems, setCustomItems] = useState([
    { title: '', responsibility: 'client_self' as const, description: '' }
  ]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toastError('입력 오류', { message: '패킷 제목을 입력해주세요.' });
      return;
    }

    const items = useAI
      ? correctionItemsFromAI.map((item, idx) => ({ ...item, displayOrder: idx + 1, aiExtracted: true }))
      : customItems
          .filter((i) => i.title.trim())
          .map((item, idx) => ({
            title: item.title,
            description: item.description || null,
            responsibility: item.responsibility,
            displayOrder: idx + 1,
            aiExtracted: false
          }));

    setSaving(true);
    const result = await createClientActionPacket({
      organizationId,
      caseId,
      title,
      dueDate: dueDate || undefined,
      items
    });
    setSaving(false);

    if (!result.ok) {
      toastError('생성 실패', { message: result.userMessage });
    } else {
      success('패킷 생성 완료', { message: `${items.length}개 항목이 등록됐습니다.` });
      setOpen(false);
      setTitle('');
      setDueDate(correctionNoticeSummaryFromAI?.correctionDeadline ?? '');
      onCreated();
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        aria-label="새 액션패킷 생성"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        새 패킷 만들기
      </Button>
    );
  }

  return (
    <div className="rounded-xl bg-blue-50 p-5 ring-1 ring-blue-200">
      <h3 className="mb-4 text-sm font-semibold text-blue-800">새 액션패킷 생성</h3>
      <p className="mb-4 text-xs text-slate-500">
        <span className="text-red-500">*</span> 필수 입력 항목입니다
      </p>

      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="packet-title" className="text-xs font-medium text-slate-600">
            패킷 제목 <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="packet-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2024-03 보정권고서 체크리스트"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="packet-due" className="text-xs font-medium text-slate-600">마감일</label>
          <input
            id="packet-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {correctionItemsFromAI.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              id="use-ai-items"
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="use-ai-items" className="text-sm text-slate-700">
              AI 추출 항목 사용 ({correctionItemsFromAI.length}개)
            </label>
          </div>
        )}

        {!useAI && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">항목 입력</p>
            {customItems.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const updated = [...customItems];
                    updated[idx] = { ...updated[idx], title: e.target.value };
                    setCustomItems(updated);
                  }}
                  placeholder={`항목 ${idx + 1}`}
                  aria-label={`항목 ${idx + 1} 제목`}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={item.responsibility}
                  onChange={(e) => {
                    const updated = [...customItems];
                    updated[idx] = { ...updated[idx], responsibility: e.target.value as typeof item.responsibility };
                    setCustomItems(updated);
                  }}
                  aria-label={`항목 ${idx + 1} 담당`}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="client_self">본인처리</option>
                  <option value="client_visit">직접방문</option>
                  <option value="office_prepare">사무소준비</option>
                </select>
              </div>
            ))}
            {customItems.length < 10 && (
              <button
                onClick={() => setCustomItems([...customItems, { title: '', responsibility: 'client_self', description: '' }])}
                className="text-xs text-blue-600 hover:underline"
              >
                + 항목 추가
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            aria-label="패킷 저장"
          >
            {saving ? '저장 중...' : '패킷 저장'}
          </Button>
          <Button
            onClick={() => setOpen(false)}
            aria-label="취소"
            className="bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Packet Card ──────────────────────────────────────────────────────────────

function PacketCard({
  packet,
  caseId,
  organizationId
}: {
  packet: ActionPacket;
  caseId: string;
  organizationId: string;
}) {
  const { success, error: toastError } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ActionItem[]>(packet.items);
  const [checking, setChecking] = useState<string | null>(null);

  const handleCheck = useCallback(async (itemId: string) => {
    setChecking(itemId);
    const result = await checkClientActionItem(itemId, caseId, organizationId);
    setChecking(null);

    if (!result.ok) {
      toastError('처리 실패', { message: result.userMessage });
    } else {
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, is_completed: true, client_checked_at: new Date().toISOString() } : i));
      success('항목 완료', { message: '확인 타임스탬프가 기록됐습니다.' });
    }
  }, [caseId, organizationId, success, toastError]);

  const completedCount = items.filter((i) => i.is_completed).length;

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900 truncate">{packet.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[packet.status]}`}>
                {STATUS_LABEL[packet.status]}
              </span>
            </div>
            {packet.due_date && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" aria-hidden="true" />
                마감: {packet.due_date}
              </p>
            )}
            <div className="mt-2">
              <ProgressBar completed={completedCount} total={items.length} />
            </div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? '항목 접기' : '항목 펼치기'}
            className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">항목이 없습니다</p>
          ) : (
            <ol className="mt-3 space-y-2" aria-label="체크리스트 항목">
              {items
                .sort((a, b) => a.display_order - b.display_order)
                .map((item, idx) => {
                  const resp = RESP_LABEL[item.responsibility];
                  return (
                    <li
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        item.is_completed ? 'bg-green-50' : 'bg-slate-50'
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0 text-xs font-medium text-slate-400 w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {item.title}
                          {item.ai_extracted && (
                            <span className="ml-1.5 text-xs text-blue-500">AI</span>
                          )}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                        )}
                        {item.client_checked_at && (
                          <p className="mt-1 text-xs text-green-600">
                            ✓ {new Date(item.client_checked_at).toLocaleString('ko-KR')} 확인
                          </p>
                        )}
                        <span className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${resp.color}`}>
                          <resp.Icon className="h-3 w-3" aria-hidden="true" />
                          {resp.label}
                        </span>
                      </div>
                      {!item.is_completed && (
                        <button
                          onClick={() => handleCheck(item.id)}
                          disabled={checking === item.id}
                          aria-label={`${item.title} 완료 처리`}
                          className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {checking === item.id ? '...' : '완료'}
                        </button>
                      )}
                      {item.is_completed && (
                        <CheckCircle className="flex-shrink-0 h-4 w-4 text-green-500" aria-label="완료" />
                      )}
                    </li>
                  );
                })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientActionPacketPanel({
  caseId,
  organizationId,
  packets: initialPackets,
  correctionItemsFromAI,
  correctionNoticeSummaryFromAI
}: Props) {
  const [packets, setPackets] = useState<ActionPacket[]>(initialPackets);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">📋 의뢰인 액션패킷 (M08)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            보정권고서 기반 체크리스트 — 의뢰인 확인 시 타임스탬프 자동 기록
          </p>
        </div>
      </div>

      <NewPacketForm
        key={refreshKey}
        caseId={caseId}
        organizationId={organizationId}
        correctionItemsFromAI={correctionItemsFromAI}
        correctionNoticeSummaryFromAI={correctionNoticeSummaryFromAI}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />

      {correctionNoticeSummaryFromAI ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-slate-900">보정도우미 요약</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-700">
            <span>송달일: {correctionNoticeSummaryFromAI.servedAt ?? '-'}</span>
            <span>보정기한: {correctionNoticeSummaryFromAI.correctionDeadline ?? '-'}</span>
          </div>
          {correctionNoticeSummaryFromAI.courtRequestSummary ? (
            <p className="mt-2 text-sm text-slate-700">법원 요청 의미: {correctionNoticeSummaryFromAI.courtRequestSummary}</p>
          ) : null}
        </div>
      ) : null}

      {packets.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
          <p className="font-medium">아직 액션패킷이 없습니다</p>
          <p className="mt-1 text-sm">보정권고서를 업로드하거나 직접 체크리스트를 만드세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packets.map((p) => (
            <PacketCard
              key={p.id}
              packet={p}
              caseId={caseId}
              organizationId={organizationId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
