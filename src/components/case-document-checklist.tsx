'use client';

import { useState } from 'react';
import { FileCheck2, Sparkles, ChevronDown } from 'lucide-react';
import { buildDocumentChecklist, calcCompletionRate } from '@/lib/ai/document-checklist';
import type { ChecklistItem } from '@/lib/ai/document-checklist';
import { Badge } from '@/components/ui/badge';

type Props = {
  caseType: string;
  caseTitle?: string;
};

const CATEGORY_LABELS: Record<ChecklistItem['category'], string> = {
  identity: '신원 서류',
  case_specific: '사건 관련',
  financial: '금융/비용',
  court: '법원/소송',
  other: '기타',
};

export function CaseDocumentChecklist({ caseType, caseTitle }: Props) {
  const checklist = buildDocumentChecklist(caseType, caseTitle);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'client' | 'staff'>('client');
  const [collapsed, setCollapsed] = useState(false);

  const completion = calcCompletionRate(checklist, completedIds);
  const items = activeTab === 'client' ? checklist.clientItems : checklist.staffItems;

  const toggle = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (checklist.items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-600">
            <Sparkles className="size-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-600">AI 서류 체크리스트</p>
            <p className="text-sm font-semibold text-slate-900">
              {checklist.caseTypeLabel} 사건 준비 서류
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 진행률 */}
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${completion.pct}%` }}
                role="progressbar"
                aria-valuenow={completion.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`서류 준비 ${completion.pct}%`}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">
              {completion.completed}/{completion.total}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            aria-expanded={!collapsed}
            aria-label={collapsed ? '서류 체크리스트 펼치기' : '서류 체크리스트 접기'}
          >
            <ChevronDown className={`size-4 transition ${collapsed ? '' : 'rotate-180'}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-violet-100 p-4">
          {/* Tab */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('client')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${activeTab === 'client' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              aria-pressed={activeTab === 'client'}
            >
              <FileCheck2 className="mr-1 inline size-3" aria-hidden="true" />
              의뢰인 준비 서류 ({checklist.clientItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${activeTab === 'staff' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              aria-pressed={activeTab === 'staff'}
            >
              직원 처리 항목 ({checklist.staffItems.length})
            </button>
          </div>

          {/* Items */}
          <div className="space-y-2" role="list" aria-label="서류 체크리스트">
            {items.map((item) => (
              <div
                key={item.id}
                role="listitem"
                className={`flex items-start gap-3 rounded-xl p-3 transition ${completedIds.has(item.id) ? 'bg-emerald-50' : 'bg-white'} border ${completedIds.has(item.id) ? 'border-emerald-200' : 'border-slate-200'}`}
              >
                <input
                  type="checkbox"
                  id={`checklist-${item.id}`}
                  checked={completedIds.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 size-4 rounded border-slate-300 accent-violet-600"
                  aria-label={item.label}
                />
                <label htmlFor={`checklist-${item.id}`} className="flex-1 cursor-pointer">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${completedIds.has(item.id) ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {item.label}
                      {item.required && !completedIds.has(item.id) && (
                        <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                      )}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    {!item.required && (
                      <Badge tone="slate">선택</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                  )}
                </label>
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">이 탭에 해당하는 항목이 없습니다.</p>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            <span className="text-red-500">*</span> 필수 항목 · 체크 여부는 이 화면에서만 임시 저장됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
