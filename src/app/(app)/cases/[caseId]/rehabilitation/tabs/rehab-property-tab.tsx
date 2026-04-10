'use client';

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabProperty, softDeleteRehabProperty, upsertRehabPropertyDeduction } from '@/lib/actions/rehabilitation-actions';
import { PROPERTY_CATEGORIES, calculateCategorySubtotal, calculateLiquidationValue, formatMoney, parseMoney } from '@/lib/rehabilitation';
import type { PropertyCategoryId, RehabPropertyItem } from '@/lib/rehabilitation';
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
      // 재산 항목 저장
      for (const item of items) {
        const data = {
          category: item.category,
          detail: item.detail,
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
          <div className="space-y-2">
            {categoryItems.map((item) => (
              <div key={item.id} className="grid grid-cols-2 gap-3 rounded-md border border-slate-100 bg-slate-50/50 p-3 md:grid-cols-5">
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor={`prop-detail-${item.id}`} className="text-xs font-medium text-slate-600">내용 <span className="text-red-500" aria-hidden="true">*</span></label>
                  <input
                    id={`prop-detail-${item.id}`}
                    type="text"
                    value={item.detail}
                    onChange={(e) => updateItem(item.id, 'detail', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="재산 상세 내용"
                  />
                </div>
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
                <div className="flex items-end gap-2">
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
