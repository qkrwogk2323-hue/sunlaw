-- 법무법인 관련 컬럼 추가 (위임장 + 담당변호사지정서 지원)
-- agent_law_firm: 법무법인명 (법무법인인 경우)
-- representative_lawyer: 대표변호사 (법무법인인 경우)

alter table rehabilitation_applications
  add column if not exists agent_law_firm text,
  add column if not exists representative_lawyer text;

comment on column rehabilitation_applications.agent_law_firm is '법무법인명 (대리인이 법무법인인 경우)';
comment on column rehabilitation_applications.representative_lawyer is '대표변호사 (법무법인인 경우)';
