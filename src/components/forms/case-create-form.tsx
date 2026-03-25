'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { createCaseAction } from '@/lib/actions/case-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { encodeGuardFeedback } from '@/lib/guard-feedback';

type ParsedIntake = {
  title?: string;
  caseNumber?: string;
  courtName?: string;
  openedOn?: string;
  clientName?: string;
  clientRole?: string;
  opponentName?: string;
  opponentRole?: string;
  summary?: string;
};

export function CaseCreateForm({
  organizations,
  defaultOrganizationId
}: {
  organizations: Array<{ id: string; name: string }>;
  defaultOrganizationId?: string | null;
}) {
  const [isParsing, startParsing] = useTransition();
  const [parseError, setParseError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const intakeFileRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const openedOnRef = useRef<HTMLInputElement | null>(null);
  const [fields, setFields] = useState<Required<ParsedIntake>>({
    title: '',
    caseNumber: '',
    courtName: '',
    openedOn: '',
    clientName: '',
    clientRole: '',
    opponentName: '',
    opponentRole: '',
    summary: ''
  });

  const defaultOrganization = useMemo(
    () => defaultOrganizationId ?? organizations[0]?.id ?? '',
    [defaultOrganizationId, organizations]
  );

  const guardedAction = useCallback(async (formData: FormData) => {
    const title = (formData.get('title') as string ?? '').trim();
    const openedOn = (formData.get('openedOn') as string ?? '').trim();

    // 필수 항목 순서대로 체크 — 첫 번째 미입력 필드로 포커스 이동
    if (title.length < 2) {
      titleRef.current?.focus();
      throw new Error(encodeGuardFeedback({
        type: 'validation_failed',
        code: 'CASE_CREATE_TITLE_TOO_SHORT',
        blocked: '사건명을 입력해 주세요.',
        cause: '사건명은 2자 이상 입력해야 합니다.',
        resolution: '위 "사건명" 입력란을 채우고 다시 시도해 주세요.'
      }));
    }

    if (!openedOn) {
      openedOnRef.current?.focus();
      throw new Error(encodeGuardFeedback({
        type: 'validation_failed',
        code: 'CASE_CREATE_OPENED_ON_REQUIRED',
        blocked: '개시일을 입력해 주세요.',
        cause: '개시일은 필수 항목입니다.',
        resolution: '위 "개시일" 날짜 입력란을 채우고 다시 시도해 주세요.'
      }));
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(openedOn)) {
      openedOnRef.current?.focus();
      throw new Error(encodeGuardFeedback({
        type: 'validation_failed',
        code: 'CASE_CREATE_OPENED_ON_FORMAT',
        blocked: '개시일 형식이 올바르지 않습니다.',
        cause: `날짜 형식이 맞지 않습니다. (입력값: ${openedOn})`,
        resolution: 'YYYY-MM-DD 형식으로 입력해 주세요.'
      }));
    }

    const result = await createCaseAction(formData);
    if (result && !result.ok) {
      throw new Error(encodeGuardFeedback({
        type: 'condition_failed',
        code: result.code,
        blocked: result.message,
        cause: result.message,
        resolution: result.resolution
      }));
    }
  }, []);

  if (!organizations.length) {
    return <p className="text-sm text-slate-500">사건을 생성하려면 먼저 조직에 속해야 합니다.</p>;
  }

  function patchFields(payload: ParsedIntake) {
    setFields((prev) => ({
      ...prev,
      title: payload.title ?? prev.title,
      caseNumber: payload.caseNumber ?? prev.caseNumber,
      courtName: payload.courtName ?? prev.courtName,
      openedOn: payload.openedOn ?? prev.openedOn,
      clientName: payload.clientName ?? prev.clientName,
      clientRole: payload.clientRole ?? prev.clientRole,
      opponentName: payload.opponentName ?? prev.opponentName,
      opponentRole: payload.opponentRole ?? prev.opponentRole,
      summary: payload.summary ?? prev.summary
    }));
  }

  async function handleParseFile() {
    const file = intakeFileRef.current?.files?.[0];
    if (!file || !file.size) {
      setParseError('문서 또는 이미지 파일을 먼저 선택해 주세요.');
      return;
    }

    setParseError('');
    setUploadedFileName(file.name);
    const payload = new FormData();
    payload.append('intakeFile', file);

    startParsing(async () => {
      try {
        const response = await fetch('/api/cases/intake-parse', {
          method: 'POST',
          body: payload
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json?.ok) {
          setParseError(json?.error ?? '자동입력에 실패했습니다. 수기로 입력해 주세요.');
          return;
        }

        patchFields(json.data ?? {});
      } catch (error) {
        setParseError(error instanceof Error ? error.message : '원인: 자동입력 응답을 처리하지 못했습니다. 해결 방법: 파일 형식을 확인하고 다시 시도해 주세요.');
      }
    });
  }

  return (
    <ClientActionForm
      action={guardedAction}
      successTitle="사건이 등록되었습니다."
      errorTitle="사건 등록에 실패했습니다."
      errorCause="사건명(2자 이상)과 개시일을 확인해 주세요."
      errorResolution="필수 항목을 모두 입력하고 다시 시도해 주세요."
      className="space-y-4"
    >
      <input type="hidden" name="organizationId" value={defaultOrganization} />
      <input type="hidden" name="principalAmount" value="0" />
      <input type="hidden" name="specialNote" value="" />

      <p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>

      {/* 필수 항목 먼저 */}
      <div className="space-y-1">
        <label htmlFor="case-title" className="text-sm font-medium text-slate-700">
          사건명 <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <Input
          ref={titleRef}
          id="case-title"
          name="title"
          value={fields.title}
          onChange={(e) => setFields((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="예: 홍길동 vs 김철수 손해배상"
          required
          aria-required="true"
          minLength={2}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="case-type" className="text-sm font-medium text-slate-700">
            사건 유형 <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="case-type"
            name="caseType"
            defaultValue="civil"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="사건 유형"
          >
            <option value="civil">민사</option>
            <option value="debt_collection">채권추심</option>
            <option value="execution">민사집행</option>
            <option value="injunction">가처분·보전</option>
            <option value="criminal">형사</option>
            <option value="advisory">자문</option>
            <option value="other">기타</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="opened-on" className="text-sm font-medium text-slate-700">
            개시일 <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <Input
            ref={openedOnRef}
            id="opened-on"
            name="openedOn"
            type="date"
            value={fields.openedOn}
            onChange={(e) => setFields((prev) => ({ ...prev, openedOn: e.target.value }))}
            required
            aria-required="true"
          />
        </div>
      </div>

      {/* 선택 항목 */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <Input
            name="clientName"
            value={fields.clientName}
            onChange={(e) => setFields((prev) => ({ ...prev, clientName: e.target.value }))}
            placeholder="의뢰인"
          />
          <Input
            name="clientRole"
            value={fields.clientRole}
            onChange={(e) => setFields((prev) => ({ ...prev, clientRole: e.target.value }))}
            placeholder="의뢰인 지위"
          />
          <Input
            name="courtName"
            value={fields.courtName}
            onChange={(e) => setFields((prev) => ({ ...prev, courtName: e.target.value }))}
            placeholder="법원"
          />
        </div>
        <div className="space-y-3">
          <Input
            name="opponentName"
            value={fields.opponentName}
            onChange={(e) => setFields((prev) => ({ ...prev, opponentName: e.target.value }))}
            placeholder="상대방"
          />
          <Input
            name="opponentRole"
            value={fields.opponentRole}
            onChange={(e) => setFields((prev) => ({ ...prev, opponentRole: e.target.value }))}
            placeholder="상대방 지위"
          />
          <Input
            name="caseNumber"
            value={fields.caseNumber}
            onChange={(e) => setFields((prev) => ({ ...prev, caseNumber: e.target.value }))}
            placeholder="사건번호"
          />
        </div>
      </div>

      <Textarea
        name="summary"
        value={fields.summary}
        onChange={(e) => setFields((prev) => ({ ...prev, summary: e.target.value }))}
        placeholder="사건개요"
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">사건 문서 업로드</p>
          <span className="text-xs text-slate-500">이미지/PDF 파일에서 사건 정보 자동입력</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={intakeFileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium"
          />
          <button
            type="button"
            onClick={() => { void handleParseFile(); }}
            disabled={isParsing}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-sky-200 bg-white px-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isParsing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            AI 자동입력
          </button>
        </div>
        {uploadedFileName ? <p className="mt-2 text-xs text-slate-500">선택 파일: {uploadedFileName}</p> : null}
        {parseError ? <p className="mt-2 text-xs font-medium text-rose-600">{parseError}</p> : null}
      </div>

      <SubmitButton pendingLabel="생성 중...">생성하기</SubmitButton>
    </ClientActionForm>
  );
}
