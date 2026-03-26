'use client';

import { useState, createContext, useContext, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

const DeleteModeContext = createContext(false);

export function useDeleteMode() {
  return useContext(DeleteModeContext);
}

export function CaseDeleteToggle({ children }: { children: ReactNode }) {
  const [deleteMode, setDeleteMode] = useState(false);

  return (
    <DeleteModeContext value={deleteMode}>
      <div className="contents">
        {children}
      </div>
      <button
        type="button"
        onClick={() => setDeleteMode((prev) => !prev)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
          deleteMode
            ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
        }`}
        aria-label={deleteMode ? '삭제 모드 해제' : '삭제 모드 활성화'}
        aria-pressed={deleteMode}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        {deleteMode ? '삭제 취소' : '삭제'}
      </button>
    </DeleteModeContext>
  );
}

export function DeleteModeGuard({ children }: { children: ReactNode }) {
  const deleteMode = useDeleteMode();
  if (!deleteMode) return null;
  return <>{children}</>;
}
