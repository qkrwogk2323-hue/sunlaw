'use client';

import { useState } from 'react';
import { StaffBulkInviteForm } from '@/components/forms/staff-bulk-invite-form';
import { StaffPreRegisterForm } from '@/components/forms/staff-pre-register-form';

type WorkbenchTab = 'invite' | 'preregister' | null;

export function InviteWorkbench({ organizationId }: { organizationId: string }) {
  const [tab, setTab] = useState<WorkbenchTab>('invite');

  function toggle(target: Exclude<WorkbenchTab, null>) {
    setTab((prev) => (prev === target ? null : target));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => toggle('invite')}
          aria-expanded={tab === 'invite'}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            tab === 'invite'
              ? 'bg-sky-50 text-sky-800 border-b-2 border-sky-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          구성원 초대하기
        </button>
        <div className="w-px bg-slate-100" />
        <button
          type="button"
          onClick={() => toggle('preregister')}
          aria-expanded={tab === 'preregister'}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            tab === 'preregister'
              ? 'bg-amber-50 text-amber-800 border-b-2 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          임시 계정 발급
        </button>
      </div>

      {tab === 'invite' ? (
        <div className="p-4">
          <p className="mb-3 text-xs text-slate-500">새 구성원에게 초대 링크를 발송합니다. 이메일을 통해 가입 절차를 진행합니다.</p>
          <StaffBulkInviteForm organizationId={organizationId} />
        </div>
      ) : tab === 'preregister' ? (
        <div className="p-4">
          <p className="mb-3 text-xs text-amber-700 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            ⚠️ 임시 계정은 예외 상황에서만 사용하세요. 발급 즉시 아이디/비밀번호가 표시되며, 해당 화면을 벗어나면 다시 볼 수 없습니다.
          </p>
          <StaffPreRegisterForm organizationId={organizationId} />
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-slate-400">
          위 탭을 선택해서 구성원을 초대하거나 임시 계정을 발급하세요.
        </div>
      )}
    </div>
  );
}
