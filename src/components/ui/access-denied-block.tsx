'use client';

import { ShieldAlert } from 'lucide-react';
import { InlineErrorMessage } from '@/components/ui/inline-error';

export function AccessDeniedBlock({
  blocked = '요청한 화면 접근이 차단되었습니다.',
  cause = '현재 조직 또는 현재 계정 권한으로는 이 화면을 열 수 없습니다.',
  resolution = '권한을 가진 관리자에게 접근 승인을 요청하거나, 관리자 계정으로 전환해 주세요.'
}: {
  blocked?: string;
  cause?: string;
  resolution?: string;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
        <ShieldAlert className="size-4" />
        접근 차단 안내
      </div>
      <InlineErrorMessage
        title={blocked}
        cause={cause}
        resolution={resolution}
      />
    </div>
  );
}
