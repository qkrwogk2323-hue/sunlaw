import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAuthenticatedSmokeAdminClient } from '../tests/e2e/authenticated-smoke-account.mjs';

for (const envPath of [resolve('.env.local'), resolve('.env')]) {
  if (existsSync(envPath)) {
    process.loadEnvFile?.(envPath);
  }
}

const DEFAULT_TAG = 'legal-office-demo-v1';
const DEFAULT_PASSWORD = 'DemoSeed123!';

function usage() {
  console.log(`Usage:
  node ./scripts/seed-legal-office-demo.mjs --owner-email <email> [--tag <name>] [--password <value>]

Notes:
  - Reuses the owner's active law_firm organization.
  - Creates or reuses a tagged dummy client, staff set, case, messages, fee agreement, and billing entries.
  - All seeded demo accounts are reset to the provided password, or ${DEFAULT_PASSWORD} by default.
  - All seeded records are labeled with [DUMMY][<tag>] so they can be identified later.
`);
}

function parseArgs(argv) {
  const options = {
    ownerEmail: null,
    tag: DEFAULT_TAG,
    password: DEFAULT_PASSWORD,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--owner-email') options.ownerEmail = (argv[++index] ?? '').trim().toLowerCase() || null;
    else if (token === '--tag') options.tag = (argv[++index] ?? '').trim() || DEFAULT_TAG;
    else if (token === '--password') options.password = (argv[++index] ?? '').trim() || DEFAULT_PASSWORD;
    else if (token === '--help' || token === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'demo';
}

function isoDaysFromNow(days, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

async function resolveOwnerAndOrganization(admin, ownerEmail) {
  const { data: owner, error: ownerError } = await admin
    .from('profiles')
    .select('id, email, full_name, default_organization_id, is_active')
    .eq('email', ownerEmail)
    .eq('is_active', true)
    .single();

  if (ownerError || !owner) {
    throw ownerError ?? new Error(`Active profile not found for ${ownerEmail}`);
  }

  const { data: memberships, error: membershipError } = await admin
    .from('organization_memberships')
    .select('organization_id, role, status, actor_category, organizations!inner(id, name, slug, kind, enabled_modules, lifecycle_status)')
    .eq('profile_id', owner.id)
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager'])
    .eq('organizations.kind', 'law_firm')
    .neq('organizations.lifecycle_status', 'soft_deleted')
    .order('created_at', { ascending: true });

  if (membershipError) throw membershipError;

  const preferredMembership = (memberships ?? []).find((membership) => membership.organization_id === owner.default_organization_id)
    ?? memberships?.[0]
    ?? null;

  if (!preferredMembership) {
    throw new Error(`${ownerEmail} does not have an active law_firm admin membership.`);
  }

  const organization = Array.isArray(preferredMembership.organizations)
    ? preferredMembership.organizations[0]
    : preferredMembership.organizations;

  return {
    owner,
    organization,
    ownerMembership: preferredMembership,
  };
}

async function ensureAuthProfile(admin, { email, fullName, defaultOrganizationId, password, profilePatch = {} }) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: existingProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('id, email, full_name, default_organization_id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profileLookupError) throw profileLookupError;

  let profileId = existingProfile?.id ?? null;
  let created = false;

  if (!profileId) {
    const createdUser = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        seeded_demo: true,
      },
    });

    if (createdUser.error || !createdUser.data.user?.id) {
      throw createdUser.error ?? new Error(`Failed to create auth user for ${normalizedEmail}`);
    }

    profileId = createdUser.data.user.id;
    created = true;
  }

  const authUpdate = await admin.auth.admin.updateUserById(profileId, {
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      seeded_demo: true,
    },
  });

  if (authUpdate.error) {
    throw authUpdate.error;
  }

  const now = new Date().toISOString();
  const nextProfile = {
    id: profileId,
    email: normalizedEmail,
    full_name: fullName,
    legal_name: fullName,
    legal_name_confirmed_at: now,
    is_active: true,
    default_organization_id: defaultOrganizationId,
    updated_at: now,
    ...profilePatch,
  };

  const { error: upsertError } = await admin
    .from('profiles')
    .upsert(nextProfile, { onConflict: 'id' });

  if (upsertError) throw upsertError;

  return {
    id: profileId,
    email: normalizedEmail,
    fullName,
    created,
  };
}

async function ensureMembership(admin, { organizationId, profileId, role, title, actorCategory, templateKey, caseScopePolicy }) {
  const { error } = await admin
    .from('organization_memberships')
    .upsert({
      organization_id: organizationId,
      profile_id: profileId,
      role,
      title,
      actor_category: actorCategory,
      permission_template_key: templateKey,
      case_scope_policy: caseScopePolicy,
      permissions: {},
      status: 'active',
      is_primary: false,
    }, { onConflict: 'organization_id,profile_id' });

  if (error) throw error;
}

async function ensureStaffMembers(admin, context) {
  const { organization, tag, password } = context;
  const orgSlug = slugify(organization.slug || organization.name || organization.id).slice(0, 24);
  const roster = [
    {
      key: 'manager',
      name: `[DUMMY][${tag}] 김도윤 총괄실장`,
      title: '총괄실장',
      role: 'org_manager',
      actorCategory: 'admin',
      templateKey: 'admin_general',
      caseScopePolicy: 'all_org_cases',
    },
    {
      key: 'lawyer',
      name: `[DUMMY][${tag}] 박서윤 담당변호사`,
      title: '담당 변호사',
      role: 'org_staff',
      actorCategory: 'staff',
      templateKey: 'lawyer',
      caseScopePolicy: 'assigned_cases_only',
    },
    {
      key: 'office',
      name: `[DUMMY][${tag}] 이준호 사무장`,
      title: '사무장',
      role: 'org_staff',
      actorCategory: 'staff',
      templateKey: 'office_manager',
      caseScopePolicy: 'assigned_cases_only',
    },
  ];

  const members = [];

  for (const item of roster) {
    const email = `${orgSlug}-${tag}-${item.key}@example.com`;
    const profile = await ensureAuthProfile(admin, {
      email,
      fullName: item.name,
      defaultOrganizationId: organization.id,
      password,
    });

    await ensureMembership(admin, {
      organizationId: organization.id,
      profileId: profile.id,
      role: item.role,
      title: item.title,
      actorCategory: item.actorCategory,
      templateKey: item.templateKey,
      caseScopePolicy: item.caseScopePolicy,
    });

    members.push({ ...item, ...profile, email });
  }

  return members;
}

async function ensureClient(admin, context) {
  const { organization, tag, password } = context;
  const email = `${slugify(organization.slug || organization.name || organization.id).slice(0, 24)}-${tag}-client@example.com`;
  const fullName = `[DUMMY][${tag}] 한예린 의뢰인`;
  const now = new Date().toISOString();

  return ensureAuthProfile(admin, {
    email,
    fullName,
    defaultOrganizationId: organization.id,
    password,
    profilePatch: {
      is_client_account: true,
      client_account_status: 'active',
      client_account_status_changed_at: now,
      client_last_approved_at: now,
      client_account_status_reason: `[DUMMY][${tag}] legal office demo participant`,
      phone_e164: '+821012341234',
    },
  });
}

async function ensureCase(admin, context) {
  const { organization, owner, tag } = context;
  const title = `[DUMMY][${tag}] 설레빗 미수금 회수 및 계약자문`;
  const referenceNo = `DUMMY-${slugify(tag).toUpperCase().slice(0, 10)}-${String(organization.id).slice(0, 6).toUpperCase()}`;

  const { data: existingCase, error: lookupError } = await admin
    .from('cases')
    .select('id, organization_id, title, reference_no')
    .eq('organization_id', organization.id)
    .eq('title', title)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingCase) return existingCase;

  const caseId = crypto.randomUUID();
  const { error: caseError } = await admin.from('cases').insert({
    id: caseId,
    organization_id: organization.id,
    reference_no: referenceNo,
    title,
    case_type: 'civil',
    case_status: 'active',
    stage_template_key: 'civil-default',
    stage_key: 'intake',
    module_flags: { billing: true },
    principal_amount: 128000000,
    opened_on: new Date().toISOString().slice(0, 10),
    summary: `[DUMMY][${tag}] 거래대금 및 계약위반 대응을 함께 보는 법률사무소 데모 사건입니다.`,
    lifecycle_status: 'active',
    created_by: owner.id,
    updated_by: owner.id,
  });
  if (caseError) throw caseError;

  return {
    id: caseId,
    organization_id: organization.id,
    title,
    reference_no: referenceNo,
  };
}

async function ensureCaseOrganization(admin, context) {
  const { organization, owner, caseRecord } = context;
  const { data: existing, error: lookupError } = await admin
    .from('case_organizations')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('organization_id', organization.id)
    .eq('role', 'managing_org')
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing;

  const row = {
    id: crypto.randomUUID(),
    organization_id: organization.id,
    case_id: caseRecord.id,
    role: 'managing_org',
    status: 'active',
    access_scope: 'full',
    billing_scope: 'direct_client_billing',
    communication_scope: 'client_visible',
    is_lead: true,
    can_submit_legal_requests: true,
    can_receive_legal_requests: true,
    can_manage_collection: false,
    can_view_client_messages: true,
    created_by: owner.id,
    updated_by: owner.id,
  };

  const { error } = await admin.from('case_organizations').insert(row);
  if (error) throw error;
  return { id: row.id };
}

async function ensureCaseHandlers(admin, context) {
  const { caseRecord, owner, staffMembers } = context;
  const handlers = [
    { profileId: owner.id, handlerName: owner.full_name ?? owner.email },
    ...staffMembers.slice(0, 2).map((member) => ({ profileId: member.id, handlerName: member.fullName })),
  ];

  const { data: existingRows, error: lookupError } = await admin
    .from('case_handlers')
    .select('profile_id')
    .eq('case_id', caseRecord.id);

  if (lookupError) throw lookupError;
  const existingProfileIds = new Set((existingRows ?? []).map((row) => row.profile_id));

  const missingRows = handlers
    .filter((handler) => !existingProfileIds.has(handler.profileId))
    .map((handler) => ({
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      profile_id: handler.profileId,
      handler_name: handler.handlerName,
      role: 'case_manager',
    }));

  if (!missingRows.length) return missingRows;

  const { error } = await admin.from('case_handlers').insert(missingRows);
  if (error) throw error;
  return missingRows;
}

async function ensureCaseClient(admin, context) {
  const { organization, owner, caseRecord, client } = context;
  const { data: existing, error: lookupError } = await admin
    .from('case_clients')
    .select('id, case_id, profile_id')
    .eq('case_id', caseRecord.id)
    .eq('profile_id', client.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing;

  const row = {
    id: crypto.randomUUID(),
    organization_id: organization.id,
    case_id: caseRecord.id,
    profile_id: client.id,
    client_name: client.fullName,
    client_email_snapshot: client.email,
    relation_label: '대표 의뢰인',
    is_portal_enabled: true,
    created_by: owner.id,
    updated_by: owner.id,
  };

  const { error } = await admin.from('case_clients').insert(row);
  if (error) throw error;
  return { id: row.id, case_id: row.case_id, profile_id: row.profile_id };
}

async function ensureMessages(admin, context) {
  const { caseRecord, tag, owner, client, staffMembers } = context;
  const marker = `[DUMMY][${tag}]`;
  const { data: existing, error: lookupError } = await admin
    .from('case_messages')
    .select('id')
    .eq('case_id', caseRecord.id)
    .like('body', `${marker}%`)
    .limit(1);

  if (lookupError) throw lookupError;
  if ((existing ?? []).length > 0) return 0;

  const manager = staffMembers[0];
  const lawyer = staffMembers[1];
  const officeManager = staffMembers[2];
  const rows = [
    {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      sender_profile_id: owner.id,
      sender_role: 'admin',
      body: `${marker} 오늘 오전에 계약서 원본, 세금계산서, 미수금 정리표까지 모두 수령했습니다. 1차 법률검토를 바로 시작하겠습니다.`,
      is_internal: false,
      created_at: isoDaysFromNow(-2, 10, 15),
    },
    {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      sender_profile_id: client.id,
      sender_role: 'client',
      body: `${marker} 추가로 거래처 담당자 통화 녹취 요약본도 전달드립니다. 가압류 필요 여부를 같이 검토 부탁드립니다.`,
      is_internal: false,
      created_at: isoDaysFromNow(-2, 11, 2),
    },
    {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      sender_profile_id: lawyer.id,
      sender_role: 'staff',
      body: `${marker} 채권액 산정표 기준으로는 원금 1억 2800만 원, 지연손해금은 별도 계산이 필요합니다. 오늘 안에 청구 구조 정리하겠습니다.`,
      is_internal: true,
      created_at: isoDaysFromNow(-1, 9, 20),
    },
    {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      sender_profile_id: manager.id,
      sender_role: 'admin',
      body: `${marker} 착수금 청구 먼저 열고, 지급 확인 전에도 내용증명 초안은 병행해 주세요. 의뢰인 커뮤니케이션은 오늘 5시 전에 한 번 더 드리겠습니다.`,
      is_internal: true,
      created_at: isoDaysFromNow(-1, 9, 45),
    },
    {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      sender_profile_id: officeManager.id,
      sender_role: 'staff',
      body: `${marker} 착수금 청구 항목과 송달비 예상 비용을 등록했습니다. 입금 확인되면 바로 사건 일정표에도 반영하겠습니다.`,
      is_internal: false,
      created_at: isoDaysFromNow(-1, 16, 10),
    },
    {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      sender_profile_id: client.id,
      sender_role: 'client',
      body: `${marker} 확인했습니다. 오늘 중 착수금 이체 가능하고, 상대방 회사 등기부도 추가로 받아서 다시 올리겠습니다.`,
      is_internal: false,
      created_at: isoDaysFromNow(-1, 16, 34),
    },
  ];

  const { error } = await admin.from('case_messages').insert(rows);
  if (error) throw error;
  return rows.length;
}

async function ensureFeeAgreement(admin, context) {
  const { caseRecord, caseOrganization, caseClient, owner, tag } = context;
  const title = `[DUMMY][${tag}] 착수금 및 성공보수 약정`;
  const { data: existing, error: lookupError } = await admin
    .from('fee_agreements')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('title', title)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing;

  const row = {
    id: crypto.randomUUID(),
    case_id: caseRecord.id,
    billing_owner_case_organization_id: caseOrganization.id,
    bill_to_party_kind: 'case_client',
    bill_to_case_client_id: caseClient.id,
    bill_to_case_organization_id: null,
    agreement_type: 'retainer',
    title,
    description: `[DUMMY][${tag}] 착수금 330만원, 회수금의 7% 성공보수로 설정한 더미 약정입니다.`,
    fixed_amount: 3300000,
    rate: 7,
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: null,
    terms_json: {
      seeded_demo: true,
      tag,
      billing_scope: 'direct_client_billing',
    },
    created_by: owner.id,
    updated_by: owner.id,
  };

  const { error } = await admin.from('fee_agreements').insert(row);
  if (error) throw error;
  return { id: row.id };
}

async function ensureBillingEntries(admin, context) {
  const { caseRecord, caseOrganization, caseClient, owner, tag } = context;
  const dueSoon = isoDaysFromNow(3, 17, 0).slice(0, 10);
  const laterDue = isoDaysFromNow(10, 17, 0).slice(0, 10);
  const items = [
    {
      entry_kind: 'retainer_fee',
      title: `[DUMMY][${tag}] 착수금 청구`,
      amount: 3300000,
      tax_amount: 330000,
      due_on: dueSoon,
      notes: `[DUMMY][${tag}] 내용증명 및 가압류 검토 착수금`,
    },
    {
      entry_kind: 'expense',
      title: `[DUMMY][${tag}] 송달비 및 인지대 예상비용`,
      amount: 480000,
      tax_amount: 0,
      due_on: laterDue,
      notes: `[DUMMY][${tag}] 법원 접수 및 송달 예상 비용`,
    },
  ];

  const results = [];
  for (const item of items) {
    const { data: existing, error: lookupError } = await admin
      .from('billing_entries')
      .select('id')
      .eq('case_id', caseRecord.id)
      .eq('title', item.title)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing) {
      results.push(existing.id);
      continue;
    }

    const row = {
      id: crypto.randomUUID(),
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      billing_owner_case_organization_id: caseOrganization.id,
      bill_to_party_kind: 'case_client',
      bill_to_case_client_id: caseClient.id,
      bill_to_case_organization_id: null,
      entry_kind: item.entry_kind,
      title: item.title,
      amount: item.amount,
      tax_amount: item.tax_amount,
      status: 'draft',
      due_on: item.due_on,
      notes: item.notes,
      created_by: owner.id,
      updated_by: owner.id,
    };

    const { error } = await admin.from('billing_entries').insert(row);
    if (error) throw error;
    results.push(row.id);
  }

  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.ownerEmail) {
    usage();
    if (!options.ownerEmail && !options.help) process.exitCode = 1;
    return;
  }

  const admin = createAuthenticatedSmokeAdminClient();
  const { owner, organization } = await resolveOwnerAndOrganization(admin, options.ownerEmail);
  const baseContext = { owner, organization, tag: options.tag, password: options.password };

  const staffMembers = await ensureStaffMembers(admin, baseContext);
  const client = await ensureClient(admin, baseContext);
  const caseRecord = await ensureCase(admin, { ...baseContext, client, staffMembers });
  const caseOrganization = await ensureCaseOrganization(admin, { ...baseContext, caseRecord });
  await ensureCaseHandlers(admin, { ...baseContext, caseRecord, staffMembers });
  const caseClient = await ensureCaseClient(admin, { ...baseContext, caseRecord, client });
  const messageCount = await ensureMessages(admin, { ...baseContext, caseRecord, client, staffMembers });
  const feeAgreement = await ensureFeeAgreement(admin, { ...baseContext, caseRecord, caseOrganization, caseClient });
  const billingEntryIds = await ensureBillingEntries(admin, { ...baseContext, caseRecord, caseOrganization, caseClient });

  console.log(JSON.stringify({
    owner: {
      id: owner.id,
      email: owner.email,
      fullName: owner.full_name,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      kind: organization.kind,
    },
    tag: options.tag,
    loginPassword: options.password,
    seededClient: client,
    seededStaff: staffMembers.map((member) => ({
      id: member.id,
      email: member.email,
      fullName: member.fullName,
      title: member.title,
      role: member.role,
    })),
    seededCase: caseRecord,
    seededCaseClientId: caseClient.id,
    seededCaseOrganizationId: caseOrganization.id,
    insertedMessageCount: messageCount,
    feeAgreementId: feeAgreement.id,
    billingEntryIds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});