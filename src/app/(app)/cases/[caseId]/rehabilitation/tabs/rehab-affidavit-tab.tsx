'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabAffidavit } from '@/lib/actions/rehabilitation-actions';
import { Plus, Trash2, Save } from 'lucide-react';

interface RehabAffidavitTabProps {
  caseId: string;
  organizationId: string;
  affidavit: Record<string, unknown> | null;
}

type CareerEntry = {
  id: string;
  from: string;
  to: string;
  company: string;
  position: string;
  salary: string;
  reason: string;
};

type AffidavitStructured = {
  // 학력
  school_name: string;
  graduation_year: string;
  graduation_status: string; // 졸업, 중퇴, 재학

  // 근무이력
  careers: CareerEntry[];

  // 결혼/이혼
  marriage_status: string; // 미혼, 기혼, 이혼
  marriage_note: string;

  // 현재 주거
  housing_type: string; // 자가, 전세, 월세, 무상거주
  housing_start: string;
  housing_note: string;

  // 부채 사유
  debt_has_lawsuit: boolean;
  debt_reason_living: boolean;
  debt_reason_business: boolean;
  debt_reason_guarantee: boolean;
  debt_reason_other: boolean;
  debt_reason_other_text: string;

  // 5개 서술 섹션
  debt_reason: string;        // 채무 경위
  debt_increase_reason: string; // 채무 증가 경위
  repay_effort: string;       // 변제 노력 (수입 및 재산의 변동)
  current_situation: string;  // 현재 상황
  future_plan: string;        // 향후 계획 및 다짐
  reflection: string;
};

function parseStructured(affidavit: Record<string, unknown> | null): AffidavitStructured {
  // income_change 필드에 JSON 구조를 저장
  let structured: Partial<AffidavitStructured> = {};
  try {
    const raw = affidavit?.income_change as string;
    if (raw && raw.startsWith('{')) {
      structured = JSON.parse(raw);
    }
  } catch {
    // fallback
  }

  return {
    school_name: (structured.school_name as string) || '',
    graduation_year: (structured.graduation_year as string) || '',
    graduation_status: (structured.graduation_status as string) || '졸업',
    careers: Array.isArray(structured.careers)
      ? structured.careers.map((c: CareerEntry, i: number) => ({ ...c, id: c.id || `c-${i}` }))
      : [],
    marriage_status: (structured.marriage_status as string) || '미혼',
    marriage_note: (structured.marriage_note as string) || '',
    housing_type: (structured.housing_type as string) || '',
    housing_start: (structured.housing_start as string) || '',
    housing_note: (structured.housing_note as string) || '',
    debt_has_lawsuit: !!structured.debt_has_lawsuit,
    debt_reason_living: !!structured.debt_reason_living,
    debt_reason_business: !!structured.debt_reason_business,
    debt_reason_guarantee: !!structured.debt_reason_guarantee,
    debt_reason_other: !!structured.debt_reason_other,
    debt_reason_other_text: (structured.debt_reason_other_text as string) || '',
    debt_reason: (affidavit?.debt_reason as string) || (affidavit?.debt_history as string) || '',
    debt_increase_reason: (affidavit?.debt_increase_reason as string) || (affidavit?.property_change as string) || '',
    repay_effort: (structured.repay_effort as string) || '',
    current_situation: (affidavit?.current_situation as string) || (affidavit?.living_situation as string) || '',
    future_plan: (affidavit?.future_plan as string) || '',
    reflection: (affidavit?.reflection as string) || '',
  };
}

const TEXT_SECTIONS = [
  { key: 'debt_reason', label: '1. 채무를 부담하게 된 경위', placeholder: '채무가 발생하게 된 원인과 경위를 상세히 기재해주세요.' },
  { key: 'debt_increase_reason', label: '2. 채무가 증가하게 된 사정', placeholder: '채무가 어떻게 증가하게 되었는지 기재해주세요.' },
  { key: 'repay_effort', label: '3. 수입 및 재산의 변동 상황', placeholder: '과거부터 현재까지의 수입, 재산 변동을 기재해주세요. 위의 근무이력을 참고하여 작성하세요.' },
  { key: 'current_situation', label: '4. 현재의 생활 상황', placeholder: '현재의 주거, 가족, 경제 상황을 기재해주세요.' },
  { key: 'future_plan', label: '5. 변제계획의 이행 가능성', placeholder: '변제 가능 여부와 향후 계획을 기재해주세요.' },
  { key: 'reflection', label: '반성 및 다짐', placeholder: '채무에 대한 반성과 향후 다짐을 기재해주세요.' },
] as const;

export function RehabAffidavitTab({
  caseId,
  organizationId,
  affidavit,
}: RehabAffidavitTabProps) {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AffidavitStructured>(() => parseStructured(affidavit));

  const updateField = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── 경력 관리 ───
  const addCareer = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      careers: [
        ...prev.careers,
        { id: `new-${Date.now()}`, from: '', to: '', company: '', position: '직원', salary: '', reason: '퇴사' },
      ],
    }));
  }, []);

  const updateCareer = useCallback((index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      careers: prev.careers.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  }, []);

  const removeCareer = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      careers: prev.careers.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // structured data → income_change JSON, text → their respective DB columns
      const structuredJson = JSON.stringify({
        school_name: form.school_name,
        graduation_year: form.graduation_year,
        graduation_status: form.graduation_status,
        careers: form.careers,
        marriage_status: form.marriage_status,
        marriage_note: form.marriage_note,
        housing_type: form.housing_type,
        housing_start: form.housing_start,
        housing_note: form.housing_note,
        debt_has_lawsuit: form.debt_has_lawsuit,
        debt_reason_living: form.debt_reason_living,
        debt_reason_business: form.debt_reason_business,
        debt_reason_guarantee: form.debt_reason_guarantee,
        debt_reason_other: form.debt_reason_other,
        debt_reason_other_text: form.debt_reason_other_text,
        repay_effort: form.repay_effort,
      });

      const result = await upsertRehabAffidavit(caseId, organizationId, {
        debt_reason: form.debt_reason,
        debt_increase_reason: form.debt_increase_reason,
        repay_effort: structuredJson, // income_change에 저장
        current_situation: form.current_situation,
        future_plan: form.future_plan,
        reflection: form.reflection,
      });
      if (!result.ok) {
        error('저장 실패', { message: result.userMessage || '진술서 저장에 실패했습니다.' });
        return;
      }
      success('저장 완료', { message: '진술서가 저장되었습니다.' });
    } finally {
      setSaving(false);
    }
  }, [form, caseId, organizationId, success, error]);

  const totalChars = [form.debt_reason, form.debt_increase_reason, form.repay_effort, form.current_situation, form.future_plan, form.reflection].reduce((s, v) => s + (v?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          진술서는 법원에 제출하는 중요한 서류입니다. 구조화된 정보를 입력하면 서술문도 자동으로 활용됩니다.
        </p>
        <p className="mt-1 text-xs text-blue-600">서술 부분 총 {totalChars.toLocaleString()}자 작성됨</p>
      </div>

      {/* ═══ 학력 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">학력</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="school_name" className="text-sm font-medium text-slate-700">학교명</label>
            <input
              id="school_name"
              type="text"
              value={form.school_name}
              onChange={(e) => updateField('school_name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="○○고등학교"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="graduation_year" className="text-sm font-medium text-slate-700">졸업 연도</label>
            <input
              id="graduation_year"
              type="text"
              maxLength={4}
              value={form.graduation_year}
              onChange={(e) => updateField('graduation_year', e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="2000"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="graduation_status" className="text-sm font-medium text-slate-700">졸업 여부</label>
            <select
              id="graduation_status"
              value={form.graduation_status}
              onChange={(e) => updateField('graduation_status', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="졸업 여부"
            >
              <option value="졸업">졸업</option>
              <option value="중퇴">중퇴</option>
              <option value="재학">재학</option>
              <option value="수료">수료</option>
            </select>
          </div>
        </div>
      </section>

      {/* ═══ 근무이력 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">근무이력</h2>
            <p className="text-xs text-slate-500">총 {form.careers.length}건</p>
          </div>
          <button
            type="button"
            onClick={addCareer}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            aria-label="근무이력 추가"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>

        {form.careers.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="font-medium">등록된 근무이력이 없습니다</p>
            <p className="mt-1 text-sm">추가 버튼으로 경력을 등록해주세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 헤더 */}
            <div className="hidden md:grid md:grid-cols-7 gap-2 px-2 text-xs font-medium text-slate-500">
              <span>번호</span>
              <span>근무처</span>
              <span>직위</span>
              <span>시작일</span>
              <span>종료일</span>
              <span>월급여</span>
              <span>퇴직사유</span>
            </div>
            {form.careers.map((career, idx) => (
              <div key={career.id} className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2 md:grid-cols-7 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 md:hidden">번호</label>
                  <span className="block px-2 py-1.5 text-sm text-slate-500">{idx + 1}</span>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`car-co-${idx}`} className="text-xs font-medium text-slate-600 md:hidden">근무처</label>
                  <input
                    id={`car-co-${idx}`}
                    type="text"
                    value={career.company}
                    onChange={(e) => updateCareer(idx, 'company', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="회사명"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`car-pos-${idx}`} className="text-xs font-medium text-slate-600 md:hidden">직위</label>
                  <input
                    id={`car-pos-${idx}`}
                    type="text"
                    value={career.position}
                    onChange={(e) => updateCareer(idx, 'position', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="직원"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`car-from-${idx}`} className="text-xs font-medium text-slate-600 md:hidden">시작일</label>
                  <input
                    id={`car-from-${idx}`}
                    type="text"
                    value={career.from}
                    onChange={(e) => updateCareer(idx, 'from', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="2020.01.01"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`car-to-${idx}`} className="text-xs font-medium text-slate-600 md:hidden">종료일</label>
                  <input
                    id={`car-to-${idx}`}
                    type="text"
                    value={career.to}
                    onChange={(e) => updateCareer(idx, 'to', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="현재"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`car-sal-${idx}`} className="text-xs font-medium text-slate-600 md:hidden">월급여</label>
                  <input
                    id={`car-sal-${idx}`}
                    type="text"
                    value={career.salary}
                    onChange={(e) => updateCareer(idx, 'salary', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="원"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <input
                    type="text"
                    value={career.reason}
                    onChange={(e) => updateCareer(idx, 'reason', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="퇴사"
                    aria-label={`${career.company} 퇴직사유`}
                  />
                  <button
                    type="button"
                    onClick={() => removeCareer(idx)}
                    className="shrink-0 p-1 text-red-400 hover:text-red-600"
                    aria-label={`${career.company} 근무이력 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ 결혼/이혼 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">결혼/이혼 경력</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="marriage_status" className="text-sm font-medium text-slate-700">혼인 상태</label>
            <select
              id="marriage_status"
              value={form.marriage_status}
              onChange={(e) => updateField('marriage_status', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="혼인 상태"
            >
              <option value="미혼">미혼</option>
              <option value="기혼">기혼</option>
              <option value="이혼">이혼</option>
              <option value="사별">사별</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="marriage_note" className="text-sm font-medium text-slate-700">비고</label>
            <input
              id="marriage_note"
              type="text"
              value={form.marriage_note}
              onChange={(e) => updateField('marriage_note', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="결혼/이혼 시기 등"
            />
          </div>
        </div>
      </section>

      {/* ═══ 현재 주거 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">현재 주거 상황</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="housing_type" className="text-sm font-medium text-slate-700">거주 형태</label>
            <select
              id="housing_type"
              value={form.housing_type}
              onChange={(e) => updateField('housing_type', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="거주 형태"
            >
              <option value="">선택</option>
              <option value="자가">자가</option>
              <option value="전세">전세</option>
              <option value="월세">월세</option>
              <option value="무상거주">무상거주</option>
              <option value="임차">임차</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="housing_start" className="text-sm font-medium text-slate-700">거주 시작일</label>
            <input
              id="housing_start"
              type="text"
              value={form.housing_start}
              onChange={(e) => updateField('housing_start', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="2023.12.08"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="housing_note" className="text-sm font-medium text-slate-700">비고</label>
            <input
              id="housing_note"
              type="text"
              value={form.housing_note}
              onChange={(e) => updateField('housing_note', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="보증금, 월세 금액 등"
            />
          </div>
        </div>
      </section>

      {/* ═══ 부채 사유 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">부채 사유</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.debt_has_lawsuit} onChange={(e) => updateField('debt_has_lawsuit', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" aria-label="소송 경험 여부" />
            소송 경험 있음
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">개인회생 신청 사유 (복수 선택 가능)</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.debt_reason_living} onChange={(e) => updateField('debt_reason_living', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" aria-label="생활비 부족" />
                생활비 부족
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.debt_reason_business} onChange={(e) => updateField('debt_reason_business', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" aria-label="사업 실패" />
                사업 실패
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.debt_reason_guarantee} onChange={(e) => updateField('debt_reason_guarantee', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" aria-label="보증채무" />
                보증채무
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.debt_reason_other} onChange={(e) => updateField('debt_reason_other', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" aria-label="기타 사유" />
                기타
              </label>
            </div>
            {form.debt_reason_other && (
              <input
                type="text"
                value={form.debt_reason_other_text}
                onChange={(e) => updateField('debt_reason_other_text', e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="기타 사유를 입력해주세요"
                aria-label="기타 사유 내용"
              />
            )}
          </div>
        </div>
      </section>

      {/* ═══ 서술 섹션 ═══ */}
      {TEXT_SECTIONS.map((section) => (
        <section key={section.key} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor={`aff-${section.key}`} className="text-base font-semibold text-slate-800">
              {section.label}
            </label>
            <span className="text-xs text-slate-400">{((form as Record<string, unknown>)[section.key] as string || '').length}자</span>
          </div>
          <textarea
            id={`aff-${section.key}`}
            rows={6}
            value={(form as Record<string, unknown>)[section.key] as string || ''}
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
