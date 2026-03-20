'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { addScheduleAction } from '@/lib/actions/case-actions';
import { Button } from '@/components/ui/button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { parseNaturalLanguageSchedule, formatParsedPreview } from '@/lib/utils/natural-language-schedule';

type CaseOption = {
  id: string;
  title: string;
};

export function CalendarCreateForm({
  organizationId,
  caseOptions,
  onClose
}: {
  organizationId: string | null;
  caseOptions: CaseOption[];
  onClose?: () => void;
}) {
  const [createCaseId, setCreateCaseId] = useState(caseOptions[0]?.id ?? '');
  const createScheduleAction = createCaseId ? addScheduleAction.bind(null, createCaseId) : async () => {};
  
  // Natural Language Input State
  const [naturalInput, setNaturalInput] = useState('');
  const parsedSchedule = useMemo(() => parseNaturalLanguageSchedule(naturalInput), [naturalInput]);
  
  function handleNaturalInputChange(value: string) {
    setNaturalInput(value);
    if (!value.trim()) return;
    const foundCase = caseOptions.find((item) => value.includes(item.title));
    if (foundCase) {
      setCreateCaseId(foundCase.id);
    }
  }

  // Sync refs with parsed data
  const titleRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const importantRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (naturalInput && parsedSchedule) {
      if (titleRef.current) titleRef.current.value = parsedSchedule.title;
      if (kindRef.current) kindRef.current.value = parsedSchedule.scheduleKind;
      if (dateRef.current && parsedSchedule.scheduledStart) dateRef.current.value = parsedSchedule.scheduledStart;
      if (importantRef.current) importantRef.current.checked = parsedSchedule.isImportant;
    }
  }, [naturalInput, parsedSchedule]);

  return (
    <ClientActionForm
      action={createScheduleAction}
      successTitle="일정 등록 완료"
      errorCause="일정 등록 정보를 저장하지 못했습니다."
      errorResolution="사건 선택과 일정 입력값을 확인한 뒤 다시 등록해 주세요."
      className="space-y-4"
    >
      <input type="hidden" name="clientVisibility" value="internal_only" />
      
      {/* Natural Language Input Section */}
      <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-950/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="size-4 text-purple-500" />
          <span>빠른 일정 등록</span>
        </div>
        <Input 
          value={naturalInput}
          onChange={(e) => handleNaturalInputChange(e.target.value)}
          placeholder="예: 내일 오후 3시 김대표 미팅" 
          className="border-0 bg-transparent p-0 text-lg font-medium shadow-none placeholder:text-slate-400 focus-visible:ring-0"
          autoFocus
        />
        {naturalInput && (
          <div className="flex items-center gap-2 text-sm text-slate-600 animate-in fade-in slide-in-from-top-1">
            <span className="font-mono text-purple-600">→</span>
            {formatParsedPreview(parsedSchedule)}
          </div>
        )}
      </div>

      {/* Additional Options (Collapsible) */}
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
          <span>상세 옵션 및 확인</span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </summary>
        
        <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          {/* Controlled/Synced Inputs via Refs */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">사건 선택</label>
            <select
              value={createCaseId}
              onChange={(event) => setCreateCaseId(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 text-sm"
            >
              {caseOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">제목</label>
            <input
              name="title" 
              ref={titleRef}
              defaultValue=""
              placeholder="일정 제목" 
              required 
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">유형</label>
            <select 
              name="scheduleKind" 
              ref={kindRef}
              defaultValue="other"
              className="h-9 w-full rounded-lg border border-slate-200 text-sm"
            >
              <option value="hearing">기일</option>
              <option value="deadline">마감</option>
              <option value="meeting">회의</option>
              <option value="reminder">리마인더</option>
              <option value="collection_visit">방문회수</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">일시</label>
            <input
              name="scheduledStart" 
              type="datetime-local" 
              ref={dateRef}
              required 
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>
          
          <div className="flex items-end pb-0.5">
             <label className="flex items-center gap-2 text-sm text-slate-600">
              <input 
                type="checkbox" 
                name="isImportant" 
                ref={importantRef}
                className="size-4 rounded border-slate-300" 
              />
              중요
            </label>
          </div>

          <div className="col-span-full pt-2">
             <Input name="location" placeholder="장소 (선택)" className="h-9" />
          </div>
          <div className="col-span-full">
             <Textarea name="notes" placeholder="메모 (선택)" className="min-h-[60px]" />
          </div>
        </div>
      </details>

      <div className="flex justify-end gap-2">
         {onClose && (
            <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
         )}
         <SubmitButton disabled={!organizationId || !createCaseId}>일정 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
