'use client';

import { useCallback, useRef, useState } from 'react';

export type TranscribeResult = {
  text: string;
  provider: 'whisper' | 'naver' | 'unavailable';
  durationMs?: number;
};

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error';

export type UseVoiceTranscriptionReturn = {
  state: RecordingState;
  error: string | null;
  transcript: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

export function useVoiceTranscription(
  onTranscript?: (text: string) => void,
): UseVoiceTranscriptionReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setTranscript(null);
    chunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const sendToApi = useCallback(async (blob: Blob) => {
    setState('transcribing');
    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: form,
      });

      const json = await response.json() as
        | { ok: true; text: string; provider: string }
        | { ok: false; userMessage: string };

      if (!json.ok) {
        setError(json.userMessage);
        setState('error');
        return;
      }

      const text = json.text.trim();
      setTranscript(text);
      setState('done');
      onTranscript?.(text);
    } catch {
      setError('네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.');
      setState('error');
    }
  }, [onTranscript]);

  const start = useCallback(async () => {
    setError(null);
    setTranscript(null);
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저는 음성 녹음을 지원하지 않습니다.');
      setState('error');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.');
      setState('error');
      return;
    }

    // Best format: webm/opus if supported, else default
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      // Stop all mic tracks — do NOT store the audio blob
      for (const track of stream.getTracks()) track.stop();

      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      chunksRef.current = [];
      void sendToApi(blob);
    };

    recorder.start(250); // collect data every 250ms
    setState('recording');
  }, [sendToApi]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { state, error, transcript, start, stop, reset };
}
