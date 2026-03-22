'use client';

import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useVoiceTranscription } from '@/hooks/use-voice-transcription';
import { useToast } from '@/components/ui/toast-provider';

type Props = {
  onTranscript: (text: string) => void;
  /** 텍스트를 붙일 대상 textarea의 id (선택) */
  targetInputId?: string;
  className?: string;
  disabled?: boolean;
};

export function VoiceTranscriptionButton({ onTranscript, targetInputId, className = '', disabled }: Props) {
  const { error: toastError } = useToast();

  const { state, error, start, stop, reset } = useVoiceTranscription((text) => {
    onTranscript(text);
    if (targetInputId) {
      const el = document.getElementById(targetInputId) as HTMLTextAreaElement | HTMLInputElement | null;
      if (el) {
        const prev = el.value;
        el.value = prev ? `${prev}\n${text}` : text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });

  // surface errors via toast
  if (error && state === 'error') {
    toastError('음성 변환 실패', { message: error });
    reset();
  }

  const isRecording = state === 'recording';
  const isTranscribing = state === 'transcribing';
  const isDone = state === 'done';

  const handleClick = async () => {
    if (isRecording) {
      stop();
    } else if (isDone) {
      reset();
    } else {
      await start();
    }
  };

  const label = isRecording
    ? '녹음 중지 (클릭하면 변환 시작)'
    : isTranscribing
    ? '텍스트 변환 중...'
    : isDone
    ? '변환 완료 — 다시 녹음하려면 클릭'
    : '음성 녹음 시작';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition',
        isRecording
          ? 'animate-pulse bg-red-100 text-red-700 ring-1 ring-red-300 hover:bg-red-200'
          : isTranscribing
          ? 'cursor-wait bg-slate-100 text-slate-400'
          : isDone
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        className,
      ].join(' ')}
    >
      {isRecording && <MicOff className="size-4" aria-hidden="true" />}
      {isTranscribing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {isDone && <CheckCircle2 className="size-4" aria-hidden="true" />}
      {state === 'idle' && <Mic className="size-4" aria-hidden="true" />}

      <span className="sr-only">{label}</span>
      {isRecording && <span aria-hidden="true">녹음 중지</span>}
      {isTranscribing && <span aria-hidden="true">변환 중...</span>}
      {isDone && <span aria-hidden="true">완료</span>}
      {state === 'idle' && <span aria-hidden="true">음성 입력</span>}
    </button>
  );
}
