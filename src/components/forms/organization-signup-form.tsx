"use client";

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { submitOrganizationSignupRequestAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

const maxOrganizationSignupDocumentSize = 10 * 1024 * 1024;
const allowedDocumentMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);

const moduleOptions = [
  { key: 'client_portal', label: '의뢰인 포털' },
  { key: 'collections', label: '추심 운영' },
  { key: 'reports', label: '성과 리포트' }
] as const;

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

export function OrganizationSignupForm() {
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedDocumentSummary, setSelectedDocumentSummary] = useState<string | null>(null);

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
    <form action={submitOrganizationSignupRequestAction} className="grid gap-3 md:grid-cols-2">
      <Input name="name" placeholder="조직명" required />
      <select name="kind" defaultValue="law_firm" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="law_firm">법률사무소/법무법인</option>
        <option value="collection_company">추심회사</option>
        <option value="mixed_practice">혼합형 조직</option>
        <option value="corporate_legal_team">기업 법무팀</option>
        <option value="other">기타</option>
      </select>
      <Input name="businessNumber" placeholder="사업자등록번호 (예: 123-45-67890)" required />
      <Input name="representativeName" placeholder="대표자명" />
      <Input name="representativeTitle" placeholder="대표자 직함" />
      <Input name="email" placeholder="대표 이메일" type="email" />
      <Input name="phone" placeholder="대표 전화번호" />
      <Input name="websiteUrl" placeholder="웹사이트 URL" />
      <Input name="addressLine1" placeholder="주소" className="md:col-span-2" />
      <Input name="addressLine2" placeholder="상세주소" className="md:col-span-2" />
      <Input name="postalCode" placeholder="우편번호" />
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">사업자등록증 업로드</p>
        <input
          name="businessRegistrationDocument"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          required
          onChange={handleDocumentChange}
          aria-invalid={documentError ? 'true' : 'false'}
          className={`block w-full rounded-lg border border-dashed bg-white px-3 py-3 text-sm shadow-sm outline-none transition ${documentError ? 'border-rose-300 text-rose-700 focus:border-rose-500' : 'border-slate-300 text-slate-600 focus:border-slate-900'}`}
        />
        {selectedDocumentSummary ? <p className="text-xs font-medium text-emerald-700">선택한 파일: {selectedDocumentSummary}</p> : null}
        {documentError ? <p className="text-xs font-medium text-rose-600" role="alert">{documentError}</p> : null}
        <p className="text-xs leading-6 text-slate-500">
          PDF, PNG, JPG 파일만 업로드할 수 있으며 파일 크기는 10MB 이하여야 합니다. 파일을 선택하면 제출 전에 형식과 용량을 먼저 확인합니다.
        </p>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">요청 모듈</p>
        <div className="grid gap-2 md:grid-cols-3">
          {moduleOptions.map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="requestedModules" value={option.key} defaultChecked={option.key === 'client_portal'} className="size-4 rounded border-slate-300" />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <Textarea name="note" placeholder="검토 메모 또는 온보딩 요청사항" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="신청 중..." disabled={Boolean(documentError)}>조직 개설 신청</SubmitButton>
      </div>
    </form>
  );
}
