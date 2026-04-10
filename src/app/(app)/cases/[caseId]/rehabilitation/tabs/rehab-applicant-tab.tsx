'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabApplication, upsertRehabFamilyMember, softDeleteRehabFamilyMember } from '@/lib/actions/rehabilitation-actions';
import { validateResidentFront, validateResidentBack, formatPhoneNumber } from '@/lib/rehabilitation';
import { Plus, Trash2, Save, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface RehabApplicantTabProps {
  caseId: string;
  organizationId: string;
  primaryClient: Record<string, unknown> | null;
  application: Record<string, unknown> | null;
  familyMembers: Record<string, unknown>[];
}

// ─── 주소 입력 컴포넌트 ───
function AddressFields({
  prefix,
  label,
  value,
  onChange,
  copyFrom,
  copyLabel,
}: {
  prefix: string;
  label: string;
  value: { address: string; detail: string; postal_code: string };
  onChange: (field: string, val: string) => void;
  copyFrom?: () => { address: string; detail: string; postal_code: string };
  copyLabel?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {label}
        {copyFrom && (
          <button
            type="button"
            onClick={() => {
              const src = copyFrom();
              onChange(`${prefix}_address`, src.address);
              onChange(`${prefix}_detail`, src.detail);
              onChange(`${prefix}_postal_code`, src.postal_code);
            }}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-normal text-blue-600 hover:bg-blue-50 transition-colors"
            aria-label={copyLabel}
          >
            <Copy className="h-3 w-3" />
            {copyLabel}
          </button>
        )}
      </legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor={`${prefix}_postal_code`} className="text-xs font-medium text-slate-600">우편번호</label>
          <input
            id={`${prefix}_postal_code`}
            type="text"
            maxLength={5}
            value={value.postal_code}
            onChange={(e) => onChange(`${prefix}_postal_code`, e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="5자리 숫자"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label htmlFor={`${prefix}_address`} className="text-xs font-medium text-slate-600">주소</label>
          <input
            id={`${prefix}_address`}
            type="text"
            value={value.address}
            onChange={(e) => onChange(`${prefix}_address`, e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="기본 주소"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${prefix}_detail`} className="text-xs font-medium text-slate-600">상세주소</label>
        <input
          id={`${prefix}_detail`}
          type="text"
          value={value.detail}
          onChange={(e) => onChange(`${prefix}_detail`, e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="동/호수"
        />
      </div>
    </fieldset>
  );
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
  const [showAgent, setShowAgent] = useState(
    !!(application?.agent_name || application?.agent_type),
  );
  const [showExtra, setShowExtra] = useState(
    !!(application?.has_extra_income),
  );

  // ─── 주소 jsonb 파싱 헬퍼 ───
  const parseAddr = (raw: unknown): { address: string; detail: string; postal_code: string } => {
    if (!raw || typeof raw !== 'object') return { address: '', detail: '', postal_code: '' };
    const obj = raw as Record<string, string>;
    return { address: obj.address || '', detail: obj.detail || '', postal_code: obj.postal_code || '' };
  };

  // ─── 신청인 전체 폼 상태 ───
  const [form, setForm] = useState(() => {
    const a = application || {};
    const pc = primaryClient || {};
    const regAddr = parseAddr(a.registered_address || a.address);
    const curAddr = parseAddr(a.current_address);
    const offAddr = parseAddr(a.office_address);
    const svcAddr = parseAddr(a.service_address);
    const agentAddr = parseAddr(a.agent_address);

    return {
      // 인적사항
      applicant_name: (a.applicant_name as string) || (pc.full_name as string) || '',
      resident_front: (a.resident_front as string) || (a.resident_number_front as string) || (pc.resident_number_front as string) || '',
      resident_back: (a.resident_back as string) || (pc.resident_number_back as string) || '',
      phone: (a.phone as string) || (a.phone_mobile as string) || (pc.phone as string) || '',
      phone_home: (a.phone_home as string) || '',
      email: (a.email as string) || (a.agent_email as string) || (pc.email as string) || '',

      // 주민등록상 주소
      reg_address: regAddr.address || (a.address as string) || (pc.address as string) || '',
      reg_detail: regAddr.detail || (a.detail_address as string) || '',
      reg_postal_code: regAddr.postal_code || (a.postal_code as string) || '',

      // 현주소
      cur_address: curAddr.address,
      cur_detail: curAddr.detail,
      cur_postal_code: curAddr.postal_code,

      // 직장주소
      off_address: offAddr.address,
      off_detail: offAddr.detail,
      off_postal_code: offAddr.postal_code,

      // 송달주소
      svc_address: svcAddr.address,
      svc_detail: svcAddr.detail,
      svc_postal_code: svcAddr.postal_code,
      service_recipient: (a.service_recipient as string) || '',

      // 반환계좌
      return_account: (a.return_account as string) || '',

      // 소득 정보
      income_type: (a.income_type as string) || 'salary',
      employer_name: (a.employer_name as string) || '',
      occupation: (a.occupation as string) || (a.position as string) || '',
      employer_phone: (a.employer_phone as string) || '',
      employment_start_date: (a.employment_start_date as string) || (a.work_period as string) || '',
      has_extra_income: (a.has_extra_income as boolean) || false,
      extra_income_name: (a.extra_income_name as string) || '',
      extra_income_source: (a.extra_income_source as string) || '',

      // 신청 관련
      court_name: (a.court_name as string) || '',
      court_detail: (a.court_detail as string) || '',
      judge_division: (a.judge_division as string) || '',
      case_year: (a.case_year as number) || new Date().getFullYear(),
      case_number: (a.case_number as string) || '',
      filing_date: (a.filing_date as string) || (a.application_date as string) || '',
      filing_purpose: (a.filing_purpose as string) || '원금균등변제',
      repayment_start_date: (a.repayment_start_date as string) || '',
      repayment_start_uncertain: (a.repayment_start_uncertain as boolean) || false,
      repayment_start_day: (a.repayment_start_day as number) || 0,

      // 개인회생위원 계좌
      trustee_bank_name: (a.trustee_bank_name as string) || '',
      trustee_bank_account: (a.trustee_bank_account as string) || '',

      // 기존 신청 여부
      has_prior_application: Array.isArray(a.prior_applications) && (a.prior_applications as unknown[]).length > 0,

      // 대리인
      agent_type: (a.agent_type as string) || '',
      agent_name: (a.agent_name as string) || '',
      agent_phone: (a.agent_phone as string) || '',
      agent_fax: (a.agent_fax as string) || '',
      agent_email_addr: (a.agent_email as string) || '',
      agt_address: agentAddr.address,
      agt_detail: agentAddr.detail,
      agt_postal_code: agentAddr.postal_code,

      // 문서 옵션
      info_request_form: (a.info_request_form as boolean) || false,
      ecourt_agreement: (a.ecourt_agreement as boolean) || false,
      delegation_form: (a.delegation_form as boolean) || false,
    };
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

  const updateField = useCallback((field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addFamilyMember = useCallback(() => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
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

  const [familyDeleteConfirm, setFamilyDeleteConfirm] = useState<{ index: number; name: string } | null>(null);

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
      setFamilyDeleteConfirm(null);
    },
    [familyMembers, caseId, organizationId, error],
  );

  const requestDeleteFamily = useCallback((index: number) => {
    const member = familyMembers[index];
    if (member.isNew) {
      setFamilyMembers((prev) => prev.filter((_, i) => i !== index));
    } else {
      setFamilyDeleteConfirm({ index, name: member.member_name || '가족 구성원' });
    }
  }, [familyMembers]);

  const handleSave = useCallback(async () => {
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
      const appResult = await upsertRehabApplication(caseId, organizationId, form);
      if (!appResult.ok) {
        error('저장 실패', { message: appResult.userMessage || '신청서 저장에 실패했습니다.' });
        return;
      }

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

  const dependentCount = familyMembers.filter((m) => m.is_dependent).length + 1;

  // ─── 주소 복사 헬퍼 ───
  const getRegAddr = () => ({
    address: form.reg_address,
    detail: form.reg_detail,
    postal_code: form.reg_postal_code,
  });

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        <span className="text-red-500">*</span> 필수 입력 항목입니다
      </p>

      {/* ═══ 1. 인적사항 ═══ */}
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

          {/* 휴대전화 */}
          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              휴대전화 <span className="text-red-500" aria-hidden="true">*</span>
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

          {/* 자택 전화 */}
          <div className="space-y-1">
            <label htmlFor="phone_home" className="text-sm font-medium text-slate-700">자택 전화</label>
            <input
              id="phone_home"
              type="tel"
              value={form.phone_home}
              onChange={(e) => updateField('phone_home', formatPhoneNumber(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="02-1234-5678"
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

          {/* 반환계좌 */}
          <div className="space-y-1">
            <label htmlFor="return_account" className="text-sm font-medium text-slate-700">반환계좌</label>
            <input
              id="return_account"
              type="text"
              value={form.return_account}
              onChange={(e) => updateField('return_account', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="은행명 + 계좌번호"
            />
          </div>
        </div>
      </section>

      {/* ═══ 2. 주소 정보 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-5">
        <h2 className="text-base font-semibold text-slate-800">주소 정보</h2>

        {/* 주민등록상 주소 */}
        <AddressFields
          prefix="reg"
          label="주민등록상 주소"
          value={{ address: form.reg_address, detail: form.reg_detail, postal_code: form.reg_postal_code }}
          onChange={(f, v) => updateField(f, v)}
        />

        {/* 현주소 */}
        <AddressFields
          prefix="cur"
          label="현주소 (실거주지)"
          value={{ address: form.cur_address, detail: form.cur_detail, postal_code: form.cur_postal_code }}
          onChange={(f, v) => updateField(f, v)}
          copyFrom={getRegAddr}
          copyLabel="주민등록상 주소와 동일"
        />

        {/* 송달주소 */}
        <AddressFields
          prefix="svc"
          label="송달주소"
          value={{ address: form.svc_address, detail: form.svc_detail, postal_code: form.svc_postal_code }}
          onChange={(f, v) => updateField(f, v)}
          copyFrom={getRegAddr}
          copyLabel="주민등록상 주소와 동일"
        />
        <div className="space-y-1 max-w-xs">
          <label htmlFor="service_recipient" className="text-xs font-medium text-slate-600">송달수령인</label>
          <input
            id="service_recipient"
            type="text"
            value={form.service_recipient}
            onChange={(e) => updateField('service_recipient', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="본인 외 수령 시 입력"
          />
        </div>
      </section>

      {/* ═══ 3. 소득/직업 정보 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">소득 및 직업 정보</h2>

        {/* 소득구분 라디오 */}
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium text-slate-700">소득 구분</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="income_type"
                value="salary"
                checked={form.income_type === 'salary'}
                onChange={() => updateField('income_type', 'salary')}
                className="h-4 w-4 text-blue-600 border-slate-300"
                aria-label="급여소득자"
              />
              급여소득자
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="income_type"
                value="business"
                checked={form.income_type === 'business'}
                onChange={() => updateField('income_type', 'business')}
                className="h-4 w-4 text-blue-600 border-slate-300"
                aria-label="영업소득자"
              />
              영업소득자
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <label htmlFor="occupation" className="text-sm font-medium text-slate-700">직위/직종</label>
            <input
              id="occupation"
              type="text"
              value={form.occupation}
              onChange={(e) => updateField('occupation', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="배달기사, 사무직 등"
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

        {/* 직장주소 */}
        <div className="mt-4">
          <AddressFields
            prefix="off"
            label="직장 주소"
            value={{ address: form.off_address, detail: form.off_detail, postal_code: form.off_postal_code }}
            onChange={(f, v) => updateField(f, v)}
          />
        </div>

        {/* 부수입 */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_extra_income}
              onChange={(e) => {
                updateField('has_extra_income', e.target.checked);
                setShowExtra(e.target.checked);
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              aria-label="부수입 있음"
            />
            부수입 있음
          </label>
          {showExtra && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="extra_income_name" className="text-xs font-medium text-slate-600">부수입명</label>
                <input
                  id="extra_income_name"
                  type="text"
                  value={form.extra_income_name}
                  onChange={(e) => updateField('extra_income_name', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="부업, 프리랜서 등"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="extra_income_source" className="text-xs font-medium text-slate-600">부수입처</label>
                <input
                  id="extra_income_source"
                  type="text"
                  value={form.extra_income_source}
                  onChange={(e) => updateField('extra_income_source', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="업체명, 거래처 등"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ 4. 신청/사건 정보 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">신청 및 사건 정보</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="court_name" className="text-sm font-medium text-slate-700">관할 법원</label>
            <input
              id="court_name"
              type="text"
              value={form.court_name}
              onChange={(e) => updateField('court_name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="인천지방법원"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="court_detail" className="text-sm font-medium text-slate-700">법원 상세</label>
            <input
              id="court_detail"
              type="text"
              value={form.court_detail}
              onChange={(e) => updateField('court_detail', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="회생부"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="judge_division" className="text-sm font-medium text-slate-700">재판부</label>
            <input
              id="judge_division"
              type="text"
              value={form.judge_division}
              onChange={(e) => updateField('judge_division', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="제1부"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="case_year" className="text-sm font-medium text-slate-700">사건 연도</label>
            <input
              id="case_year"
              type="number"
              min={2000}
              max={2100}
              value={form.case_year}
              onChange={(e) => updateField('case_year', parseInt(e.target.value) || 0)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="case_number" className="text-sm font-medium text-slate-700">사건번호</label>
            <input
              id="case_number"
              type="text"
              value={form.case_number}
              onChange={(e) => updateField('case_number', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="개회 제○호"
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

        {/* 변제개시일 */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="repayment_start_date" className="text-sm font-medium text-slate-700">변제개시일</label>
              <input
                id="repayment_start_date"
                type="date"
                value={form.repayment_start_date}
                disabled={form.repayment_start_uncertain}
                onChange={(e) => updateField('repayment_start_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.repayment_start_uncertain}
                  onChange={(e) => updateField('repayment_start_uncertain', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  aria-label="변제개시일 미정"
                />
                인가결정일로부터 정함
              </label>
            </div>
            {form.repayment_start_uncertain && (
              <div className="space-y-1">
                <label htmlFor="repayment_start_day" className="text-sm font-medium text-slate-700">인가 후 일수</label>
                <div className="flex items-center gap-2">
                  <input
                    id="repayment_start_day"
                    type="number"
                    min={0}
                    value={form.repayment_start_day || ''}
                    onChange={(e) => updateField('repayment_start_day', parseInt(e.target.value) || 0)}
                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500">일 후</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 개인회생위원 계좌 */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">개인회생위원 계좌</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="trustee_bank_name" className="text-xs font-medium text-slate-600">은행명</label>
              <input
                id="trustee_bank_name"
                type="text"
                value={form.trustee_bank_name}
                onChange={(e) => updateField('trustee_bank_name', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="국민은행"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="trustee_bank_account" className="text-xs font-medium text-slate-600">계좌번호</label>
              <input
                id="trustee_bank_account"
                type="text"
                value={form.trustee_bank_account}
                onChange={(e) => updateField('trustee_bank_account', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="000-000000-00-000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5. 대리인 정보 (접이식) ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowAgent((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
          aria-expanded={showAgent}
          aria-controls="agent-section"
        >
          <h2 className="text-base font-semibold text-slate-800">대리인 정보</h2>
          {showAgent ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        {showAgent && (
          <div id="agent-section" className="border-t border-slate-100 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="agent_type" className="text-sm font-medium text-slate-700">대리인 유형</label>
                <select
                  id="agent_type"
                  value={form.agent_type}
                  onChange={(e) => updateField('agent_type', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="대리인 유형 선택"
                >
                  <option value="">선택 안 함</option>
                  <option value="변호사">변호사</option>
                  <option value="법무사">법무사</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="agent_name" className="text-sm font-medium text-slate-700">대리인 이름</label>
                <input
                  id="agent_name"
                  type="text"
                  value={form.agent_name}
                  onChange={(e) => updateField('agent_name', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="agent_phone" className="text-sm font-medium text-slate-700">대리인 전화</label>
                <input
                  id="agent_phone"
                  type="tel"
                  value={form.agent_phone}
                  onChange={(e) => updateField('agent_phone', formatPhoneNumber(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="02-1234-5678"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="agent_fax" className="text-sm font-medium text-slate-700">대리인 팩스</label>
                <input
                  id="agent_fax"
                  type="tel"
                  value={form.agent_fax}
                  onChange={(e) => updateField('agent_fax', formatPhoneNumber(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="02-1234-5679"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="agent_email_addr" className="text-sm font-medium text-slate-700">대리인 이메일</label>
                <input
                  id="agent_email_addr"
                  type="email"
                  value={form.agent_email_addr}
                  onChange={(e) => updateField('agent_email_addr', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="agent@lawfirm.com"
                />
              </div>
            </div>
            <AddressFields
              prefix="agt"
              label="대리인 사무소 주소"
              value={{ address: form.agt_address, detail: form.agt_detail, postal_code: form.agt_postal_code }}
              onChange={(f, v) => updateField(f, v)}
            />
          </div>
        )}
      </section>

      {/* ═══ 6. 문서 옵션 ═══ */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">첨부 문서 옵션</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.info_request_form}
              onChange={(e) => updateField('info_request_form', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              aria-label="정보제공요청서 첨부"
            />
            정보제공요청서
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ecourt_agreement}
              onChange={(e) => updateField('ecourt_agreement', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              aria-label="전자소송 동의서 첨부"
            />
            전자소송 동의서
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.delegation_form}
              onChange={(e) => updateField('delegation_form', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              aria-label="위임장 첨부"
            />
            위임장
          </label>
        </div>
      </section>

      {/* ═══ 7. 가족 구성원 ═══ */}
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
                    onClick={() => requestDeleteFamily(idx)}
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

      {/* 가족 삭제 확인 모달 */}
      {familyDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="family-delete-title">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 id="family-delete-title" className="text-base font-semibold text-slate-800">삭제 확인</h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-red-600">{familyDeleteConfirm.name}</span>을(를) 삭제하시겠습니까?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" aria-label="취소" onClick={() => setFamilyDeleteConfirm(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">취소</button>
              <button type="button" aria-label="삭제 확인" onClick={() => removeFamilyMember(familyDeleteConfirm.index)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
