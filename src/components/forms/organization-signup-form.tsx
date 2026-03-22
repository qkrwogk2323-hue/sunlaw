"use client";

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { submitOrganizationSignupRequestAction, updateOrganizationSignupRequestAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

const maxOrganizationSignupDocumentSize = 10 * 1024 * 1024;
const allowedDocumentMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);

type AllowedOrganizationSignupDocumentType = 'application/pdf' | 'image/png' | 'image/jpeg';

function detectOrganizationSignupDocumentType(fileBytes: Uint8Array): AllowedOrganizationSignupDocumentType | null {
  if (
    fileBytes.length >= 8
    && fileBytes[0] === 0x89
    && fileBytes[1] === 0x50
    && fileBytes[2] === 0x4e
    && fileBytes[3] === 0x47
    && fileBytes[4] === 0x0d
    && fileBytes[5] === 0x0a
    && fileBytes[6] === 0x1a
    && fileBytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (fileBytes.length >= 3 && fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    fileBytes.length >= 5
    && fileBytes[0] === 0x25
    && fileBytes[1] === 0x50
    && fileBytes[2] === 0x44
    && fileBytes[3] === 0x46
    && fileBytes[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  return null;
}

function formatDocumentSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function getAllowedExtensionsByType(type: AllowedOrganizationSignupDocumentType) {
  if (type === 'application/pdf') {
    return new Set(['pdf']);
  }

  if (type === 'image/png') {
    return new Set(['png']);
  }

  return new Set(['jpg', 'jpeg']);
}

async function validateSelectedOrganizationSignupDocument(file: File) {
  if (file.size <= 0) {
    return '사업자등록증 파일을 업로드해 주세요.';
  }

  if (file.size > maxOrganizationSignupDocumentSize) {
    return '사업자등록증 파일은 10MB 이하만 업로드할 수 있습니다.';
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedType = detectOrganizationSignupDocumentType(signature);
  if (!detectedType) {
    return '실제 파일 형식을 확인할 수 없습니다. PDF, PNG, JPG 파일만 업로드해 주세요.';
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!getAllowedExtensionsByType(detectedType).has(extension)) {
    return '파일 확장자와 실제 파일 형식이 일치하지 않습니다. 파일을 다시 확인해 주세요.';
  }

  const mimeType = file.type.toLowerCase();
  if (mimeType && (!allowedDocumentMimeTypes.has(mimeType) || mimeType !== detectedType)) {
    return '파일 정보와 실제 파일 형식이 일치하지 않습니다. 다른 파일로 다시 시도해 주세요.';
  }

  return null;
}

export function OrganizationSignupForm({
  requestId,
  defaultValues,
  existingDocumentName
}: {
  requestId?: string;
  defaultValues?: {
    name?: string | null;
    kind?: string | null;
    organizationIndustry?: string | null;
    businessNumber?: string | null;
    representativeName?: string | null;
    representativeTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    note?: string | null;
  };
  existingDocumentName?: string | null;
}) {
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedDocumentSummary, setSelectedDocumentSummary] = useState<string | null>(existingDocumentName ?? null);
  const isEditMode = Boolean(requestId);
  const [organizationKind, setOrganizationKind] = useState(defaultValues?.kind ?? 'law_firm');
  const showIndustryInput = organizationKind === 'law_firm' || organizationKind === 'collection_company' || organizationKind === 'other';
  const formAction = isEditMode ? updateOrganizationSignupRequestAction : submitOrganizationSignupRequestAction;

  const handleDocumentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;

    if (!file) {
      setDocumentError(null);
      setSelectedDocumentSummary(null);
      return;
    }

    const error = await validateSelectedOrganizationSignupDocument(file);
    if (error) {
      input.value = '';
      setSelectedDocumentSummary(null);
      setDocumentError(error);
      return;
    }

    setDocumentError(null);
    setSelectedDocumentSummary(`${file.name} · ${formatDocumentSize(file.size)}`);
  };

  return (
    <ClientActionForm
      action={formAction}
      successTitle={isEditMode ? '조직 개설 신청 수정 완료' : '조직 개설 신청 완료'}
      errorTitle="조직 개설 신청에 실패했습니다."
      errorCause={isEditMode ? '조직 개설 신청 수정 정보를 저장하지 못했습니다.' : '조직 개설 신청 정보를 접수하지 못했습니다.'}
      errorResolution="입력값과 첨부 파일 형식을 확인한 뒤 다시 제출해 주세요."
      className="grid gap-3 md:grid-cols-2"
    >
      {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="text-rose-500 font-medium">*</span> 필수 항목입니다. 사업자등록번호는 숫자 10자리 체크섬 검증을 통과해야 하며, 사업자등록증 파일(PDF/PNG/JPG, 10MB 이하)은 반드시 첨부해야 합니다.
      </div>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">조직명 <span className="text-rose-500">*</span></span>
        <Input name="name" placeholder="법무법인 홍길동" defaultValue={defaultValues?.name ?? ''} required />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">조직 유형 <span className="text-rose-500">*</span></span>
        <select
          name="kind"
          value={organizationKind}
          onChange={(event) => setOrganizationKind(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
        >
          <option value="law_firm">법률사무소/법무법인</option>
          <option value="collection_company">신용정보회사</option>
          <option value="mixed_practice">혼합형 조직</option>
          <option value="corporate_legal_team">기업 법무팀</option>
          <option value="other">기타</option>
        </select>
      </label>
      {showIndustryInput ? (
        <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
          <span className="font-medium text-slate-900">업종 상세 <span className="text-rose-500">*</span></span>
          <Input
            name="organizationIndustry"
            placeholder="예: 민사/형사 소송, 채권관리, 기타 업종"
            defaultValue={defaultValues?.organizationIndustry ?? ''}
            required
          />
        </label>
      ) : (
        <input type="hidden" name="organizationIndustry" value={defaultValues?.organizationIndustry ?? ''} />
      )}
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">사업자등록번호 <span className="text-rose-500">*</span></span>
        <Input name="businessNumber" placeholder="123-45-67890 (숫자 10자리)" defaultValue={defaultValues?.businessNumber ?? ''} required />
        <p className="text-xs text-slate-400">하이픈 포함 또는 제외 모두 입력 가능. 체크섬 자동 검증.</p>
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표자명</span>
        <Input name="representativeName" placeholder="홍길동" defaultValue={defaultValues?.representativeName ?? ''} />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표자 직함</span>
        <Input name="representativeTitle" placeholder="대표 변호사" defaultValue={defaultValues?.representativeTitle ?? ''} />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표 이메일</span>
        <Input name="email" placeholder="contact@example.com" type="email" defaultValue={defaultValues?.email ?? ''} />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표 전화번호</span>
        <Input name="phone" placeholder="02-1234-5678" defaultValue={defaultValues?.phone ?? ''} />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">웹사이트 URL</span>
        <Input name="websiteUrl" placeholder="https://example.com" type="url" defaultValue={defaultValues?.websiteUrl ?? ''} />
        <p className="text-xs text-slate-400">https:// 포함한 전체 주소 (입력 시 검증)</p>
      </label>
      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
        <span className="font-medium text-slate-900">주소</span>
        <Input name="addressLine1" placeholder="서울시 강남구 테헤란로 123" />
      </label>
      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
        <span className="font-medium text-slate-900">상세주소</span>
        <Input name="addressLine2" placeholder="10층 1001호" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">우편번호</span>
        <Input name="postalCode" placeholder="06234" />
      </label>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">사업자등록증 업로드 {!isEditMode ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-500">(수정 시 생략 가능)</span>}</p>
        <input
          name="businessRegistrationDocument"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          required={!isEditMode}
          onChange={handleDocumentChange}
          aria-invalid={documentError ? 'true' : 'false'}
          className={`block w-full rounded-lg border border-dashed bg-white px-3 py-3 text-sm shadow-sm outline-none transition ${documentError ? 'border-rose-300 text-rose-700 focus:border-rose-500' : 'border-slate-300 text-slate-600 focus:border-slate-900'}`}
        />
        {selectedDocumentSummary ? <p className="text-xs font-medium text-emerald-700">{isEditMode ? '현재 또는 새로 선택한 파일' : '선택한 파일'}: {selectedDocumentSummary}</p> : null}
        {documentError ? <p className="text-xs font-medium text-rose-600" role="alert">{documentError}</p> : null}
        <p className="text-xs leading-6 text-slate-500">
          PDF, PNG, JPG 파일만 업로드할 수 있으며 파일 크기는 10MB 이하여야 합니다. {isEditMode ? '새 파일을 올리지 않으면 기존 제출 문서를 그대로 유지합니다.' : '파일을 선택하면 제출 전에 형식과 용량을 먼저 확인합니다.'}
        </p>
      </div>
      <Textarea name="note" placeholder="검토 메모 또는 초기 설정 요청사항" defaultValue={defaultValues?.note ?? ''} className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel={isEditMode ? '수정 중...' : '신청 중...'} disabled={Boolean(documentError)}>{isEditMode ? '신청 내용 수정' : '조직 개설 신청'}</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
