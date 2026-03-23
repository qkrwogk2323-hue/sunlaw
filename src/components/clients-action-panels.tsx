'use client';

import { useState } from 'react';
import { ClientStructuredInviteForm } from '@/components/forms/client-structured-invite-form';
import { ClientPreRegisterForm } from '@/components/forms/client-pre-register-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { BulkUploadPanel } from '@/components/bulk-upload-panel';
import { bulkUploadClientsAction } from '@/lib/actions/bulk-upload-actions';

type PanelId = 'invite' | 'csv' | 'preregister' | 'resend';

const PANELS: { id: PanelId; title: string; description: string }[] = [
  {
    id: 'invite',
    title: '기존의뢰인초대',
    description: '의뢰인 초대 링크를 만들거나 CSV로 여러 명을 한 번에 준비합니다.'
  },
  {
    id: 'csv',
    title: 'CSV 일괄 등록',
    description: '양식에 맞춘 CSV 파일로 의뢰인 정보를 한 번에 올립니다.'
  },
  {
    id: 'preregister',
    title: '임시 계정 직접 발급',
    description: '예외적으로 직접 계정을 만들어 바로 전달해야 할 때 사용합니다.'
  },
  {
    id: 'resend',
    title: '초대 링크 재발송',
    description: '이미 만든 초대 링크를 다시 전달해야 할 때 이 목록에서 재발송합니다.'
  }
];

type RosterItem = {
  id: string;
  name: string;
  email?: string | null;
  source?: string | null;
  invitationId?: string | null;
};

type CaseOption = { id: string; title: string; referenceNo?: string | null };

export function ClientsActionPanels({
  organizationId,
  cases,
  roster
}: {
  organizationId: string;
  cases: CaseOption[];
  roster: RosterItem[];
}) {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

  function togglePanel(id: PanelId) {
    setActivePanel((prev) => (prev === id ? null : id));
  }

  const resendItems = roster.filter((item) => item.source === 'invite' && item.invitationId);

  return (
    <div>
      {/* 4개 카드 — 가로 한 줄 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PANELS.map((panel) => {
          const isOpen = activePanel === panel.id;
          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => togglePanel(panel.id)}
              aria-expanded={isOpen}
              aria-label={panel.title}
              className={`group rounded-2xl border p-4 text-left transition-all duration-150 ${
                isOpen
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <p className={`font-semibold text-sm ${isOpen ? 'text-blue-900' : 'text-slate-900'}`}>
                {panel.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{panel.description}</p>
              <span
                className={`mt-3 inline-flex h-6 w-6 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                  isOpen
                    ? 'border-blue-200 bg-blue-100 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 group-hover:border-slate-300'
                }`}
              >
                {isOpen ? '−' : '+'}
              </span>
            </button>
          );
        })}
      </div>

      {/* 열린 패널 — 카드 아래 자연스럽게 펼침 */}
      {activePanel && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {activePanel === 'invite' && (
            <ClientStructuredInviteForm
              organizationId={organizationId}
              cases={cases}
            />
          )}

          {activePanel === 'csv' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">대량 등록은 CSV 양식에 맞춰 올려 주세요. 명수 제한 없이 불러올 수 있습니다.</p>
              <BulkUploadPanel
                mode="clients"
                organizationId={organizationId}
                action={bulkUploadClientsAction}
              />
            </div>
          )}

          {activePanel === 'preregister' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">비밀번호 직접 전달이 필요한 예외 상황에서만 사용합니다.</p>
              <ClientPreRegisterForm organizationId={organizationId} cases={cases} />
            </div>
          )}

          {activePanel === 'resend' && (
            <div className="space-y-2">
              {resendItems.length ? (
                resendItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-slate-500">{item.email ?? '-'}</p>
                    </div>
                    <ResendInvitationForm invitationId={item.invitationId!} compact />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">재발송 가능한 초대가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
