-- 사건 표지(소송기록 표지) 출력을 위한 추가 필드
-- 생각날 때마다 채울 수 있는 선택적 필드들

alter table public.cases
  -- 제1심 재판부
  add column if not exists court_division      text,          -- 부/단독 (예: "단독", "민사3부")
  add column if not exists presiding_judge     text,          -- 재판장
  add column if not exists assigned_judge      text,          -- 주심
  add column if not exists court_room          text,          -- 호실/법정 (예: "304호 법정")

  -- 항소심
  add column if not exists appeal_court_name   text,          -- 항소심 법원
  add column if not exists appeal_division     text,          -- 항소심 재판부
  add column if not exists appeal_case_number  text,          -- 항소심 사건번호
  add column if not exists appeal_presiding_judge text,       -- 항소심 재판장
  add column if not exists appeal_assigned_judge  text,       -- 항소심 주심
  add column if not exists appeal_court_room   text,          -- 항소심 호실

  -- 상고심
  add column if not exists supreme_case_number text,          -- 상고심 사건번호
  add column if not exists supreme_division    text,          -- 상고심 재판부
  add column if not exists supreme_presiding_judge text,      -- 상고심 주심부호/재판장
  add column if not exists supreme_assigned_judge text,       -- 상고심 주심

  -- 상대방 대리인
  add column if not exists opponent_counsel_name  text,       -- 상대 변호사
  add column if not exists opponent_counsel_phone text,       -- 상대 변호사 전화
  add column if not exists opponent_counsel_fax   text,       -- 상대 변호사 팩스

  -- 의뢰인 연락처 (표지용 통지처)
  add column if not exists client_contact_address text,       -- 통지처
  add column if not exists client_contact_phone   text,       -- 전화
  add column if not exists client_contact_fax     text,       -- 팩스

  -- 불변기일
  add column if not exists deadline_filing     date,          -- 제소기한
  add column if not exists deadline_appeal     date,          -- 항소기한
  add column if not exists deadline_final_appeal date,        -- 상고기한

  -- 표지 특기사항
  add column if not exists cover_notes         text;          -- 비고/특기사항

comment on column public.cases.court_division is '부/단독 구분';
comment on column public.cases.presiding_judge is '재판장';
comment on column public.cases.assigned_judge is '주심';
comment on column public.cases.court_room is '호실/법정';
comment on column public.cases.appeal_court_name is '항소심 법원';
comment on column public.cases.appeal_case_number is '항소심 사건번호';
comment on column public.cases.opponent_counsel_name is '상대방 대리인(변호사)';
comment on column public.cases.opponent_counsel_phone is '상대방 대리인 전화';
comment on column public.cases.opponent_counsel_fax is '상대방 대리인 팩스';
comment on column public.cases.deadline_filing is '불변기일 - 제소기한';
comment on column public.cases.deadline_appeal is '불변기일 - 항소기한';
comment on column public.cases.deadline_final_appeal is '불변기일 - 상고기한';
comment on column public.cases.cover_notes is '소송기록 표지 특기사항';
