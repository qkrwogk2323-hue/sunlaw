'use client';

import { useState } from 'react';
import { ClientRosterEntryForm } from '@/components/forms/client-roster-entry-form';
import { ClientPreRegisterForm } from '@/components/forms/client-pre-register-form';
import { BulkUploadPanel } from '@/components/bulk-upload-panel';
import { bulkUploadClientsAction } from '@/lib/actions/bulk-upload-actions';

type PanelId = 'create' | 'csv' | 'invite';

const PANELS: { id: PanelId; title: string; description: string }[] = [
  {
    id: 'create',
    title: '의뢰인 추가',
    description: '웹에서 바로 의뢰인 정보를 등록하고 목록에 올립니다.'
  },
  {
    id: 'csv',
    title: 'CSV 일괄 등록',
    description: '양식에 맞춘 CSV 파일로 의뢰인 정보를 한 번에 올립니다.'
  },
  {
    id: 'invite',
    title: '의뢰인 초대',
    description: '임시 계정을 직접 발급해 바로 전달해야 할 때 사용합니다.'
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
  cases
}: {
  organizationId: string;
  cases: CaseOption[];
}) {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

  function togglePanel(id: PanelId) {
    setActivePanel((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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

      {activePanel && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {activePanel === 'create' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">한 명씩 바로 등록해 목록과 상세 화면에서 이어서 관리합니다.</p>
              <ClientRosterEntryForm organizationId={organizationId} cases={cases} />
            </div>
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

          {activePanel === 'invite' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">임시아이디와 비밀번호를 직접 전달해야 하는 경우에 사용합니다.</p>
              <ClientPreRegisterForm organizationId={organizationId} cases={cases} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
