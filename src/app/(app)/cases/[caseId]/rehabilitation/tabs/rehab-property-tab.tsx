'use client';

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabProperty, softDeleteRehabProperty, upsertRehabPropertyDeduction } from '@/lib/actions/rehabilitation-actions';
import { PROPERTY_CATEGORIES, calculateCategorySubtotal, calculateLiquidationValue, formatMoney, parseMoney, PROPERTY_DETAIL_SCHEMAS, validatePropertyDetail } from '@/lib/rehabilitation';
import type { PropertyCategoryId, RehabPropertyItem } from '@/lib/rehabilitation';
import type { PropertyCategoryKey } from '@/lib/rehabilitation/property-schemas';
import { Plus, Trash2, Save, Package } from 'lucide-react';

interface RehabPropertyTabProps {
  caseId: string;
  organizationId: string;
  properties: Record<string, unknown>[];
  propertyDeductions: Record<string, unknown>[];
}

type PropertyRow = {
  id: string;
  category: PropertyCategoryId;
  detail: string;
  structured_detail: Record<string, unknown>;
  amount: number;
  seizure: string;
  repay_use: string;
  is_protection: boolean;
  isNew: boolean;
};

export function RehabPropertyTab({
  caseId,
  organizationId,
  properties: initialProps,
  propertyDeductions: initialDeductions,
}: RehabPropertyTabProps) {
  const { success, error, undo } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PropertyCategoryId>('cash');

  // 재산 항목
  const [items, setItems] = useState<PropertyRow[]>(
    initialProps.map((p) => ({
      id: p.id as string,
      category: (p.category as PropertyCategoryId) || 'cash',
      detail: (p.detail as string) || '',
      structured_detail: (p.structured_detail as Record<string, unknown>) || {},
      amount: (p.amount as number) || 0,
      seizure: (p.seizure as string) || '',
      repay_use: (p.repay_use as string) || '',
      is_protection: (p.is_protection as boolean) || false,
      isNew: false,
    })),
  );

  // 공제 금액
  const [deductions, setDeductions] = useState<Record<string, number>>(
    Object.fromEntries(initialDeductions.map((d) => [d.category as string, d.deduction_amount as number])),
  );

  const categoryItems = useMemo(
    () => items.filter((i) => i.category === activeCategory),
    [items, activeCategory],
  );

  const activeCategoryDef = useMemo(
    () => PROPERTY_CATEGORIES.find((c) => c.id === activeCategory),
    [activeCategory],
  );

  // 카테고리별 소계
  const categoryTotals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const cat of PROPERTY_CATEGORIES) {
      const catItems = items.filter((i) => i.category === cat.id);
      const rehabItems: RehabPropertyItem[] = catItems.map((i) => ({
        id: i.id,
        category: i.category,
        detail: i.detail,
        amount: i.amount,
        seizure: i.seizure,
        repayUse: i.repay_use,
        isProtection: i.is_protection,
      }));
      result[cat.id] = calculateCategorySubtotal(cat.id, rehabItems, deductions[cat.id] || 0);
    }
    return result;
  }, [items, deductions]);

  // 총 청산가치
  const totalLiquidation = useMemo(() => {
    return Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  }, [categoryTotals]);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        category: activeCategory,
        detail: '',
        structured_detail: {},
        amount: 0,
        seizure: '',
        repay_use: '',
        is_protection: false,
        isNew: true,
      },
    ]);
  }, [activeCategory]);

  const updateItem = useCallback((id: string, field: string, value: unknown) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }, []);

  const updateStructuredField = useCallback((id: string, subField: string, value: unknown) => {
    setItems((prev) => prev.map((i) =>
      i.id === id ? { ...i, structured_detail: { ...i.structured_detail, [subField]: value } } : i
    ));
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; detail: string } | null>(null);

  const removeItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      if (!item.isNew) {
        const result = await softDeleteRehabProperty(id, caseId, organizationId);
        if (!result.ok) {
          error('삭제 실패', { message: '재산 항목 삭제에 실패했습니다.' });
          return;
        }
        undo('재산 항목 삭제됨', () => {}, { message: '보관함에서 복구할 수 있습니다.' });
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    },
    [items, caseId, organizationId, error, undo],
  );

  const requestDeleteItem = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.isNew) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setDeleteConfirm({ id, detail: item.detail || `${activeCategoryDef?.name} 항목` });
    }
  }, [items, activeCategoryDef]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // 재산 항목 저장 (structured_detail 검증 포함)
      for (const item of items) {
        // 카테고리별 structured_detail 검증
        if (item.category !== 'etc' && Object.keys(item.structured_detail).length > 0) {
          const validation = validatePropertyDetail(item.category, item.structured_detail);
          if (!validation.ok) {
            error('입력 오류', { message: `${item.category} 항목: ${validation.error}` });
            return;
          }
        }
        const data = {
          category: item.category,
          detail: item.detail,
          structured_detail: item.structured_detail,
          amount: item.amount,
          seizure: item.seizure,
          repay_use: item.repay_use,
          is_protection: item.is_protection,
        };
        const result = await upsertRehabProperty(caseId, organizationId, data, item.isNew ? undefined : item.id);
        if (!result.ok) {
          error('저장 실패', { message: '재산 항목 저장에 실패했습니다.' });
          return;
        }
      }

      // 공제 금액 저장
      for (const [category, amount] of Object.entries(deductions)) {
        if (amount > 0) {
          await upsertRehabPropertyDeduction(caseId, organizationId, category, amount);
        }
      }

      success('저장 완료', { message: '재산 목록이 저장되었습니다.' });
    } finally {
      setSaving(false);
    }
  }, [items, deductions, caseId, organizationId, success, error]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>

      {/* 총 청산가치 요약 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
        <p className="text-sm text-blue-600">총 청산가치</p>
        <p className="mt-1 text-2xl font-bold text-blue-800">{formatMoney(totalLiquidation)}원</p>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {PROPERTY_CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap rounded-t px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              aria-label={`${cat.name} (${count}건)`}
            >
              {cat.name}
              {count > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-600">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 카테고리별 재산 목록 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{activeCategoryDef?.name}</h2>
            <p className="text-xs text-slate-500">
              소계: {formatMoney(categoryTotals[activeCategory] || 0)}원
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            aria-label="재산 항목 추가"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>

        {/* 공제 입력 (해당되는 카테고리만) */}
        {activeCategoryDef?.hasDeduction && (
          <div className="mb-4 rounded-md bg-amber-50 p-3">
            <label htmlFor={`deduction-${activeCategory}`} className="text-xs font-medium text-amber-700">
              {activeCategoryDef.deductionLabel || '공제액'} (원)
            </label>
            {activeCategoryDef.deductionNote && (
              <p className="mb-1 text-xs text-amber-600">{activeCategoryDef.deductionNote}</p>
            )}
            <input
              id={`deduction-${activeCategory}`}
              type="text"
              value={deductions[activeCategory] ? formatMoney(deductions[activeCategory]) : ''}
              onChange={(e) => setDeductions((prev) => ({ ...prev, [activeCategory]: parseMoney(e.target.value) }))}
              className="mt-1 w-48 rounded border border-amber-300 px-2 py-1.5 text-sm text-right"
              placeholder="0"
            />
          </div>
        )}

        {categoryItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">아직 {activeCategoryDef?.name} 항목이 없습니다</p>
            <p className="mt-1 text-sm">추가 버튼으로 항목을 등록해주세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categoryItems.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-100 bg-slate-50/50 p-3 space-y-3">
                {/* 카테고리별 동적 폼 */}
                <PropertyDetailFields
                  item={item}
                  category={activeCategory}
                  onUpdateStructured={(field, val) => updateStructuredField(item.id, field, val)}
                  onUpdateDetail={(val) => updateItem(item.id, 'detail', val)}
                />

                {/* 공통 필드: 금액 / 압류 / 보호 / 삭제 */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 border-t border-slate-100 pt-3">
                  <div className="space-y-1">
                    <label htmlFor={`prop-amount-${item.id}`} className="text-xs font-medium text-slate-600">금액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
                    <input
                      id={`prop-amount-${item.id}`}
                      type="text"
                      value={item.amount ? formatMoney(item.amount) : ''}
                      onChange={(e) => updateItem(item.id, 'amount', parseMoney(e.target.value))}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`prop-seizure-${item.id}`} className="text-xs font-medium text-slate-600">압류 여부</label>
                    <select
                      id={`prop-seizure-${item.id}`}
                      value={item.seizure}
                      onChange={(e) => updateItem(item.id, 'seizure', e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">해당없음</option>
                      <option value="압류">압류</option>
                      <option value="가압류">가압류</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.is_protection}
                        onChange={(e) => updateItem(item.id, 'is_protection', e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                        aria-label="보호 재산 여부"
                      />
                      보호
                    </label>
                  </div>
                  <div className="flex items-center justify-end pt-5">
                    <button
                      type="button"
                      onClick={() => requestDeleteItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      aria-label="항목 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 카테고리별 소계 요약 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">카테고리별 소계</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {PROPERTY_CATEGORIES.filter((cat) => (categoryTotals[cat.id] || 0) > 0 || items.some((i) => i.category === cat.id)).map((cat) => (
            <div key={cat.id} className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
              <p className="text-xs text-slate-500">{cat.name}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">{formatMoney(categoryTotals[cat.id] || 0)}원</p>
            </div>
          ))}
        </div>
      </section>

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="재산 목록 저장"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="prop-delete-title">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 id="prop-delete-title" className="text-base font-semibold text-slate-800">삭제 확인</h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-red-600">{deleteConfirm.detail}</span>을(를) 삭제하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-slate-400">보관함에서 복구할 수 있습니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">취소</button>
              <button type="button" onClick={() => removeItem(deleteConfirm.id)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 카테고리별 동적 폼 ──────────────────────────────────────────
const inputClass = 'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function PropertyDetailFields({
  item,
  category,
  onUpdateStructured,
  onUpdateDetail,
}: {
  item: PropertyRow;
  category: PropertyCategoryId;
  onUpdateStructured: (field: string, value: unknown) => void;
  onUpdateDetail: (value: string) => void;
}) {
  const d = item.structured_detail;
  const s = (f: string) => (d[f] as string) ?? '';
  const n = (f: string) => (d[f] as number) ?? 0;

  switch (category) {
    case 'deposit':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor={`sd-bank-${item.id}`} className="text-xs font-medium text-slate-600">금융기관명 <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-bank-${item.id}`} type="text" value={s('bank_name')} onChange={(e) => onUpdateStructured('bank_name', e.target.value)} className={inputClass} placeholder="○○은행" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-acct-${item.id}`} className="text-xs font-medium text-slate-600">계좌번호</label>
            <input id={`sd-acct-${item.id}`} type="text" value={s('account_number')} onChange={(e) => onUpdateStructured('account_number', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-bal-${item.id}`} className="text-xs font-medium text-slate-600">잔고 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-bal-${item.id}`} type="text" value={n('balance') ? formatMoney(n('balance')) : ''} onChange={(e) => onUpdateStructured('balance', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-dtype-${item.id}`} className="text-xs font-medium text-slate-600">예금 종류</label>
            <input id={`sd-dtype-${item.id}`} type="text" value={s('deposit_type')} onChange={(e) => onUpdateStructured('deposit_type', e.target.value)} className={inputClass} placeholder="정기/적금/부금" />
          </div>
        </div>
      );

    case 'insurance':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor={`sd-ins-${item.id}`} className="text-xs font-medium text-slate-600">보험회사명 <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-ins-${item.id}`} type="text" value={s('company_name')} onChange={(e) => onUpdateStructured('company_name', e.target.value)} className={inputClass} placeholder="○○생명" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-pol-${item.id}`} className="text-xs font-medium text-slate-600">증권번호</label>
            <input id={`sd-pol-${item.id}`} type="text" value={s('policy_number')} onChange={(e) => onUpdateStructured('policy_number', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-surr-${item.id}`} className="text-xs font-medium text-slate-600">해약반환금 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-surr-${item.id}`} type="text" value={n('surrender_value') ? formatMoney(n('surrender_value')) : ''} onChange={(e) => onUpdateStructured('surrender_value', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
        </div>
      );

    case 'car':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor={`sd-model-${item.id}`} className="text-xs font-medium text-slate-600">차종</label>
            <input id={`sd-model-${item.id}`} type="text" value={s('model')} onChange={(e) => onUpdateStructured('model', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-year-${item.id}`} className="text-xs font-medium text-slate-600">연식</label>
            <input id={`sd-year-${item.id}`} type="number" value={n('year') || ''} onChange={(e) => onUpdateStructured('year', parseInt(e.target.value) || 0)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-reg-${item.id}`} className="text-xs font-medium text-slate-600">등록번호</label>
            <input id={`sd-reg-${item.id}`} type="text" value={s('registration_number')} onChange={(e) => onUpdateStructured('registration_number', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-mv-${item.id}`} className="text-xs font-medium text-slate-600">시가 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-mv-${item.id}`} type="text" value={n('market_value') ? formatMoney(n('market_value')) : ''} onChange={(e) => onUpdateStructured('market_value', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
        </div>
      );

    case 'lease':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`sd-prop-${item.id}`} className="text-xs font-medium text-slate-600">임차물건</label>
            <input id={`sd-prop-${item.id}`} type="text" value={s('property_description')} onChange={(e) => onUpdateStructured('property_description', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-dep-${item.id}`} className="text-xs font-medium text-slate-600">보증금 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-dep-${item.id}`} type="text" value={n('deposit_amount') ? formatMoney(n('deposit_amount')) : ''} onChange={(e) => onUpdateStructured('deposit_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-rent-${item.id}`} className="text-xs font-medium text-slate-600">월세 (원)</label>
            <input id={`sd-rent-${item.id}`} type="text" value={n('monthly_rent') ? formatMoney(n('monthly_rent')) : ''} onChange={(e) => onUpdateStructured('monthly_rent', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-refund-${item.id}`} className="text-xs font-medium text-slate-600">반환받을 금액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-refund-${item.id}`} type="text" value={n('refundable_amount') ? formatMoney(n('refundable_amount')) : ''} onChange={(e) => onUpdateStructured('refundable_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`sd-diff-${item.id}`} className="text-xs font-medium text-slate-600">차이 나는 사유</label>
            <input id={`sd-diff-${item.id}`} type="text" value={s('difference_reason')} onChange={(e) => onUpdateStructured('difference_reason', e.target.value)} className={inputClass} />
          </div>
        </div>
      );

    case 'realestate':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`sd-loc-${item.id}`} className="text-xs font-medium text-slate-600">소재지 <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-loc-${item.id}`} type="text" value={s('location')} onChange={(e) => onUpdateStructured('location', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-area-${item.id}`} className="text-xs font-medium text-slate-600">면적 (m²)</label>
            <input id={`sd-area-${item.id}`} type="number" step="0.01" value={n('area_sqm') || ''} onChange={(e) => onUpdateStructured('area_sqm', parseFloat(e.target.value) || 0)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-kind-${item.id}`} className="text-xs font-medium text-slate-600">부동산 종류</label>
            <select id={`sd-kind-${item.id}`} value={s('property_kind')} onChange={(e) => onUpdateStructured('property_kind', e.target.value)} className={inputClass}>
              <option value="">선택</option>
              <option value="토지">토지</option>
              <option value="건물">건물</option>
              <option value="집합건물">집합건물</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-est-${item.id}`} className="text-xs font-medium text-slate-600">환가예상액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-est-${item.id}`} type="text" value={n('estimated_value') ? formatMoney(n('estimated_value')) : ''} onChange={(e) => onUpdateStructured('estimated_value', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-ltype-${item.id}`} className="text-xs font-medium text-slate-600">담보 종류</label>
            <select id={`sd-ltype-${item.id}`} value={s('lien_type')} onChange={(e) => onUpdateStructured('lien_type', e.target.value)} className={inputClass}>
              <option value="">없음</option>
              <option value="근저당권">근저당권</option>
              <option value="저당권">저당권</option>
              <option value="가등기담보">가등기담보</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-lamt-${item.id}`} className="text-xs font-medium text-slate-600">피담보채무액 (원)</label>
            <input id={`sd-lamt-${item.id}`} type="text" value={n('lien_amount') ? formatMoney(n('lien_amount')) : ''} onChange={(e) => onUpdateStructured('lien_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-rights-${item.id}`} className="text-xs font-medium text-slate-600">권리의 종류</label>
            <input id={`sd-rights-${item.id}`} type="text" value={s('rights_type')} onChange={(e) => onUpdateStructured('rights_type', e.target.value)} className={inputClass} />
          </div>
        </div>
      );

    case 'retirement':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor={`sd-emp-${item.id}`} className="text-xs font-medium text-slate-600">근무처</label>
            <input id={`sd-emp-${item.id}`} type="text" value={s('employer_name')} onChange={(e) => onUpdateStructured('employer_name', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-gross-${item.id}`} className="text-xs font-medium text-slate-600">퇴직금 총액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-gross-${item.id}`} type="text" value={n('gross_amount') ? formatMoney(n('gross_amount')) : ''} onChange={(e) => onUpdateStructured('gross_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-exempt-${item.id}`} className="text-xs font-medium text-slate-600">압류 불가 금액 (원)</label>
            <input id={`sd-exempt-${item.id}`} type="text" value={n('exempt_amount') ? formatMoney(n('exempt_amount')) : ''} onChange={(e) => onUpdateStructured('exempt_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-net-${item.id}`} className="text-xs font-medium text-slate-600">순 퇴직금 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-net-${item.id}`} type="text" value={n('net_amount') ? formatMoney(n('net_amount')) : ''} onChange={(e) => onUpdateStructured('net_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
        </div>
      );

    case 'equipment':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor={`sd-fname-${item.id}`} className="text-xs font-medium text-slate-600">품목</label>
            <input id={`sd-fname-${item.id}`} type="text" value={s('item_name')} onChange={(e) => onUpdateStructured('item_name', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-qty-${item.id}`} className="text-xs font-medium text-slate-600">개수</label>
            <input id={`sd-qty-${item.id}`} type="number" min={0} value={n('quantity') || ''} onChange={(e) => onUpdateStructured('quantity', parseInt(e.target.value) || 0)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-pdate-${item.id}`} className="text-xs font-medium text-slate-600">구입 시기</label>
            <input id={`sd-pdate-${item.id}`} type="text" value={s('purchase_date')} onChange={(e) => onUpdateStructured('purchase_date', e.target.value)} className={inputClass} placeholder="2024년 3월" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-val-${item.id}`} className="text-xs font-medium text-slate-600">평가액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-val-${item.id}`} type="text" value={n('valuation') ? formatMoney(n('valuation')) : ''} onChange={(e) => onUpdateStructured('valuation', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
        </div>
      );

    case 'loan':
    case 'sales':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor={`sd-debtor-${item.id}`} className="text-xs font-medium text-slate-600">상대방 채무자</label>
            <input id={`sd-debtor-${item.id}`} type="text" value={s('debtor_name')} onChange={(e) => onUpdateStructured('debtor_name', e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-cur-${item.id}`} className="text-xs font-medium text-slate-600">현재액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-cur-${item.id}`} type="text" value={n('current_amount') ? formatMoney(n('current_amount')) : ''} onChange={(e) => onUpdateStructured('current_amount', parseMoney(e.target.value))} className={`${inputClass} text-right`} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`sd-diff-${item.id}`} className="text-xs font-medium text-slate-600">변제 곤란 사유</label>
            <input id={`sd-diff-${item.id}`} type="text" value={s('difficulty_reason')} onChange={(e) => onUpdateStructured('difficulty_reason', e.target.value)} className={inputClass} />
          </div>
        </div>
      );

    case 'cash':
      return (
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label htmlFor={`sd-note-${item.id}`} className="text-xs font-medium text-slate-600">비고</label>
            <input id={`sd-note-${item.id}`} type="text" value={s('note')} onChange={(e) => onUpdateStructured('note', e.target.value)} className={inputClass} placeholder="10만 원 이상인 경우 기재" />
          </div>
        </div>
      );

    default: // etc + 알 수 없는 카테고리 → 기존 detail 텍스트 사용
      return (
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label htmlFor={`sd-detail-${item.id}`} className="text-xs font-medium text-slate-600">내용 <span className="text-red-500" aria-hidden="true">*</span></label>
            <input id={`sd-detail-${item.id}`} type="text" value={item.detail} onChange={(e) => onUpdateDetail(e.target.value)} className={inputClass} placeholder="재산 상세 내용" />
          </div>
        </div>
      );
  }
}
