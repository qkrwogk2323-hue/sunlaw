import { addScheduleAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function ScheduleCreateForm({ caseId }: { caseId: string }) {
  const action = addScheduleAction.bind(null, caseId);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <Input name="title" placeholder="일정 제목" required className="md:col-span-2" />
      <select name="scheduleKind" defaultValue="deadline" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="hearing">기일</option>
        <option value="deadline">마감</option>
        <option value="meeting">회의</option>
        <option value="reminder">리마인더</option>
        <option value="collection_visit">방문회수</option>
        <option value="other">기타</option>
      </select>
      <select name="clientVisibility" defaultValue="internal_only" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="internal_only">내부 전용</option>
        <option value="client_visible">의뢰인 공개</option>
      </select>
      <Input name="scheduledStart" type="datetime-local" required />
      <Input name="scheduledEnd" type="datetime-local" />
      <Input name="location" placeholder="장소" className="md:col-span-2" />
      <Textarea name="notes" placeholder="비고" className="md:col-span-2" />
      <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
        <input type="checkbox" name="isImportant" className="size-4 rounded border-slate-300" />
        중요 일정으로 표시
      </label>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="일정 저장 중...">일정 등록</SubmitButton>
      </div>
    </form>
  );
}
