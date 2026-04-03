'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabApplication, upsertRehabFamilyMember, softDeleteRehabFamilyMember } from '@/lib/actions/rehabilitation-actions';
import { validateResidentFront, validateResidentBack, formatPhoneNumber } from '@/lib/rehabilitation';
import { Plus, Trash2, Save } from 'lucide-react';

interface RehabApplicantTabProps {
  caseId: string;
  organizationId: string;
  primaryClient: Record<string, unknown> | null;
  application: Record<string, unknown> | null;
  familyMembers: Record<string, unknown>[];
}

export function RehabApplicantTab({
  caseId,
  organizationId,
  primaryClient,
  application,
  familyMembers: initialFamilyMembers,
}: RehabApplicantTabProps) {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);

  // 신청인 기본 정보
  const [form, setForm] = useState({
    applicant_name: (application?.applicant_name as string) || (primaryClient?.full_name as string) || '',
    resident_front: (application?.resident_front as string) || (primaryClient?.resident_number_front as string) || '',
    resident_back: (application?.resident_back as string) || (primaryClient?.resident_number_back as string) || '',
    phone: (application?.phone as string) || (primaryClient?.phone as string) || '',
    address: (application?.address as string) || (primaryClient?.address as string) || '',
    detail_address: (application?.detail_address as string) || '',
    postal_code: (application?.postal_code as string) || '',
    email: (application?.email as string) || (primaryClient?.email as string) || '',
    occupation: (application?.occupation as string) || '',
    employer_name: (application?.employer_name as string) || '',
    employer_phone: (application?.employer_phone as string) || '',
    employment_start_date: (application?.employment_start_date as string) || '',
    court_name: (application?.court_name as string) || '',
    filing_date: (application?.filing_date as string) || '',
    filing_purpose: (application?.filing_purpose as string) || '원금균등변제',
  });

  // 가족 구성원
  const [familyMembers, setFamilyMembers] = useState(
    initialFamilyMembers.map((m) => ({
      id: m.id as string,
      relation: (m.relation as string) || '',
      member_name: (m.member_name as string) || '',
      age: (m.age as string) || '',
      cohabitation: (m.cohabitation as string) || '동거',
      occupation: (m.occupation as string) || '',
      monthly_income: (m.monthly_income as number) || 0,
      total_property: (m.total_property as number) || 0,
      is_dependent: (m.is_dependent as boolean) ?? true,
      isNew: false,
    })),
  );

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addFamilyMember = useCallback(() => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        relation: '',
        member_name: '',
        age: '',
        cohabitation: '동거',
        occupation: '',
        monthly_income: 0,
        total_property: 0,
        is_dependent: true,
        isNew: true,
      },
    ]);
  }, []);

  const updateFamilyMember = useCallback((index: number, field: string, value: unknown) => {
    setFamilyMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }, []);

  const removeFamilyMember = useCallback(
    async (index: number) => {
      const member = familyMembers[index];
      if (!member.isNew) {
        const result = await softDeleteRehabFamilyMember(member.id, caseId, organizationId);
        if (!result.ok) {
          error('삭제 실패', { message: '가족 구성원 삭제 중 문제가 발생했습니다.' });
          return;
        }
      }
      setFamilyMembers((prev) => prev.filter((_, i) => i !== index));
    },
    [familyMembers, caseId, organizationId, error],
  );

  const handleSave = useCallback(async () => {
    // 유효성 검증
    if (!form.applicant_name.trim()) {
      error('입력 오류', { message: '신청인 이름을 입력해주세요.' });
      return;
    }
    if (form.resident_front && !validateResidentFront(form.resident_front)) {
      error('입력 오류', { message: '주민등록번호 앞자리 형식이 올바르지 않습니다. (6자리 숫자)' });
      return;
    }
    if (form.resident_back && !validateResidentBack(form.resident_back)) {
      error('입력 오류', { message: '주민등록번호 뒷자리 형식이 올바르지 않습니다. (7자리 숫자)' });
      return;
    }

    setSaving(true);
    try {
      // 신청서 저장
      const appResult = await upsertRehabApplication(caseId, organizationId, form);
      if (!appResult.ok) {
        error('저장 실패', { message: appResult.userMessage || '신청서 저장에 실패했습니다.' });
        return;
      }

      // 가족 구성원 저장
      for (const member of familyMembers) {
        const memberData = {
          relation: member.relation,
          member_name: member.member_name,
          age: member.age,
          cohabitation: member.cohabitation,
          occupation: member.occupation,
          monthly_income: member.monthly_income,
          total_property: member.total_property,
          is_dependent: member.is_dependent,
        };

        const result = await upsertRehabFamilyMember(
          caseId,
          organizationId,
          memberData,
          member.isNew ? undefined : member.id,
        );
        if (!result.ok) {
          error('저장 실패', { message: '가족 구성원 저장 중 문제가 발생했습니다.' });
          return;
        }
      }

      success('저장 완료', { message: '신청인 정보가 저장되었습니다.' });
    } finally {
      setSaving(false);
    }
  }, [form, familyMembers, caseId, organizationId, success, error]);

  const dependentCount = familyMembers.filter((m) => m.is_dependent).length + 1; // 본인 포함

  return (
    <div className="space-y-6">
      {/* 필수 입력 안내 */}
      <p className="text-xs text-slate-500">
        <span className="text-red-500">*</span> 필수 입력 항목입니다
      </p>

      {/* 1. 신청인 기본 정보 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">신청인 기본 정보</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 이름 */}
          <div className="space-y-1">
            <label htmlFor="applicant_name" className="text-sm font-medium text-slate-700">
              이름 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="applicant_name"
              type="text"
              required
              aria-required="true"
              value={form.applicant_name}
              onChange={(e) => updateField('applicant_name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="홍길동"
            />
          </div>

          {/* 주민등록번호 */}
          <div className="space-y-1">
            <label htmlFor="resident_front" className="text-sm font-medium text-slate-700">
              주민등록번호 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="resident_front"
                type="text"
                maxLength={6}
                required
                aria-required="true"
                value={form.resident_front}
                onChange={(e) => updateField('resident_front', e.target.value.replace(/[^0-9]/g, ''))}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="생년월일 6자리"
              />
              <span className="text-slate-400">-</span>
              <input
                id="resident_back"
                type="password"
                maxLength={7}
                value={form.resident_back}
                onChange={(e) => updateField('resident_back', e.target.value.replace(/[^0-9]/g, ''))}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="뒷자리 7자리"
                aria-label="주민등록번호 뒷자리"
              />
            </div>
          </div>

          {/* 전화번호 */}
          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              전화번호 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              required
              aria-required="true"
              value={form.phone}
              onChange={(e) => updateField('phone', formatPhoneNumber(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="010-1234-5678"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">이메일</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>

          {/* 우편번호 */}
          <div className="space-y-1">
            <label htmlFor="postal_code" className="text-sm font-medium text-slate-700">우편번호</label>
            <input
              id="postal_code"
              type="text"
              maxLength={5}
              value={form.postal_code}
              onChange={(e) => updateField('postal_code', e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="5자리 숫자"
            />
          </div>

          {/* 주소 */}
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="address" className="text-sm font-medium text-slate-700">
              주소 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="address"
              type="text"
              required
              aria-required="true"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="기본 주소"
            />
          </div>

          {/* 상세주소 */}
          <div className="space-y-1">
            <label htmlFor="detail_address" className="text-sm font-medium text-slate-700">상세주소</label>
            <input
              id="detail_address"
              type="text"
              value={form.detail_address}
              onChange={(e) => updateField('detail_address', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="동/호수"
            />
          </div>
        </div>
      </section>

      {/* 2. 직업 정보 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">직업 정보</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="occupation" className="text-sm font-medium text-slate-700">직업</label>
            <input
              id="occupation"
              type="text"
              value={form.occupation}
              onChange={(e) => updateField('occupation', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="회사원, 자영업 등"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="employer_name" className="text-sm font-medium text-slate-700">직장명</label>
            <input
              id="employer_name"
              type="text"
              value={form.employer_name}
              onChange={(e) => updateField('employer_name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="employer_phone" className="text-sm font-medium text-slate-700">직장 전화</label>
            <input
              id="employer_phone"
              type="tel"
              value={form.employer_phone}
              onChange={(e) => updateField('employer_phone', formatPhoneNumber(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="02-1234-5678"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="employment_start_date" className="text-sm font-medium text-slate-700">근무 시작일</label>
            <input
              id="employment_start_date"
              type="date"
              value={form.employment_start_date}
              onChange={(e) => updateField('employment_start_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* 3. 신청 정보 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">신청 정보</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="court_name" className="text-sm font-medium text-slate-700">관할 법원</label>
            <input
              id="court_name"
              type="text"
              value={form.court_name}
              onChange={(e) => updateField('court_name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="서울회생법원"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="filing_date" className="text-sm font-medium text-slate-700">신청 예정일</label>
            <input
              id="filing_date"
              type="date"
              value={form.filing_date}
              onChange={(e) => updateField('filing_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="filing_purpose" className="text-sm font-medium text-slate-700">변제 방식</label>
            <select
              id="filing_purpose"
              value={form.filing_purpose}
              onChange={(e) => updateField('filing_purpose', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="변제 방식 선택"
            >
              <option value="원금균등변제">원금균등변제</option>
              <option value="원리금균등변제">원리금균등변제</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. 가족 구성원 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">가족 구성원</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              부양가족 {dependentCount}인 (본인 포함) — 기준중위소득 산정에 사용됩니다
            </p>
          </div>
          <button
            type="button"
            onClick={addFamilyMember}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            aria-label="가족 구성원 추가"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>

        {familyMembers.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="font-medium">등록된 가족 구성원이 없습니다</p>
            <p className="mt-1 text-sm">위의 추가 버튼으로 가족을 등록해주세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {familyMembers.map((member, idx) => (
              <div
                key={member.id}
                className="grid grid-cols-2 gap-3 rounded-md border border-slate-100 bg-slate-50/50 p-3 md:grid-cols-4 lg:grid-cols-8"
              >
                <div className="space-y-1">
                  <label htmlFor={`fm-relation-${idx}`} className="text-xs font-medium text-slate-600">관계</label>
                  <input
                    id={`fm-relation-${idx}`}
                    type="text"
                    value={member.relation}
                    onChange={(e) => updateFamilyMember(idx, 'relation', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="배우자, 자녀 등"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`fm-name-${idx}`} className="text-xs font-medium text-slate-600">이름</label>
                  <input
                    id={`fm-name-${idx}`}
                    type="text"
                    value={member.member_name}
                    onChange={(e) => updateFamilyMember(idx, 'member_name', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`fm-age-${idx}`} className="text-xs font-medium text-slate-600">나이</label>
                  <input
                    id={`fm-age-${idx}`}
                    type="text"
                    value={member.age}
                    onChange={(e) => updateFamilyMember(idx, 'age', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="만 나이"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`fm-cohab-${idx}`} className="text-xs font-medium text-slate-600">동거 여부</label>
                  <select
                    id={`fm-cohab-${idx}`}
                    value={member.cohabitation}
                    onChange={(e) => updateFamilyMember(idx, 'cohabitation', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="동거">동거</option>
                    <option value="비동거">비동거</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`fm-occ-${idx}`} className="text-xs font-medium text-slate-600">직업</label>
                  <input
                    id={`fm-occ-${idx}`}
                    type="text"
                    value={member.occupation}
                    onChange={(e) => updateFamilyMember(idx, 'occupation', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`fm-income-${idx}`} className="text-xs font-medium text-slate-600">월 소득</label>
                  <input
                    id={`fm-income-${idx}`}
                    type="number"
                    min={0}
                    value={member.monthly_income || ''}
                    onChange={(e) => updateFamilyMember(idx, 'monthly_income', parseInt(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="원"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={member.is_dependent}
                      onChange={(e) => updateFamilyMember(idx, 'is_dependent', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                      aria-label={`${member.member_name || '가족'} 부양가족 여부`}
                    />
                    부양가족
                  </label>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeFamilyMember(idx)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    aria-label={`${member.member_name || '가족 구성원'} 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="신청인 정보 저장"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
