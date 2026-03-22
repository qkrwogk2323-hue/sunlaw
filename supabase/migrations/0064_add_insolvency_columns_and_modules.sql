-- 0064: insolvency 도메인 등록 — 컬럼, 제약, 모듈, 인덱스
-- 0063에서 추가한 insolvency case_type + insolvency_subtype enum을 이번 migration에서 사용.

-- 1. cases 테이블에 insolvency_subtype 컬럼 추가
alter table public.cases
  add column if not exists insolvency_subtype public.insolvency_subtype;

comment on column public.cases.insolvency_subtype is
  '도산 사건 세부 유형 (case_type = insolvency 일 때만 사용). individual_rehabilitation | individual_bankruptcy | corporate_rehabilitation | corporate_bankruptcy';

-- 2. insolvency_subtype은 case_type=insolvency일 때만 유효
alter table public.cases
  drop constraint if exists chk_insolvency_subtype_requires_type;

alter table public.cases
  add constraint chk_insolvency_subtype_requires_type check (
    insolvency_subtype is null
    or case_type = 'insolvency'
  );

-- 3. case_type_default_modules에 insolvency 모듈 등록
insert into public.case_type_default_modules (case_type, module_key)
values ('insolvency', 'insolvency')
on conflict (case_type, module_key) do nothing;

-- 4. 인덱스: insolvency 사건 조회 최적화
create index if not exists idx_cases_insolvency_subtype
  on public.cases (organization_id, insolvency_subtype)
  where case_type = 'insolvency';
