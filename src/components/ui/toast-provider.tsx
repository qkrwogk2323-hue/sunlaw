'use client';

/**
 * Toast System — UX 체크리스트 5·6·8·10번 구현
 * SuccessToast / ErrorToast / WarningToast / InfoToast / UndoToast
 * 모든 토스트: 액션 버튼 포함, 자동 닫힘, ARIA live region
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'undo';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  /** ms — default: 5000 (error: 8000, undo: 6000) */
  duration?: number;
};

type ToastContextType = {
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) => string;
  error: (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) => string;
  warning: (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) => string;
  info: (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) => string;
  undo: (
    title: string,
    undoFn: () => void,
    opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title' | 'action'>>
  ) => string;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const success = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'success', title, ...opts }),
    [addToast]
  );

  const error = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'error', title, duration: 8000, ...opts }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'warning', title, ...opts }),
    [addToast]
  );

  const info = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'info', title, ...opts }),
    [addToast]
  );

  const undo = useCallback(
    (
      title: string,
      undoFn: () => void,
      opts?: Partial<Omit<ToastItem, 'id' | 'type' | 'title' | 'action'>>
    ) =>
      addToast({
        type: 'undo',
        title,
        action: { label: '실행 취소', onClick: undoFn },
        duration: 6000,
        ...opts,
      }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info, undo }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast는 <ToastProvider> 안에서만 사용할 수 있습니다.');
  return ctx;
}

// ── Toast Item ────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />,
  error: <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" aria-hidden />,
  warning: <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />,
  info: <Info className="mt-0.5 size-5 shrink-0 text-blue-500" aria-hidden />,
  undo: <RotateCcw className="mt-0.5 size-5 shrink-0 text-slate-500" aria-hidden />,
};

const BORDER_CLASSES: Record<ToastType, string> = {
  success: 'border-emerald-200',
  error: 'border-red-200',
  warning: 'border-amber-200',
  info: 'border-blue-200',
  undo: 'border-slate-200',
};

function ToastItemComponent({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, duration, onRemove]);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'vs-toast flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white p-4',
        'shadow-[0_8px_24px_rgba(15,23,42,0.14)]',
        BORDER_CLASSES[toast.type]
      )}
    >
      {ICONS[toast.type]}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.message ? (
          <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{toast.message}</p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick();
              onRemove(toast.id);
            }}
            className="mt-2 text-sm font-semibold text-sky-600 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="알림 닫기"
        className="ml-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div
      aria-label="시스템 알림 목록"
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItemComponent toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
