-- Platform demo organizations and staff seeds.
-- Creates one platform admin, three organizations, and five demo staff per organization.

with demo_users(user_id, email, full_name, platform_role) as (
	values
		('70000000-0000-0000-0000-000000000001'::uuid, 'vein-admin@demo.local', '베인운영', 'platform_admin'),
		('71000000-0000-0000-0000-000000000001'::uuid, 'law-01@demo.local', '강민호', 'standard'),
		('71000000-0000-0000-0000-000000000002'::uuid, 'law-02@demo.local', '송지안', 'standard'),
		('71000000-0000-0000-0000-000000000003'::uuid, 'law-03@demo.local', '윤태린', 'standard'),
		('71000000-0000-0000-0000-000000000004'::uuid, 'law-04@demo.local', '서하준', 'standard'),
		('71000000-0000-0000-0000-000000000005'::uuid, 'law-05@demo.local', '민서율', 'standard'),
		('72000000-0000-0000-0000-000000000001'::uuid, 'collect-01@demo.local', '박도윤', 'standard'),
		('72000000-0000-0000-0000-000000000002'::uuid, 'collect-02@demo.local', '이채원', 'standard'),
		('72000000-0000-0000-0000-000000000003'::uuid, 'collect-03@demo.local', '정하람', 'standard'),
		('72000000-0000-0000-0000-000000000004'::uuid, 'collect-04@demo.local', '최유진', 'standard'),
		('72000000-0000-0000-0000-000000000005'::uuid, 'collect-05@demo.local', '한지후', 'standard'),
		('73000000-0000-0000-0000-000000000001'::uuid, 'other-01@demo.local', '오세린', 'standard'),
		('73000000-0000-0000-0000-000000000002'::uuid, 'other-02@demo.local', '임도현', 'standard'),
		('73000000-0000-0000-0000-000000000003'::uuid, 'other-03@demo.local', '배나윤', 'standard'),
		('73000000-0000-0000-0000-000000000004'::uuid, 'other-04@demo.local', '조이안', 'standard'),
		('73000000-0000-0000-0000-000000000005'::uuid, 'other-05@demo.local', '문서윤', 'standard')
)
insert into auth.users (
	instance_id,
	id,
	aud,
	role,
	email,
	encrypted_password,
	email_confirmed_at,
	raw_app_meta_data,
	raw_user_meta_data,
	created_at,
	updated_at,
	confirmation_token,
	email_change,
	email_change_token_new,
	recovery_token,
	is_sso_user,
	is_anonymous
)
select
	'00000000-0000-0000-0000-000000000000'::uuid,
	user_id,
	'authenticated',
	'authenticated',
	email,
	crypt('VeinDemo!2345', gen_salt('bf')),
	now(),
	'{"provider":"email","providers":["email"]}'::jsonb,
	jsonb_build_object('full_name', full_name),
	now(),
	now(),
	'',
	'',
	'',
	'',
	false,
	false
from demo_users
on conflict (id) do nothing;

with demo_users(user_id, email, full_name, platform_role) as (
	values
		('70000000-0000-0000-0000-000000000001'::uuid, 'vein-admin@demo.local', '베인운영', 'platform_admin'),
		('71000000-0000-0000-0000-000000000001'::uuid, 'law-01@demo.local', '강민호', 'standard'),
		('71000000-0000-0000-0000-000000000002'::uuid, 'law-02@demo.local', '송지안', 'standard'),
		('71000000-0000-0000-0000-000000000003'::uuid, 'law-03@demo.local', '윤태린', 'standard'),
		('71000000-0000-0000-0000-000000000004'::uuid, 'law-04@demo.local', '서하준', 'standard'),
		('71000000-0000-0000-0000-000000000005'::uuid, 'law-05@demo.local', '민서율', 'standard'),
		('72000000-0000-0000-0000-000000000001'::uuid, 'collect-01@demo.local', '박도윤', 'standard'),
		('72000000-0000-0000-0000-000000000002'::uuid, 'collect-02@demo.local', '이채원', 'standard'),
		('72000000-0000-0000-0000-000000000003'::uuid, 'collect-03@demo.local', '정하람', 'standard'),
		('72000000-0000-0000-0000-000000000004'::uuid, 'collect-04@demo.local', '최유진', 'standard'),
		('72000000-0000-0000-0000-000000000005'::uuid, 'collect-05@demo.local', '한지후', 'standard'),
		('73000000-0000-0000-0000-000000000001'::uuid, 'other-01@demo.local', '오세린', 'standard'),
		('73000000-0000-0000-0000-000000000002'::uuid, 'other-02@demo.local', '임도현', 'standard'),
		('73000000-0000-0000-0000-000000000003'::uuid, 'other-03@demo.local', '배나윤', 'standard'),
		('73000000-0000-0000-0000-000000000004'::uuid, 'other-04@demo.local', '조이안', 'standard'),
		('73000000-0000-0000-0000-000000000005'::uuid, 'other-05@demo.local', '문서윤', 'standard')
)
insert into public.profiles (id, email, full_name, platform_role)
select user_id, email, full_name, platform_role::public.platform_role
from demo_users
on conflict (id) do update
set email = excluded.email,
		full_name = excluded.full_name,
		platform_role = excluded.platform_role;

insert into public.organizations (
	id,
	slug,
	name,
	kind,
	enabled_modules,
	onboarding_status,
	created_by
)
values
	(
		'74000000-0000-0000-0000-000000000001'::uuid,
		'hangyeol-demo-law',
		'한결(가상조직)',
		'law_firm',
		'{"billing":true,"collections":false,"client_portal":true,"reports":true}'::jsonb,
		'approved',
		'70000000-0000-0000-0000-000000000001'::uuid
	),
	(
		'74000000-0000-0000-0000-000000000002'::uuid,
		'baro-demo-collection',
		'바로(가상조직)',
		'collection_company',
		'{"billing":true,"collections":true,"client_portal":true,"reports":true}'::jsonb,
		'approved',
		'70000000-0000-0000-0000-000000000001'::uuid
	),
	(
		'74000000-0000-0000-0000-000000000003'::uuid,
		'daon-demo-other',
		'다온(가상조직)',
		'other',
		'{"billing":true,"collections":false,"client_portal":true,"reports":true}'::jsonb,
		'approved',
		'70000000-0000-0000-0000-000000000001'::uuid
	)
on conflict (id) do update
set name = excluded.name,
		kind = excluded.kind,
		enabled_modules = excluded.enabled_modules,
		onboarding_status = excluded.onboarding_status;

with membership_seed(organization_id, profile_id, role, title, actor_category, permission_template_key, case_scope_policy, is_primary) as (
	values
		('74000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000001'::uuid, 'org_owner', '대표변호사', 'admin', 'admin_general', 'all_org_cases', true),
		('74000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000002'::uuid, 'org_manager', '파트너변호사', 'admin', 'lawyer', 'all_org_cases', false),
		('74000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000003'::uuid, 'org_staff', '송무변호사', 'staff', 'lawyer', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000004'::uuid, 'org_staff', '사무장', 'staff', 'office_manager', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000005'::uuid, 'org_staff', '법무지원', 'staff', 'office_manager', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000002'::uuid, '72000000-0000-0000-0000-000000000001'::uuid, 'org_owner', '대표', 'admin', 'admin_general', 'all_org_cases', true),
		('74000000-0000-0000-0000-000000000002'::uuid, '72000000-0000-0000-0000-000000000002'::uuid, 'org_manager', '운영팀장', 'admin', 'admin_general', 'all_org_cases', false),
		('74000000-0000-0000-0000-000000000002'::uuid, '72000000-0000-0000-0000-000000000003'::uuid, 'org_staff', '추심상담', 'staff', 'collection_agent', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000002'::uuid, '72000000-0000-0000-0000-000000000004'::uuid, 'org_staff', '현장회수', 'staff', 'collection_agent', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000002'::uuid, '72000000-0000-0000-0000-000000000005'::uuid, 'org_staff', '회수지원', 'staff', 'collection_agent', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000003'::uuid, '73000000-0000-0000-0000-000000000001'::uuid, 'org_owner', '대표', 'admin', 'admin_general', 'all_org_cases', true),
		('74000000-0000-0000-0000-000000000003'::uuid, '73000000-0000-0000-0000-000000000002'::uuid, 'org_manager', '운영책임', 'admin', 'admin_general', 'all_org_cases', false),
		('74000000-0000-0000-0000-000000000003'::uuid, '73000000-0000-0000-0000-000000000003'::uuid, 'org_staff', '고객지원', 'staff', 'office_manager', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000003'::uuid, '73000000-0000-0000-0000-000000000004'::uuid, 'org_staff', '문서지원', 'staff', 'office_manager', 'assigned_cases_only', false),
		('74000000-0000-0000-0000-000000000003'::uuid, '73000000-0000-0000-0000-000000000005'::uuid, 'org_staff', '정산지원', 'staff', 'office_manager', 'assigned_cases_only', false)
)
insert into public.organization_memberships (
	organization_id,
	profile_id,
	role,
	title,
	actor_category,
	permission_template_key,
	case_scope_policy,
	is_primary
)
select organization_id, profile_id, role::public.membership_role, title, actor_category::public.actor_category, permission_template_key, case_scope_policy::public.case_scope_policy, is_primary
from membership_seed
on conflict (organization_id, profile_id) do update
set role = excluded.role,
		title = excluded.title,
		actor_category = excluded.actor_category,
		permission_template_key = excluded.permission_template_key,
		case_scope_policy = excluded.case_scope_policy,
		is_primary = excluded.is_primary;

update public.profiles
set default_organization_id = '74000000-0000-0000-0000-000000000001'::uuid
where id in (
	'71000000-0000-0000-0000-000000000001'::uuid,
	'71000000-0000-0000-0000-000000000002'::uuid,
	'71000000-0000-0000-0000-000000000003'::uuid,
	'71000000-0000-0000-0000-000000000004'::uuid,
	'71000000-0000-0000-0000-000000000005'::uuid
);

update public.profiles
set default_organization_id = '74000000-0000-0000-0000-000000000002'::uuid
where id in (
	'72000000-0000-0000-0000-000000000001'::uuid,
	'72000000-0000-0000-0000-000000000002'::uuid,
	'72000000-0000-0000-0000-000000000003'::uuid,
	'72000000-0000-0000-0000-000000000004'::uuid,
	'72000000-0000-0000-0000-000000000005'::uuid
);

update public.profiles
set default_organization_id = '74000000-0000-0000-0000-000000000003'::uuid
where id in (
	'73000000-0000-0000-0000-000000000001'::uuid,
	'73000000-0000-0000-0000-000000000002'::uuid,
	'73000000-0000-0000-0000-000000000003'::uuid,
	'73000000-0000-0000-0000-000000000004'::uuid,
	'73000000-0000-0000-0000-000000000005'::uuid
);

-- 
-- Section 2: Demo cases (3 per organization = 9 total)
-- org: hangyeol 74..001, baro 74..002, daon 74..003
-- creator: each org's owner (first user)
-- 

insert into public.cases (
  id, organization_id, reference_no, title, case_type, case_status,
  principal_amount, opened_on, summary, created_by, updated_by
)
values
  --                      
  ('80000000-0000-0000-0000-000000000001'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
#   'HG-2025-001', '(
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset  --', 'civil', 'active',
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1=;PS2=;unset HISTFILE;                 EC= . .DS_Store .cursorrules .env.example .env.local .git .github .gitignore .next .pnpm-store .tmp .vercel CLAUDE.md IMPLEMENTATION_STATUS.md README.md docs eslint.config.mjs instrumentation.ts middleware.ts next-env.d.ts next.config.mjs node_modules package-lock.json package.json playwright playwright-report playwright.authenticated-prod-smoke.config.ts playwright.config.ts playwright.prod-smoke.config.ts pnpm-lock.yaml postcss.config.mjs public scripts sentry.client.config.ts sentry.edge.config.ts sentry.server.config.ts src supabase test-results tests tsconfig.json tsconfig.tsbuildinfo vitest.config.ts  3    ................................................................................',
   '71000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000001'::uuid),
  ('80000000-0000-0000-0000-000000000002'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
   'HG-2025-002', ' ', 'civil', 'pending_review',
   120000000, '2025-02-03', 'echo   echo --.   .',
   '71000000-0000-0000-0000-000000000001'::uuid, '71000000-0000-0000-0000-000000000002'::uuid),
  ('80000000-0000-0000-0000-000000000003'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
 ', 'criminal', 'intake',
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }   .',
   '71000000-0000-0000-0000-000000000002'::uuid, '71000000-0000-0000-0000-000000000002'::uuid),
  --   
  ('80000000-0000-0000-0000-000000000004'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
   'BR-2025-001', '  ', 'debt_collection', 'active',
   3200000, '2025-01-20', '                        .   .',
   '72000000-0000-0000-0000-000000000001'::uuid, '72000000-0000-0000-0000-000000000002'::uuid),
  ('80000000-0000-0000-0000-000000000005'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
#   'BR-2025-002', '(
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1=""; ', 'debt_collection', 'active',
# . .DS_Store .cursorrules .env.example .env.local .git .github .gitignore .next .pnpm-store .tmp .vercel CLAUDE.md IMPLEMENTATION_STATUS.md README.md docs eslint.config.mjs instrumentation.ts middleware.ts next-env.d.ts next.config.mjs node_modules package-lock.json package.json playwright playwright-report playwright.authenticated-prod-smoke.config.ts playwright.config.ts playwright.prod-smoke.config.ts pnpm-lock.yaml postcss.config.mjs public scripts sentry.client.config.ts sentry.edge.config.ts sentry.server.config.ts src supabase test-results tests tsconfig.json tsconfig.tsbuildinfo vitest.config.ts   echo
.   .',
   '72000000-0000-0000-0000-000000000001'::uuid, '72000000-0000-0000-0000-000000000003'::uuid),
  ('80000000-0000-0000-0000-000000000006'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
   'BR-2025-003', '     ', 'execution', 'closed',
#   5600000, '2024-11-01', '  echo
          ....................',
   '72000000-0000-0000-0000-000000000002'::uuid, '72000000-0000-0000-0000-000000000002'::uuid),
  --  
  ('80000000-0000-0000-0000-000000000007'::uuid, '74000000-0000-0000-0000-000000000003'::uuid,
 --', 'civil', 'active',
   7800000, '2025-01-08', '     .   --.',
   '73000000-0000-0000-0000-000000000001'::uuid, '73000000-0000-0000-0000-000000000001'::uuid),
  ('80000000-0000-0000-0000-000000000008'::uuid, '74000000-0000-0000-0000-000000000003'::uuid,
   'DO-2025-002', '  ', 'civil', 'pending_review',
# echo . 
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }  .',
   '73000000-0000-0000-0000-000000000001'::uuid, '73000000-0000-0000-0000-000000000002'::uuid),
  ('80000000-0000-0000-0000-000000000009'::uuid, '74000000-0000-0000-0000-000000000003'::uuid,
   'DO-2025-003', '         ', 'advisory', 'active',
   0, '2025-02-20', '     ........  2025.02~2026.01.',
   '73000000-0000-0000-0000-000000000002'::uuid, '73000000-0000-0000-0000-000000000002'::uuid)
on conflict (id) do nothing;

-- 
-- Section 3: Case handlers (org staff assigned per case)
-- 

insert into public.case_handlers (case_id, organization_id, profile_id, handler_name, role, created_by)
values
  ('80000000-0000-0000-0000-000000000001'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
#   '71000000-0000-0000-0000-000000000002'::', '
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }''''''''', '71000000-0000-0000-0000-000000000001'::uuid),
  ('80000000-0000-0000-0000-000000000001'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
   '71000000-0000-0000-0000-000000000003'::uuid, ', ', '71000000-0000-0000-0000-000000000001'::uuid),
  ('80000000-0000-0000-0000-000000000002'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
#   '71000000-0000-0000-0000-000000000002'::', '
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }''''''''', '71000000-0000-0000-0000-000000000001'::uuid),
  ('80000000-0000-0000-0000-000000000004'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
   '72000000-0000-0000-0000-000000000003'::uuid, '', '', '72000000-0000-0000-0000-000000000001'::uuid),
  ('80000000-0000-0000-0000-000000000005'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
   '72000000-0000-0000-0000-000000000004'::uuid, '', '', '72000000-0000-0000-0000-000000000002'::uuid),
  ('80000000-0000-0000-0000-000000000007'::uuid, '74000000-0000-0000-0000-000000000003'::uuid,
   '73000000-0000-0000-0000-000000000003'::uuid, '', '''''''''', '73000000-0000-0000-0000-000000000001'::uuid)
on conflict (case_id, profile_id, role) do nothing;

-- 
-- Section 4: Case clients ( ,,,,,,,,,,,,,,,,,,,, portal enabled for some)
-- 

insert into public.case_clients (
  id, organization_id, case_id, client_name, client_email_snapshot,
  relation_label, is_portal_enabled, created_by
)
values
  ('81000000-0000-0000-0000-000000000001'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
   '80000000-0000-0000-0000-000000000001'::uuid, '  echoecho',
   'client-hg-1@demo.local', '', true, '71000000-0000-0000-0000-000000000002'::uuid),
  ('81000000-0000-0000-0000-000000000002'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
   '80000000-0000-0000-0000-000000000002'::uuid, ' ',
   'client-hg-2@demo.local', '', true, '71000000-0000-0000-0000-000000000002'::uuid),
  ('81000000-0000-0000-0000-000000000003'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
   '80000000-0000-0000-0000-000000000004'::uuid, '',
   'client-br-1@demo.local', '', false, '72000000-0000-0000-0000-000000000002'::uuid),
  ('81000000-0000-0000-0000-000000000004'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
   '80000000-0000-0000-0000-000000000005'::  ',
   'client-br-2@demo.local', '', false, '72000000-0000-0000-0000-000000000002'::uuid),
  ('81000000-0000-0000-0000-000000000005'::uuid, '74000000-0000-0000-0000-000000000003'::uuid,
   '80000000-0000-0000-0000-000000000007'::uuid, '',
   'client-do-1@demo.local', '', true, '73000000-0000-0000-0000-000000000001'::uuid)
on conflict (case_id, client_email_snapshot) do nothing;

-- 
-- Section 5: Billing entries (  1~2  .DS_Store .cursorrules .env.example .env.local .git .github .gitignore .next .pnpm-store .tmp .vercel CLAUDE.md IMPLEMENTATION_STATUS.md README.md docs eslint.config.mjs instrumentation.ts middleware.ts next-env.d.ts next.config.mjs node_modules package-lock.json package.json playwright playwright-report playwright.authenticated-prod-smoke.config.ts playwright.config.ts playwright.prod-smoke.config.ts pnpm-lock.yaml postcss.config.mjs public scripts sentry.client.config.ts sentry.edge.config.ts sentry.server.config.ts src supabase test-results tests tsconfig.json tsconfig.tsbuildinfo vitest.config.ts )
-- 

insert into public.billing_entries (
  id, organization_id, case_id, entry_kind, title, amount, status, due_on, created_by
)
values
  ('82000000-0000-0000-0000-000000000001'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
', 3000000, 'paid',
   '2025-01-15', '71000000-0000-0000-0000-000000000002'::uuid),
  ('82000000-0000-0000-0000-000000000002'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
   '80000000-0000-0000-0000-000000000001'::uuid, ')', 5000000, 'draft',
   '2025-12-31', '71000000-0000-0000-0000-000000000002'::uuid),
  ('82000000-0000-0000-0000-000000000003'::uuid, '74000000-0000-0000-0000-000000000001'::uuid,
', 5000000, 'issued',
   '2025-02-10', '71000000-0000-0000-0000-000000000002'::uuid),
  ('82000000-0000-0000-0000-000000000004'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
#   '80000000-0000-0000-0000-000000000004'::uuid, '
', 800000, 'paid',
   '2025-01-25', '72000000-0000-0000-0000-000000000002'::uuid),
  ('82000000-0000-0000-0000-000000000005'::uuid, '74000000-0000-0000-0000-000000000002'::uuid,
#   '80000000-0000-0000-0000-000000000005'::uuid, '
', 1500000, 'issued',
   '2025-02-20', '72000000-0000-0000-0000-000000000002'::uuid),
  ('82000000-0000-0000-0000-000000000006'::uuid, '74000000-0000-0000-0000-000000000003'::uuid,
', 1200000, 'paid',
   '2025-01-15', '73000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

-- 
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             })
-- 

insert into public.notifications (
  id, organization_id, case_id, recipient_profile_id, kind, title, body,
  payload, destination_url
)
values
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }
  ('83000000-0000-0000-0000-000000000001'::uuid,
   '74000000-0000-0000-0000-000000000001'::uuid,
   '80000000-0000-0000-0000-000000000001'::uuid,
   '71000000-0000-0000-0000-000000000002'::uuid,
   'case_assigned', 'HG-2025-001               ',
.',
   '{"caseId":"80000000-0000-0000-0000-000000000001"}'::jsonb,
   '/cases/80000000-0000-0000-0000-000000000001'),
  ('83000000-0000-0000-0000-000000000002'::uuid,
   '74000000-0000-0000-0000-000000000001'::uuid,
   '80000000-0000-0000-0000-000000000002'::uuid,
   '71000000-0000-0000-0000-000000000001'::uuid,
   'approval_requested', 'HG-2025-002  --',
.',
   '{"caseId":"80000000-0000-0000-0000-000000000002"}'::jsonb,
   '/cases/80000000-0000-0000-0000-000000000002'),
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }
  ('83000000-0000-0000-0000-000000000003'::uuid,
   '74000000-0000-0000-0000-000000000002'::uuid,
   '80000000-0000-0000-0000-000000000004'::uuid,
   '72000000-0000-0000-0000-000000000003'::uuid,
   'case_assigned', 'BR-2025-001  ',
.',
   '{"caseId":"80000000-0000-0000-0000-000000000004"}'::jsonb,
   '/cases/80000000-0000-0000-0000-000000000004'),
  ('83000000-0000-0000-0000-000000000004'::uuid,
   '74000000-0000-0000-0000-000000000002'::uuid,
   '80000000-0000-0000-0000-000000000005'::uuid,
   '72000000-0000-0000-0000-000000000001'::uuid,
   'collection_update', 'BR-2025-002   ',
#            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }     
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }.',
   '{"caseId":"80000000-0000-0000-0000-000000000005"}'::jsonb,
   '/cases/80000000-0000-0000-0000-000000000005'),
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$EC";             }
  ('83000000-0000-0000-0000-000000000005'::uuid,
   '74000000-0000-0000-0000-000000000003'::uuid,
   '80000000-0000-0000-0000-000000000007'::uuid,
   '73000000-0000-0000-0000-000000000003'::uuid,
   'case_assigned', 'DO-2025-001               ',
.',
   '{"caseId":"80000000-0000-0000-0000-000000000007"}'::jsonb,
   '/cases/80000000-0000-0000-0000-000000000007'),
  ('83000000-0000-0000-0000-000000000006'::uuid,
   '74000000-0000-0000-0000-000000000003'::uuid,
   '80000000-0000-0000-0000-000000000008'::uuid,
   '73000000-0000-0000-0000-000000000001'::uuid,
 echo  --',
#   '                 
            {                 echo ___BEGIN___COMMAND_OUTPUT_MARKER___;                 PS1="";PS2="";unset HISTFILE;                 EC=$?;                 echo "___BEGIN___COMMAND_DONE_MARKER___$.',
   '{"caseId":"80000000-0000-0000-0000-000000000008"}'::jsonb,
   '/cases/80000000-0000-0000-0000-000000000008')
on conflict (id) do nothing;
