-- case_messages.case_id를 nullable로 변경
-- 조직소통대화방은 사건 없이도 조직 내부 메시지를 남길 수 있어야 한다.

alter table public.case_messages
  alter column case_id drop not null;

-- case_id가 null인 경우에도 RLS가 올바르게 동작하도록 기존 정책을 보완한다.
-- (기존 정책은 case_id 기준 조인이 없으므로 그대로 유효)

comment on column public.case_messages.case_id is
  'NULL이면 사건과 무관한 조직 내부 메시지(조직소통대화방). NOT NULL이면 특정 사건 메시지.';
