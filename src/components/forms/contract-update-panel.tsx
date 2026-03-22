'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast-provider';
import { registerContractPacketAction } from '@/lib/actions/case-actions';

type CaseClientOption = {
  id: string;
  name: string;
};

type CaseOption = {
  id: string;
  title: string;
  clients: CaseClientOption[];
};

type ScanResult = {
  title: string;
  documentTitle: string;
  agreementType: 'retainer' | 'flat_fee' | 'success_fee' | 'expense_reimbursement' | 'installment_plan' | 'internal_settlement';
  summary: string;
  description: string;
  fixedAmount: string;
  rate: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const EMPTY_SCAN: ScanResult = {
  title: '',
  documentTitle: '',
  agreementType: 'retainer',
  summary: '',
  description: '',
  fixedAmount: '',
  rate: '',
  effectiveFrom: '',
  effectiveTo: ''
};

export function ContractUpdatePanel({
  cases
}: {
  cases: CaseOption[];
}) {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [scanProvider, setScanProvider] = useState('');
  const [scanPending, setScanPending] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id ?? '');
  const [sendToClient, setSendToClient] = useState(true);
  const [requestClientSignature, setRequestClientSignature] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult>(EMPTY_SCAN);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  );
  const selectedClientId = selectedCase?.clients[0]?.id ?? '';

  async function handleScan() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toastError('계약서 선택 필요', { message: '먼저 계약서 파일을 올려 주세요.' });
      return;
    }

    setScanPending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/contracts/scan', {
        method: 'POST',
        body: formData
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; data?: ScanResult; provider?: string; error?: string; notice?: string } | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        toastError('계약서 스캔 실패', { message: payload?.error ?? '잠시 후 다시 시도해 주세요.' });
        return;
      }

      setScanResult(payload.data);
      setScanProvider(payload.provider ?? '');
      success('계약서 스캔 완료', { message: payload.notice ?? '추출된 내용을 확인한 뒤 바로 등록할 수 있습니다.' });
    } catch {
      toastError('계약서 스캔 실패', { message: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.' });
    } finally {
      setScanPending(false);
    }
  }

  function resetForm() {
    setFileName('');
    setScanProvider('');
    setScanResult(EMPTY_SCAN);
    setSendToClient(true);
    setRequestClientSignature(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <ClientActionForm
      action={registerContractPacketAction}
      successTitle="계약서와 계약 정보가 등록되었습니다."
      successMessage="계약 체결 현황과 계약 목록에서 바로 확인할 수 있습니다."
      errorTitle="계약 등록에 실패했습니다."
      errorCause="계약서 저장, 계약 정보 저장, 서명 요청 생성 중 하나가 완료되지 않았습니다."
      errorResolution="입력값과 파일을 확인한 뒤 다시 시도해 주세요."
      onSuccess={resetForm}
      className="space-y-5"
    >
      <p className="text-xs text-slate-500">
        <span className="text-red-500" aria-hidden="true">*</span> 계약서를 올린 뒤 AI 스캔으로 내용을 채우고, 의뢰인에게 보낼지와 서명 방식을 함께 정합니다.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="contract-case">연결 사건</label>
            <select
              id="contract-case"
              name="caseId"
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {cases.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="contract-file">계약서 파일</label>
            <input
              ref={fileInputRef}
              id="contract-file"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={handleScan} disabled={scanPending}>
                {scanPending ? 'AI 스캔 중...' : 'AI로 내용 채우기'}
              </Button>
              <span className="text-xs text-slate-500">{fileName || '선택한 파일이 없습니다.'}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="contract-document-title">계약서 제목</label>
              <Input
                id="contract-document-title"
                name="documentTitle"
                value={scanResult.documentTitle}
                onChange={(event) => setScanResult((current) => ({ ...current, documentTitle: event.target.value }))}
                placeholder="예: 착수금 계약서"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="contract-title">계약명</label>
              <Input
                id="contract-title"
                name="title"
                value={scanResult.title}
                onChange={(event) => setScanResult((current) => ({ ...current, title: event.target.value }))}
                placeholder="예: 베인 사건 착수금 약정"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="agreement-type">계약 구분</label>
              <select
                id="agreement-type"
                name="agreementType"
                value={scanResult.agreementType}
                onChange={(event) => setScanResult((current) => ({ ...current, agreementType: event.target.value as ScanResult['agreementType'] }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="retainer">착수금</option>
                <option value="flat_fee">정액 보수</option>
                <option value="success_fee">성공보수</option>
                <option value="expense_reimbursement">실비 정산</option>
                <option value="installment_plan">분납 약정</option>
                <option value="internal_settlement">내부 정산</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="fixed-amount">고정 금액</label>
              <Input
                id="fixed-amount"
                name="fixedAmount"
                type="number"
                min="0"
                value={scanResult.fixedAmount}
                onChange={(event) => setScanResult((current) => ({ ...current, fixedAmount: event.target.value }))}
                placeholder="예: 500000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="rate">비율(%)</label>
              <Input
                id="rate"
                name="rate"
                type="number"
                min="0"
                max="100"
                value={scanResult.rate}
                onChange={(event) => setScanResult((current) => ({ ...current, rate: event.target.value }))}
                placeholder="예: 10"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="effective-from">시작일</label>
              <Input
                id="effective-from"
                name="effectiveFrom"
                type="date"
                value={scanResult.effectiveFrom}
                onChange={(event) => setScanResult((current) => ({ ...current, effectiveFrom: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="effective-to">종료일</label>
              <Input
                id="effective-to"
                name="effectiveTo"
                type="date"
                value={scanResult.effectiveTo}
                onChange={(event) => setScanResult((current) => ({ ...current, effectiveTo: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="contract-summary">계약 요약</label>
            <Textarea
              id="contract-summary"
              name="summary"
              value={scanResult.summary}
              onChange={(event) => setScanResult((current) => ({ ...current, summary: event.target.value }))}
              className="min-h-24 bg-white"
              placeholder="AI 스캔 결과나 직접 확인한 계약 요약을 적어 주세요."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="contract-description">등록 메모</label>
            <Textarea
              id="contract-description"
              name="description"
              value={scanResult.description}
              onChange={(event) => setScanResult((current) => ({ ...current, description: event.target.value }))}
              className="min-h-24 bg-white"
              placeholder="추가 메모나 약정 설명을 적어 주세요."
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="bill-to-kind">계약 대상</label>
            <select id="bill-to-kind" name="billToPartyKind" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
              <option value="case_client">의뢰인</option>
              <option value="case_organization">참여 조직</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="contract-client">의뢰인</label>
            <select
              key={selectedCaseId || 'empty-case'}
              id="contract-client"
              name="billToCaseClientId"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              defaultValue={selectedClientId}
            >
              <option value="">의뢰인 선택</option>
              {selectedCase?.clients.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <input type="hidden" name="billToCaseOrganizationId" value="" />
          <input type="hidden" name="scanProvider" value={scanProvider} />
          <input type="hidden" name="clientVisibility" value={sendToClient ? 'client_visible' : 'internal_only'} />

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="sendToClient"
              checked={sendToClient}
              onChange={(event) => setSendToClient(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>등록 후 의뢰인 화면에서도 계약서를 볼 수 있게 공유합니다.</span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="requestClientSignature"
              checked={requestClientSignature}
              onChange={(event) => setRequestClientSignature(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>의뢰인에게 계약 확인과 서명 요청을 함께 보냅니다.</span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="signature-method">동의 방법</label>
            <select id="signature-method" name="signatureMethod" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
              <option value="platform_checkbox">플랫폼 확인 체크</option>
              <option value="electronic_signature">전자서명</option>
              <option value="kakao_confirmation">카카오 확인</option>
              <option value="signed_document_upload">서명본 업로드</option>
            </select>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
            계약서를 등록하면 계약 목록에 바로 올라가고, 의뢰인에게 보낼 경우 아래 계약 체결 현황에도 동의 방법이 함께 표시됩니다.
          </div>

          <SubmitButton pendingLabel="계약 등록 중...">계약서 업데이트 등록</SubmitButton>
        </div>
      </div>
    </ClientActionForm>
  );
}
