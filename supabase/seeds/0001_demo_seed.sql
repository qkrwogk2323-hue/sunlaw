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
