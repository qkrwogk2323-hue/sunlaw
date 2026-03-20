'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Users, Eye, Building2, UserCheck } from 'lucide-react';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { createCaseHubAction } from '@/lib/actions/case-hub-actions';

interface CaseClient {
  id: string;
  name: string;
  profileId: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  organizationId: string;
  clients?: CaseClient[];
}

export function CaseHubCreateSheet({ open, onClose, caseId, caseTitle, organizationId, clients = [] }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [collaboratorLimit, setCollaboratorLimit] = useState(5);
  const [viewerLimit, setViewerLimit] = useState(12);
  const [selectedClientProfileId, setSelectedClientProfileId] = useState<string>('');
  const effectiveSelectedClientProfileId = selectedClientProfileId || (clients.length === 1 ? clients[0]?.profileId ?? '' : '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-labelledby="hub-create-title"
      aria-describedby="hub-create-desc"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 id="hub-create-title" className="text-lg font-semibold text-slate-900">사건허브 생성</h2>
          <p id="hub-create-desc" className="mt-0.5 text-sm text-slate-500">사건을 중심으로 협업 로비를 만듭니다.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="허브 생성 닫기"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <ClientActionForm
        action={createCaseHubAction}
        successTitle="사건허브가 생성되었습니다."
        successMessage="허브 로비로 이동합니다."
        errorTitle="허브 생성에 실패했습니다."
        errorCause="입력 정보를 확인하거나 잠시 후 다시 시도해 주세요."
        className="space-y-5 px-6 py-6"
      >
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="primaryClientProfileId" value={effectiveSelectedClientProfileId} />

        {/* 사건 확인 */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">사건</p>
          <p className="mt-1 font-semibold text-slate-900">{caseTitle}</p>
        </div>

        {/* 대표 의뢰인 */}
        {clients.length > 1 && (
          <div>
            <label htmlFor="hub-primary-client" className="mb-1.5 block text-sm font-medium text-slate-700">
              <span className="text-red-500" aria-hidden="true">*</span> 대표 의뢰인
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select
                id="hub-primary-client"
                value={selectedClientProfileId}
                onChange={(e) => setSelectedClientProfileId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                aria-label="대표 의뢰인 선택"
              >
                <option value="">의뢰인 선택</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.profileId ?? ''} disabled={!c.profileId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {clients.length === 1 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">대표 의뢰인 (자동)</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <UserCheck className="size-4 text-emerald-600" aria-hidden="true" />
              <span className="text-sm font-medium text-emerald-800">{clients[0].name}</span>
            </div>
          </div>
        )}

        {/* 협업 인원 수 */}
        <div>
          <label htmlFor="hub-collaborator-limit" className="mb-1.5 block text-sm font-medium text-slate-700">
            <span className="text-red-500" aria-hidden="true">*</span> 협업 인원 상한
            <span className="ml-2 font-normal text-slate-400">(편집·업무 수행 가능)</span>
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="hub-collaborator-limit"
              name="collaboratorLimit"
              type="number"
              min={1}
              max={50}
              value={collaboratorLimit}
              onChange={(e) => setCollaboratorLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              aria-label="협업 인원 상한 입력"
            />
          </div>
        </div>

        {/* 열람 인원 수 */}
        <div>
          <label htmlFor="hub-viewer-limit" className="mb-1.5 block text-sm font-medium text-slate-700">
            <span className="text-red-500" aria-hidden="true">*</span> 열람 인원 상한
            <span className="ml-2 font-normal text-slate-400">(읽기 전용 포함)</span>
          </label>
          <div className="relative">
            <Eye className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="hub-viewer-limit"
              name="viewerLimit"
              type="number"
              min={1}
              max={100}
              value={viewerLimit}
              onChange={(e) => setViewerLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              aria-label="열람 인원 상한 입력"
            />
          </div>
        </div>

        {/* 선택: 허브 표시명 */}
        <div>
          <label htmlFor="hub-title" className="mb-1.5 block text-sm font-medium text-slate-700">
            허브 표시명 <span className="font-normal text-slate-400">(선택)</span>
          </label>
          <input
            id="hub-title"
            name="title"
            type="text"
            maxLength={100}
            placeholder="입력하지 않으면 사건명으로 표시"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            aria-label="허브 표시명 입력 (선택)"
          />
        </div>

        {/* 공개 범위 */}
        <div>
          <label htmlFor="hub-visibility" className="mb-1.5 block text-sm font-medium text-slate-700">
            <span className="text-red-500" aria-hidden="true">*</span> 기본 공개 범위
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <select
              id="hub-visibility"
              name="visibilityScope"
              defaultValue="organization"
              required
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              aria-label="기본 공개 범위 선택"
            >
              <option value="organization">조직 전체</option>
              <option value="private">초대된 참여자만</option>
              <option value="custom">사용자 지정</option>
            </select>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            취소
          </button>
          <SubmitButton
            pendingLabel="생성 중..."
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            허브 생성
          </SubmitButton>
        </div>
      </ClientActionForm>
    </dialog>
  );
}
