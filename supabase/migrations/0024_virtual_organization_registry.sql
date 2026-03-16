alter table public.organizations
  add column if not exists is_directory_public boolean not null default true;

insert into public.organizations (
  id,
  slug,
  name,
  kind,
  lifecycle_status,
  enabled_modules,
  is_directory_public,
  representative_name,
  representative_title,
  email,
  phone,
  address_line1,
  postal_code
)
values
  (
    'virtual-law-org',
    'saeon-garam-beop',
    '새온가람법(가상조직)',
    'law_firm',
    'active',
    '{"billing": true, "collections": false, "client_portal": true, "reports": true}'::jsonb,
    false,
    '강민호',
    '대표변호사',
    'contact@saeongaram.virtual',
    '02-701-2001',
    '서울 중구 세종대로 61',
    '04513'
  ),
  (
    'virtual-collection-org',
    'nuri-chaeum-won',
    '누리채움원(가상조직)',
    'collection_company',
    'active',
    '{"billing": true, "collections": true, "client_portal": true, "reports": true}'::jsonb,
    false,
    '박도윤',
    '대표',
    'contact@nurichaeum.virtual',
    '02-701-2002',
    '서울 영등포구 국제금융로 10',
    '07326'
  ),
  (
    'virtual-other-org',
    'daon-haneul-lab',
    '다온하늘랩(가상조직)',
    'other',
    'active',
    '{"billing": true, "collections": false, "client_portal": true, "reports": true}'::jsonb,
    false,
    '오세린',
    '대표',
    'contact@daonhaneul.virtual',
    '02-701-2003',
    '서울 강남구 테헤란로 142',
    '06236'
  )
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  kind = excluded.kind,
  lifecycle_status = excluded.lifecycle_status,
  enabled_modules = excluded.enabled_modules,
  is_directory_public = excluded.is_directory_public,
  representative_name = excluded.representative_name,
  representative_title = excluded.representative_title,
  email = excluded.email,
  phone = excluded.phone,
  address_line1 = excluded.address_line1,
  postal_code = excluded.postal_code,
  updated_at = now();
