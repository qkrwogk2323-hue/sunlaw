'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabAffidavit } from '@/lib/actions/rehabilitation-actions';
import { Save } from 'lucide-react';

interface RehabAffidavitTabProps {
  caseId: string;
  organizationId: string;
  affidavit: Record<string, unknown> | null;
}

const SECTIONS = [
  { key: 'debt_reason', label: '채무 경위', placeholder: '채무가 발생하게 된 원인과 경위를 상세히 기재해주세요.' },
  { key: 'debt_increase_reason', label: '채무 증가 경위', placeholder: '채무가 어떻게 증가하게 되었는지 기재해주세요.' },
  { key: 'repay_effort', label: '변제 노력', placeholder: '채무를 갚기 위해 어떤 노력을 했는지 기재해주세요.' },
  { key: 'current_situation', label: '현재 상황', placeholder: '현재의 경제적 상황을 기재해주세요.' },
  { key: 'future_plan', label: '향후 계획', placeholder: '앞으로의 경제활동 및 변제 계획을 기재해주세요.' },
  { key: 'reflection', label: '반성 및 다짐', placeholder: '채무에 대한 반성과 앞으로의 다짐을 기재해주세요.' },
] as const;

export function RehabAffidavitTab({
  caseId,
  organizationId,
  affidavit,
}: RehabAffidavitTabProps) {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(
      SECTIONS.map((s) => [s.key, (affidavit?.[s.key] as string) || '']),
    ),
  );

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await upsertRehabAffidavit(caseId, organizationId, form);
      if (!result.ok) {
        error('저장 실패', { message: result.userMessage || '진술서 저장에 실패했습니다.' });
        return;
      }
      success('저장 완료', { message: '진술서가 저장되었습니다.' });
    } finally {
      setSaving(false);
    }
  }, [form, caseId, organizationId, success, error]);

  // 총 글자 수 카운트
  const totalChars = Object.values(form).reduce((s, v) => s + v.length, 0);

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          진술서는 법원에 제출하는 중요한 서류입니다. 각 항목을 성실하게 작성해주세요.
        </p>
        <p className="mt-1 text-xs text-blue-600">
          총 {totalChars.toLocaleString()}자 작성됨
        </p>
      </div>

      {/* 진술서 섹션들 */}
      {SECTIONS.map((section) => (
        <section key={section.key} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor={`aff-${section.key}`} className="text-base font-semibold text-slate-800">
              {section.label}
            </label>
            <span className="text-xs text-slate-400">{(form[section.key] || '').length}자</span>
          </div>
          <textarea
            id={`aff-${section.key}`}
            rows={6}
            value={form[section.key] || ''}
            onChange={(e) => updateField(section.key, e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={section.placeholder}
          />
        </section>
      ))}

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="진술서 저장"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
