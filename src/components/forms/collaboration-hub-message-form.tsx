'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { postCollaborationHubMessageAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type CaseOption = {
  id: string;
  title: string;
  referenceNo?: string | null;
};

const MAX_FILE_SIZE_MB = 15;

export function CollaborationHubMessageForm({
  hubId,
  organizationId,
  returnPath,
  cases
}: {
  hubId: string;
  organizationId: string;
  returnPath?: string;
  cases: CaseOption[];
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const syncFileName = (file?: File | null) => {
    setSelectedFileName(file?.name ?? '');
  };

  return (
    <ClientActionForm action={postCollaborationHubMessageAction} successTitle="메시지가 전송되었습니다." className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">허브 메시지</label>
        <Textarea name="body" className="min-h-36" placeholder="상대 조직과 공유할 진행 메모, 회의 안건, 요청 사항을 남겨 주세요. 문서만 공유할 때는 비워도 됩니다." />
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">공유 문서 제목</label>
          <Input name="documentTitle" placeholder="예: 협업 회의 자료 / 의견서 초안" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">연결 사건</label>
          <select name="caseId" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
            <option value="">사건 연결 없이 메시지 보내기</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>{item.title}{item.referenceNo ? ` · ${item.referenceNo}` : ''}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">공유 문서 업로드</label>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (!file || !fileInputRef.current) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            fileInputRef.current.files = transfer.files;
            syncFileName(file);
          }}
          className={`rounded-2xl border border-dashed p-4 text-center transition ${dragActive ? 'border-sky-400 bg-sky-50' : 'border-slate-300 bg-slate-50/70'}`}
        >
          <Upload className="mx-auto size-5 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-900">파일을 끌어다 두면 여기에 업로드하세요.</p>
          <p className="mt-1 text-xs text-slate-500">15MB 이하 파일만 올릴 수 있습니다.</p>
          <input
            ref={fileInputRef}
            type="file"
            name="documentFile"
            className="sr-only"
            onChange={(event) => syncFileName(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            파일 선택
          </button>
          {selectedFileName ? (
            <p className="mt-3 text-xs font-medium text-sky-700">{selectedFileName}</p>
          ) : null}
        </div>
      </div>
      <SubmitButton pendingLabel="전송 중...">메시지 보내기</SubmitButton>
    </ClientActionForm>
  );
}
