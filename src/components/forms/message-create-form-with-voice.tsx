'use client';

import { useState } from 'react';
import { addMessageAction } from '@/lib/actions/case-actions';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { VoiceTranscriptionButton } from '@/components/voice-transcription-button';

export function MessageCreateFormWithVoice({
  caseId,
  allowInternal = true,
}: {
  caseId: string;
  allowInternal?: boolean;
}) {
  const action = addMessageAction.bind(null, caseId);
  const [body, setBody] = useState('');

  const handleTranscript = (text: string) => {
    setBody((prev) => (prev ? `${prev}\n${text}` : text));
  };

  return (
    <ClientActionForm
      action={action}
      successTitle="메시지가 등록되었습니다."
      className="space-y-3"
      onSuccess={() => setBody('')}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="msg-body" className="text-sm font-medium text-slate-700">
            메시지 내용
          </label>
          <VoiceTranscriptionButton
            onTranscript={handleTranscript}
          />
        </div>
        <Textarea
          id="msg-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="사건별 메시지를 남기세요. 음성 입력도 가능합니다."
          className="min-h-24"
        />
      </div>

      {allowInternal ? (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="isInternal" className="size-4 rounded border-slate-300" />
          내부 메모로 등록
        </label>
      ) : null}
      <SubmitButton pendingLabel="전송 중..." disabled={!body.trim()}>
        메시지 등록
      </SubmitButton>
    </ClientActionForm>
  );
}
