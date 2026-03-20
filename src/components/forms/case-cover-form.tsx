'use client';

import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateCaseCoverAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type CoverFields = {
  court_division?: string | null;
  presiding_judge?: string | null;
  assigned_judge?: string | null;
  court_room?: string | null;
  appeal_court_name?: string | null;
  appeal_division?: string | null;
  appeal_case_number?: string | null;
  appeal_presiding_judge?: string | null;
  appeal_assigned_judge?: string | null;
  appeal_court_room?: string | null;
  supreme_case_number?: string | null;
  supreme_division?: string | null;
  supreme_presiding_judge?: string | null;
  supreme_assigned_judge?: string | null;
  opponent_counsel_name?: string | null;
  opponent_counsel_phone?: string | null;
  opponent_counsel_fax?: string | null;
  client_contact_address?: string | null;
  client_contact_phone?: string | null;
  client_contact_fax?: string | null;
  deadline_filing?: string | null;
  deadline_appeal?: string | null;
  deadline_final_appeal?: string | null;
  cover_notes?: string | null;
};

type Props = {
  caseId: string;
  organizationId: string;
  coverFields: CoverFields;
};

function Field({ label, name, value, type = 'text' }: { label: string; name: string; value?: string | null; type?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <Input name={name} defaultValue={value ?? ''} type={type} className="h-8 text-sm" placeholder="—" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

export function CaseCoverForm({ caseId, organizationId, coverFields: f }: Props) {
  return (
    <ClientActionForm action={updateCaseCoverAction} successTitle="표지 정보 저장 완료" className="space-y-6">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="organizationId" value={organizationId} />

      <Section title="제1심 재판부">
        <Field label="부/단독" name="court_division" value={f.court_division} />
        <Field label="재판장" name="presiding_judge" value={f.presiding_judge} />
        <Field label="주심" name="assigned_judge" value={f.assigned_judge} />
        <Field label="호실/법정" name="court_room" value={f.court_room} />
      </Section>

      <Section title="항소심">
        <Field label="항소심 법원" name="appeal_court_name" value={f.appeal_court_name} />
        <Field label="항소심 사건번호" name="appeal_case_number" value={f.appeal_case_number} />
        <Field label="항소심 재판부" name="appeal_division" value={f.appeal_division} />
        <Field label="항소심 재판장" name="appeal_presiding_judge" value={f.appeal_presiding_judge} />
        <Field label="항소심 주심" name="appeal_assigned_judge" value={f.appeal_assigned_judge} />
        <Field label="항소심 호실" name="appeal_court_room" value={f.appeal_court_room} />
      </Section>

      <Section title="상고심">
        <Field label="상고심 사건번호" name="supreme_case_number" value={f.supreme_case_number} />
        <Field label="상고심 재판부" name="supreme_division" value={f.supreme_division} />
        <Field label="주심부호/재판장" name="supreme_presiding_judge" value={f.supreme_presiding_judge} />
        <Field label="상고심 주심" name="supreme_assigned_judge" value={f.supreme_assigned_judge} />
      </Section>

      <Section title="상대방 대리인">
        <Field label="변호사명" name="opponent_counsel_name" value={f.opponent_counsel_name} />
        <Field label="전화" name="opponent_counsel_phone" value={f.opponent_counsel_phone} />
        <Field label="팩스" name="opponent_counsel_fax" value={f.opponent_counsel_fax} />
      </Section>

      <Section title="의뢰인 통지처 (표지용)">
        <div className="sm:col-span-2 lg:col-span-3 space-y-1">
          <label className="text-xs font-medium text-slate-500">통지처 주소</label>
          <Input name="client_contact_address" defaultValue={f.client_contact_address ?? ''} className="h-8 text-sm" placeholder="—" />
        </div>
        <Field label="전화" name="client_contact_phone" value={f.client_contact_phone} />
        <Field label="팩스" name="client_contact_fax" value={f.client_contact_fax} />
      </Section>

      <Section title="불변기일">
        <Field label="제소기한" name="deadline_filing" value={f.deadline_filing ?? ''} type="date" />
        <Field label="항소기한" name="deadline_appeal" value={f.deadline_appeal ?? ''} type="date" />
        <Field label="상고기한" name="deadline_final_appeal" value={f.deadline_final_appeal ?? ''} type="date" />
      </Section>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">특기사항</label>
        <Textarea name="cover_notes" defaultValue={f.cover_notes ?? ''} placeholder="비고 / 특기사항" rows={3} />
      </div>

      <SubmitButton pendingLabel="저장 중...">표지 정보 저장</SubmitButton>
    </ClientActionForm>
  );
}
