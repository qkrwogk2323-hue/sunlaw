'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isManagementRole, requireOrganizationActionAccess } from '@/lib/auth';
import { buildCaseReference, formatCurrency, makeSlug } from '@/lib/format';
import { getCaseStageLabel } from '@/lib/case-stage';
import { createInvitationToken, hashInvitationToken } from '@/lib/invitations';
import { encryptString } from '@/lib/pii';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  billingEntrySchema,
  caseClientLinkSchema,
  caseCreateSchema,
  caseStageUpdateSchema,
  caseOrganizationSchema,
  caseDocumentSchema,
  caseMessageSchema,
  casePartySchema,
  caseRequestSchema,
  documentReviewSchema,
  feeAgreementSchema,
  installmentFollowUpSchema,
  contractRegistrationSchema,
  paymentRecordSchema,
  recoveryActivitySchema,
  scheduleCreateSchema
} from '@/lib/validators';

function buildStoragePath(organizationId: string, caseId: string, originalName: string) {
  const sanitized = makeSlug(originalName.replace(/\.[^.]+$/, '')) || 'document';
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  return `org/${organizationId}/cases/${caseId}/${Date.now()}-${sanitized}${ext}`;
}

function signatureMethodLabel(method: string) {
  switch (method) {
    case 'electronic_signature':
      return '전자서명';
    case 'kakao_confirmation':
      return '카카오 확인';
    case 'signed_document_upload':
      return '서명본 업로드';
    default:
      return '플랫폼 확인 체크';
  }
}

function buildOrganizationSealDataUrl(organizationName: string) {
  const seed = organizationName.trim() || '조직';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="53" fill="none" stroke="#b45309" stroke-width="6"/>
      <circle cx="60" cy="60" r="41" fill="none" stroke="#f59e0b" stroke-width="2"/>
      <text x="60" y="50" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#92400e">전자날인</text>
      <text x="60" y="73" text-anchor="middle" font-size="16" font-family="sans-serif" font-weight="700" fill="#92400e">${seed.slice(0, 10)}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function notifyProfiles(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    throw error;
  }
}

async function logCaseAudit({
  actorId,
  organizationId,
  resourceType,
  resourceId,
  action,
  meta
}: {
  actorId: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  meta?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  void supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    organization_id: organizationId,
    meta: meta ?? {}
  });
}

function asDueDateTime(value?: string | null) {
  if (!value) return null;
  const normalized = `${value}`.trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T09:00:00+09:00`).toISOString();
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function notifyBillingStakeholders({
  supabase,
  organizationId,
  caseId,
  actorId,
  title,
  body,
  payload,
  notificationType = 'billing_notice',
  priority = 'normal'
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organizationId: string;
  caseId: string;
  actorId: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  notificationType?: string;
  priority?: 'urgent' | 'normal' | 'low';
}) {
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_memberships')
    .select('profile_id, role')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (membershipError) throw membershipError;

  const recipientProfileIds = [...new Set(
    (memberships ?? [])
      .filter((row: any) => row.profile_id && (row.role === 'org_owner' || row.role === 'org_manager'))
      .map((row: any) => row.profile_id)
      .concat(actorId)
  )];

  if (!recipientProfileIds.length) return;

  const admin = createSupabaseAdminClient();
  const targetHref = `/cases/${caseId}?tab=billing`;
  const { error: notificationError } = await admin.from('notifications').insert(
    recipientProfileIds.map((recipientProfileId) => ({
      organization_id: organizationId,
      case_id: caseId,
      recipient_profile_id: recipientProfileId,
      kind: 'generic',
      notification_type: notificationType,
      entity_type: 'case',
      entity_id: caseId,
      priority,
      status: 'active',
      requires_action: true,
      title,
      body,
      action_label: '비용 관리 보기',
      action_href: targetHref,
      destination_type: 'internal_route',
      destination_url: targetHref,
      payload
    }))
  );

  if (notificationError) throw notificationError;
}

async function createBillingFollowUp({
  supabase,
  organizationId,
  caseId,
  actorId,
  actorName,
  title,
  notes,
  dueAt,
  isImportant,
  notificationTitle,
  notificationBody,
  payload,
  scheduleKind = 'deadline',
  notificationType = 'billing_notice',
  priority = 'normal'
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organizationId: string;
  caseId: string;
  actorId: string;
  actorName?: string | null;
  title: string;
  notes: string;
  dueAt?: string | null;
  isImportant?: boolean;
  notificationTitle: string;
  notificationBody: string;
  payload: Record<string, unknown>;
  scheduleKind?: 'deadline' | 'meeting' | 'hearing' | 'reminder' | 'collection_visit' | 'other';
  notificationType?: string;
  priority?: 'urgent' | 'normal' | 'low';
}) {
  const scheduleAt = asDueDateTime(dueAt);

  if (scheduleAt) {
    const { error: scheduleError } = await supabase.from('case_schedules').insert({
      organization_id: organizationId,
      case_id: caseId,
      title,
      schedule_kind: scheduleKind,
      scheduled_start: scheduleAt,
      scheduled_end: null,
      location: null,
      notes,
      client_visibility: 'internal_only',
      is_important: Boolean(isImportant),
      created_by: actorId,
      created_by_name: actorName ?? null,
      updated_by: actorId
    });

    if (scheduleError) throw scheduleError;
  }

  await notifyBillingStakeholders({
    supabase,
    organizationId,
    caseId,
    actorId,
    title: notificationTitle,
    body: notificationBody,
    notificationType,
    priority,
    payload: {
      ...payload,
      due_at: scheduleAt
    }
  });
}

async function loadCaseOrThrow(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: caseRecord, error } = await supabase
    .from('cases')
    .select('id, organization_id, title, reference_no, case_type, module_flags')
    .eq('id', caseId)
    .single();

  if (error || !caseRecord) {
    throw error ?? new Error('사건을 찾을 수 없습니다.');
  }

  return { supabase, caseRecord };
}

async function loadBillingEntryForMutation(entryId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: entry, error } = await supabase
    .from('billing_entries')
    .select('id, title, case_id')
    .eq('id', entryId)
    .single();

  if (error || !entry?.case_id) {
    throw error ?? new Error('청구 항목을 찾을 수 없습니다.');
  }

  const { caseRecord } = await loadCaseOrThrow(entry.case_id);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '청구/입금 관리 권한이 없습니다.'
  });

  return { supabase, auth, caseRecord, entry };
}

async function loadFeeAgreementForMutation(agreementId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: agreement, error } = await supabase
    .from('fee_agreements')
    .select('id, title, case_id')
    .eq('id', agreementId)
    .single();

  if (error || !agreement?.case_id) {
    throw error ?? new Error('약정 항목을 찾을 수 없습니다.');
  }

  const { caseRecord } = await loadCaseOrThrow(agreement.case_id);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '약정 관리 권한이 없습니다.'
  });

  return { supabase, auth, caseRecord, agreement };
}

function parseCreateCaseInput(formData: FormData) {
  const clientName = `${formData.get('clientName') ?? ''}`.trim();
  const clientRole = `${formData.get('clientRole') ?? ''}`.trim();
  const opponentName = `${formData.get('opponentName') ?? ''}`.trim();
  const opponentRole = `${formData.get('opponentRole') ?? ''}`.trim();
  const summaryInput = `${formData.get('summary') ?? ''}`.trim();
  const specialNote = `${formData.get('specialNote') ?? ''}`.trim();
  const mergedSummary = [
    summaryInput,
    clientName ? `의뢰인: ${clientName}` : '',
    clientRole ? `의뢰인 지위: ${clientRole}` : '',
    opponentName ? `상대방: ${opponentName}` : '',
    opponentRole ? `상대방 지위: ${opponentRole}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  return caseCreateSchema.parse({
    organizationId: formData.get('organizationId'),
    title: formData.get('title'),
    caseType: formData.get('caseType'),
    principalAmount: formData.get('principalAmount') || 0,
    openedOn: formData.get('openedOn'),
    courtName: formData.get('courtName'),
    caseNumber: formData.get('caseNumber'),
    summary: mergedSummary,
    billingPlanSummary: specialNote,
    billingFollowUpDueOn: ''
  });
}

async function createCaseCoreWrite({
  supabase,
  organizationId,
  title,
  caseType,
  principalAmount,
  openedOn,
  courtName,
  caseNumber,
  summary,
  actorId,
  actorName,
  organizationSlug
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organizationId: string;
  title: string;
  caseType: string;
  principalAmount: number;
  openedOn?: string | null;
  courtName?: string | null;
  caseNumber?: string | null;
  summary?: string | null;
  actorId: string;
  actorName?: string | null;
  organizationSlug?: string | null;
}) {
  const referenceNo = buildCaseReference(organizationSlug ?? 'CASE');
  const stageTemplateKey = caseType === 'debt_collection'
    ? 'collection-default'
    : caseType === 'civil'
      ? 'civil-default'
      : caseType === 'criminal'
        ? 'criminal-default'
        : 'general-default';
  const moduleFlags = caseType === 'debt_collection' ? { billing: true, collection: true } : { billing: true };

  const { data: caseRecord, error } = await supabase
    .from('cases')
    .insert({
      organization_id: organizationId,
      reference_no: referenceNo,
      title,
      case_type: caseType,
      case_status: 'intake',
      stage_template_key: stageTemplateKey,
      stage_key: 'intake',
      module_flags: moduleFlags,
      principal_amount: principalAmount,
      opened_on: openedOn || null,
      court_name: courtName || null,
      case_number: caseNumber || null,
      summary: summary || null,
      created_by: actorId,
      updated_by: actorId
    })
    .select('id')
    .single();

  if (error || !caseRecord) {
    throw error ?? new Error('사건 생성에 실패했습니다.');
  }

  try {
    const { error: handlerError } = await supabase.from('case_handlers').insert({
      organization_id: organizationId,
      case_id: caseRecord.id,
      profile_id: actorId,
      handler_name: actorName,
      role: 'case_manager'
    });

    if (handlerError) {
      throw handlerError;
    }

    const { error: caseOrgError } = await supabase.from('case_organizations').insert({
      organization_id: organizationId,
      case_id: caseRecord.id,
      role: 'managing_org',
      status: 'active',
      access_scope: 'full',
      billing_scope: 'direct_client_billing',
      communication_scope: 'client_visible',
      is_lead: true,
      can_submit_legal_requests: true,
      can_receive_legal_requests: true,
      can_manage_collection: caseType === 'debt_collection',
      can_view_client_messages: true,
      created_by: actorId,
      updated_by: actorId
    });

    if (caseOrgError) {
      throw caseOrgError;
    }

    return {
      caseId: caseRecord.id,
      moduleFlags
    };
  } catch (writeError) {
    // Compensating delete: remove rows created in this failed request so a partial case does not remain.
    await supabase.from('case_handlers').delete().eq('case_id', caseRecord.id);
    await supabase.from('case_organizations').delete().eq('case_id', caseRecord.id);
    await supabase.from('cases').delete().eq('id', caseRecord.id);
    throw writeError;
  }
}

async function runCreateCasePostProcessing({
  supabase,
  organizationId,
  caseId,
  actorId,
  actorName,
  title,
  billingPlanSummary,
  billingFollowUpDueOn
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organizationId: string;
  caseId: string;
  actorId: string;
  actorName?: string | null;
  title: string;
  billingPlanSummary?: string | null;
  billingFollowUpDueOn?: string | null;
}) {
  if (!(billingPlanSummary || billingFollowUpDueOn)) {
    return;
  }

  await createBillingFollowUp({
    supabase,
    organizationId,
    caseId,
    actorId,
    actorName,
    title: `${title} 비용 계획 확인`,
    notes: billingPlanSummary || '초기 비용 계획 확인이 필요합니다.',
    dueAt: billingFollowUpDueOn || null,
    isImportant: Boolean(billingFollowUpDueOn),
    notificationTitle: `비용 계획 확인: ${title}`,
    notificationBody: `${title} 사건의 초기 비용 계획이 등록되었습니다. 대시보드와 비용 메뉴에서 확인해 주세요.`,
    payload: {
      source: 'case_created_billing_plan'
    },
    scheduleKind: 'reminder'
  });
}

function finalizeCreateCase(caseId: string) {
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  redirect(`/cases/${caseId}`);
}

// 새 사건을 생성하고 기본 연결 데이터를 초기화한다.
export async function createCaseAction(formData: FormData) {
  const parsed = parseCreateCaseInput(formData);

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    permission: 'case_create',
    errorMessage: '사건 생성 권한이 없습니다.'
  });
  const supabase = await createSupabaseServerClient();

  const organization = auth.memberships.find((item) => item.organization_id === parsed.organizationId)?.organization;
  const { caseId } = await createCaseCoreWrite({
    supabase,
    organizationId: parsed.organizationId,
    title: parsed.title,
    caseType: parsed.caseType,
    principalAmount: parsed.principalAmount,
    openedOn: parsed.openedOn,
    courtName: parsed.courtName,
    caseNumber: parsed.caseNumber,
    summary: parsed.summary,
    actorId: auth.user.id,
    actorName: auth.profile.full_name,
    organizationSlug: organization?.slug ?? null
  });

  await runCreateCasePostProcessing({
    supabase,
    organizationId: parsed.organizationId,
    caseId,
    actorId: auth.user.id,
    actorName: auth.profile.full_name,
    title: parsed.title,
    billingPlanSummary: parsed.billingPlanSummary,
    billingFollowUpDueOn: parsed.billingFollowUpDueOn
  });

  finalizeCreateCase(caseId);
}

// 사건 당사자를 추가한다.
export async function addPartyAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'case_edit',
    errorMessage: '당사자 등록 권한이 없습니다.'
  });

  const parsed = casePartySchema.parse({
    partyRole: formData.get('partyRole'),
    entityType: formData.get('entityType'),
    displayName: formData.get('displayName'),
    companyName: formData.get('companyName'),
    registrationNumber: formData.get('registrationNumber'),
    residentNumber: formData.get('residentNumber'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    addressSummary: formData.get('addressSummary'),
    addressDetail: formData.get('addressDetail'),
    notes: formData.get('notes'),
    isPrimary: formData.get('isPrimary') === 'on'
  });

  const { error } = await supabase.rpc('add_case_party_atomic', {
    p_organization_id: caseRecord.organization_id,
    p_case_id: caseRecord.id,
    p_party_role: parsed.partyRole,
    p_entity_type: parsed.entityType,
    p_display_name: parsed.displayName,
    p_company_name: parsed.companyName || null,
    p_registration_number_masked: parsed.registrationNumber ? `${parsed.registrationNumber.slice(0, 3)}****` : null,
    p_resident_number_last4: parsed.residentNumber ? parsed.residentNumber.slice(-4) : null,
    p_phone: parsed.phone || null,
    p_email: parsed.email || null,
    p_address_summary: parsed.addressSummary || null,
    p_notes: parsed.notes || null,
    p_is_primary: parsed.isPrimary,
    p_resident_number_ciphertext: parsed.residentNumber ? encryptString(parsed.residentNumber) : null,
    p_registration_number_ciphertext: parsed.registrationNumber ? encryptString(parsed.registrationNumber) : null,
    p_address_detail_ciphertext: parsed.addressDetail ? encryptString(parsed.addressDetail) : null
  });

  if (error) throw error;

  revalidatePath(`/cases/${caseId}`);
}

// 사건에 의뢰인을 연결한다.
export async function linkClientAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'case_edit',
    errorMessage: '의뢰인 연결 권한이 없습니다.'
  });

  const parsed = caseClientLinkSchema.parse({
    email: formData.get('email'),
    relationLabel: formData.get('relationLabel'),
    clientName: formData.get('clientName'),
    portalEnabled: formData.get('portalEnabled') === 'on',
    feeAgreementTitle: formData.get('feeAgreementTitle'),
    feeAgreementType: formData.get('feeAgreementType') || 'retainer',
    feeAgreementAmount: formData.get('feeAgreementAmount') || undefined,
    billingEntryTitle: formData.get('billingEntryTitle'),
    billingEntryAmount: formData.get('billingEntryAmount') || undefined,
    billingEntryDueOn: formData.get('billingEntryDueOn')
  });

  const adminClient = createSupabaseAdminClient();
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', parsed.email)
    .maybeSingle();

  const needsFinancialManage = Boolean(parsed.feeAgreementTitle || (parsed.billingEntryTitle && parsed.billingEntryAmount != null));
  if (needsFinancialManage && !hasPermission(auth, caseRecord.organization_id, 'billing_manage')) {
    throw new Error('비용 항목 또는 약정을 함께 등록하려면 청구/입금 관리 권한이 필요합니다.');
  }

  const { data: linkedClientRows, error } = await supabase.rpc('link_case_client_atomic', {
    p_organization_id: caseRecord.organization_id,
    p_case_id: caseRecord.id,
    p_case_title: caseRecord.title,
    p_target_profile_id: targetProfile?.id ?? null,
    p_client_name: parsed.clientName || targetProfile?.full_name || parsed.email,
    p_client_email_snapshot: parsed.email,
    p_relation_label: parsed.relationLabel || null,
    p_portal_enabled: parsed.portalEnabled,
    p_fee_agreement_title: parsed.feeAgreementTitle || null,
    p_fee_agreement_type: parsed.feeAgreementType,
    p_fee_agreement_amount: parsed.feeAgreementAmount ?? null,
    p_billing_entry_title: parsed.billingEntryTitle || null,
    p_billing_entry_amount: parsed.billingEntryAmount ?? null,
    p_billing_entry_due_on: parsed.billingEntryDueOn || null
  });

  if (error) throw error;

  if (parsed.billingEntryTitle && parsed.billingEntryAmount != null) {
    await notifyBillingStakeholders({
      supabase,
      organizationId: caseRecord.organization_id,
      caseId: caseRecord.id,
      actorId: auth.user.id,
      title: `비용 확인: ${parsed.billingEntryTitle}`,
      body: `${caseRecord.title} 사건에서 ${parsed.email} 대상 비용 항목이 등록되었습니다. 비용 메뉴와 일정 확인에서 확인해 주세요.`,
      payload: {
        source: 'client_link_billing_entry',
        entry_title: parsed.billingEntryTitle,
        due_on: parsed.billingEntryDueOn || null
      }
    });
  }

  const linkedClient = linkedClientRows?.[0] ?? null;
  if (linkedClient?.activated_profile_id) {
    await notifyProfiles(supabase, [
      {
        organization_id: caseRecord.organization_id,
        case_id: caseRecord.id,
        recipient_profile_id: linkedClient.activated_profile_id,
        kind: 'generic',
        title: `새 사건이 연결되었습니다: ${caseRecord.title}`,
        body: '고객 포털에서 사건 진행상황을 확인할 수 있습니다.',
        action_label: '사건 보기',
        action_href: `/portal/cases/${caseRecord.id}`,
        destination_type: 'internal_route',
        destination_url: `/portal/cases/${caseRecord.id}`
      }
    ]);
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/billing');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
}

// 사건 단위 의뢰인 초대 링크를 생성한다.
export async function createClientInvitationAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    requireManager: true,
    errorMessage: '관리자만 의뢰인 포털 초대를 생성할 수 있습니다.'
  });

  const email = `${formData.get('email') ?? ''}`.trim().toLowerCase();
  if (!email) throw new Error('이메일이 필요합니다.');

  const { data: existingClient } = await supabase
    .from('case_clients')
    .select('id, client_name')
    .eq('case_id', caseRecord.id)
    .eq('client_email_snapshot', email)
    .maybeSingle();

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('invitations').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    case_client_id: existingClient?.id ?? null,
    kind: 'client_invite',
    email,
    invited_name: existingClient?.client_name ?? email,
    token_hash: tokenHash,
    share_token: null,
    token_hint: token.slice(-6),
    note: '사건 의뢰인 포털 초대',
    created_by: auth.user.id,
    expires_at: expiresAt
  });

  if (error) throw error;

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?clientInvite=${encodeURIComponent(token)}`);
}

// 사건 문서를 등록한다.
export async function addDocumentAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'document_create',
    errorMessage: '문서 등록 권한이 없습니다.'
  });

  const parsed = caseDocumentSchema.parse({
    title: formData.get('title'),
    documentKind: formData.get('documentKind'),
    clientVisibility: formData.get('clientVisibility'),
    summary: formData.get('summary'),
    contentMarkdown: formData.get('contentMarkdown')
  });

  let storagePath: string | null = null;
  let mimeType: string | null = null;
  let fileSize: number | null = null;
  const upload = formData.get('file');
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'case-files';

  try {
    if (upload instanceof File && upload.size > 0) {
      storagePath = buildStoragePath(caseRecord.organization_id, caseRecord.id, upload.name);
      mimeType = upload.type || null;
      fileSize = upload.size;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, upload, {
        contentType: upload.type,
        upsert: false
      });
      if (uploadError) {
        throw uploadError;
      }
    }

    const { error } = await supabase.from('case_documents').insert({
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      title: parsed.title,
      document_kind: parsed.documentKind,
      approval_status: 'draft',
      client_visibility: parsed.clientVisibility,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size: fileSize,
      summary: parsed.summary || null,
      content_markdown: parsed.contentMarkdown || null,
      created_by: auth.user.id,
      created_by_name: auth.profile.full_name,
      updated_by: auth.user.id
    });

    if (error) {
      throw error;
    }

    await logCaseAudit({
      actorId: auth.user.id,
      organizationId: caseRecord.organization_id,
      resourceType: 'case_document',
      resourceId: `${caseRecord.id}:${parsed.title}`,
      action: 'document.created',
      meta: { case_id: caseRecord.id, title: parsed.title, document_kind: parsed.documentKind }
    });
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from(bucket).remove([storagePath]);
    }
    throw error;
  }

  revalidatePath(`/cases/${caseId}`);
}

// 업로드 문서 메뉴에서 사건 문서를 등록한다.
export async function addDocumentFromLibraryAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  if (!caseId) {
    throw new Error('문서를 연결할 사건을 선택해 주세요.');
  }

  await addDocumentAction(caseId, formData);
  revalidatePath('/documents');
}

// 업로드 문서를 삭제한다.
export async function deleteDocumentAction(formData: FormData) {
  const documentId = `${formData.get('documentId') ?? ''}`.trim();
  if (!documentId) {
    throw new Error('삭제할 문서를 확인할 수 없습니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { data: document, error: readError } = await supabase
    .from('case_documents')
    .select('id, case_id, organization_id, title, storage_path')
    .eq('id', documentId)
    .single();

  if (readError || !document) {
    throw readError ?? new Error('문서를 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(document.organization_id, {
    permission: 'document_create',
    errorMessage: '문서를 삭제할 권한이 없습니다.'
  });

  if (document.storage_path) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'case-files';
    const { error: storageError } = await supabase.storage.from(bucket).remove([document.storage_path]);
    if (storageError) {
      throw storageError;
    }
  }

  const { error: deleteError } = await supabase.from('case_documents').delete().eq('id', documentId);
  if (deleteError) {
    throw deleteError;
  }

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: document.organization_id,
    resourceType: 'case_document',
    resourceId: document.id,
    action: 'document.deleted',
    meta: { case_id: document.case_id, title: document.title }
  });

  if (document.case_id) {
    revalidatePath(`/cases/${document.case_id}`);
  }
  revalidatePath('/documents');
}

// 선택한 업로드 문서를 한 번에 삭제한다.
export async function deleteSelectedDocumentsAction(formData: FormData) {
  const documentIds = formData
    .getAll('documentIds')
    .map((value) => `${value}`.trim())
    .filter(Boolean);

  if (!documentIds.length) {
    throw new Error('삭제할 문서를 먼저 선택해 주세요.');
  }

  for (const documentId of documentIds) {
    const deleteForm = new FormData();
    deleteForm.set('documentId', documentId);
    await deleteDocumentAction(deleteForm);
  }

  revalidatePath('/documents');
}

// 문서를 검토 요청 상태로 전환한다.
export async function requestDocumentReviewAction(documentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: document } = await supabase
    .from('case_documents')
    .select('id, case_id, organization_id, approval_requested_by, title, approval_status, row_version')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('문서를 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(document.organization_id, {
    permission: 'document_create',
    errorMessage: '조직 구성원만 결재를 요청할 수 있습니다.'
  });

  if (!['draft', 'stale'].includes(document.approval_status)) {
    throw new Error('현재 상태에서는 결재를 다시 요청할 수 없습니다.');
  }

  const now = new Date().toISOString();
  const { data: updatedDocument, error: updateError } = await supabase
    .from('case_documents')
    .update({
      approval_status: 'pending_review',
      approval_requested_by: auth.user.id,
      approval_requested_by_name: auth.profile.full_name,
      approval_requested_at: now,
      updated_by: auth.user.id
    })
    .eq('id', documentId)
    .eq('row_version', document.row_version)
    .in('approval_status', ['draft', 'stale'])
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updatedDocument) throw new Error('문서 상태가 변경되어 결재 요청을 완료하지 못했습니다. 새로고침 후 다시 시도해 주세요.');

  const { error: reviewError } = await supabase.from('case_document_reviews').insert({
    organization_id: document.organization_id,
    case_id: document.case_id,
    case_document_id: documentId,
    request_status: 'pending_review',
    requested_by: auth.user.id,
    requested_by_name: auth.profile.full_name,
    snapshot_version: document.row_version
  });

  if (reviewError) {
    throw reviewError;
  }

  const { data: reviewers } = await supabase
    .from('organization_memberships')
    .select('profile_id, role')
    .eq('organization_id', document.organization_id)
    .in('role', ['org_owner', 'org_manager'])
    .neq('profile_id', auth.user.id)
    .eq('status', 'active');

  await notifyProfiles(
    supabase,
    (reviewers ?? []).map((reviewer) => ({
      organization_id: document.organization_id,
      case_id: document.case_id,
      recipient_profile_id: reviewer.profile_id,
      kind: 'approval_requested',
      title: `결재 요청: ${document.title}`,
      body: `${auth.profile.full_name} 사용자가 문서 결재를 요청했습니다.`,
      requires_action: true,
      action_label: '문서 검토하기',
      action_href: `/cases/${document.case_id}?tab=documents`,
      action_entity_type: 'case_document',
      action_target_id: document.id
    }))
  );

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: document.organization_id,
    resourceType: 'case_document',
    resourceId: documentId,
    action: 'document.review_requested',
    meta: { case_id: document.case_id, title: document.title }
  });

  revalidatePath(`/cases/${document.case_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/inbox');
}

// 문서 검토 결과를 승인 또는 반려로 저장한다.
export async function reviewDocumentAction(documentId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: document } = await supabase
    .from('case_documents')
    .select('id, case_id, organization_id, approval_requested_by, title, approval_status, row_version')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('문서를 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(document.organization_id, {
    permission: 'document_approve',
    errorMessage: '결재 권한이 없습니다.'
  });

  const parsed = documentReviewSchema.parse({
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote')
  });

  if (document.approval_status !== 'pending_review') {
    throw new Error('대기 중인 결재 요청만 처리할 수 있습니다.');
  }

  const now = new Date().toISOString();
  const { data: updatedDocument, error: updateError } = await supabase
    .from('case_documents')
    .update({
      approval_status: parsed.decision,
      reviewed_by: auth.user.id,
      reviewed_by_name: auth.profile.full_name,
      reviewed_at: now,
      review_note: parsed.reviewNote || null,
      updated_by: auth.user.id
    })
    .eq('id', documentId)
    .eq('approval_status', 'pending_review')
    .eq('row_version', document.row_version)
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updatedDocument) throw new Error('다른 사용자가 먼저 결재를 처리했습니다. 문서를 새로고침해 최신 상태를 확인해 주세요.');

  const { error: reviewError } = await supabase.from('case_document_reviews').insert({
    organization_id: document.organization_id,
    case_id: document.case_id,
    case_document_id: documentId,
    request_status: parsed.decision,
    requested_by: document.approval_requested_by,
    requested_by_name: null,
    decided_by: auth.user.id,
    decided_by_name: auth.profile.full_name,
    comment: parsed.reviewNote || null,
    snapshot_version: document.row_version,
    decided_at: now
  });

  if (reviewError) {
    throw reviewError;
  }

  await createSupabaseAdminClient()
    .from('notifications')
    .update({ resolved_at: now })
    .eq('organization_id', document.organization_id)
    .eq('action_entity_type', 'case_document')
    .eq('action_target_id', documentId)
    .is('resolved_at', null);

  if (document.approval_requested_by && document.approval_requested_by !== auth.user.id) {
    await notifyProfiles(supabase, [
      {
        organization_id: document.organization_id,
        case_id: document.case_id,
        recipient_profile_id: document.approval_requested_by,
        kind: 'approval_completed',
        title: `결재 ${parsed.decision === 'approved' ? '승인' : '반려'}: ${document.title}`,
        body: `${auth.profile.full_name} 사용자가 결재를 ${parsed.decision === 'approved' ? '승인' : '반려'}했습니다.`,
        action_label: '문서 확인하기',
        action_href: `/cases/${document.case_id}?tab=documents`,
        destination_type: 'internal_route',
        destination_url: `/cases/${document.case_id}?tab=documents`
      }
    ]);
  }

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: document.organization_id,
    resourceType: 'case_document',
    resourceId: documentId,
    action: parsed.decision === 'approved' ? 'document.approved' : 'document.rejected',
    meta: { case_id: document.case_id, title: document.title, review_note: parsed.reviewNote || null }
  });

  revalidatePath(`/cases/${document.case_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/inbox');
}

// 사건 일정을 추가한다.
export async function addScheduleAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'schedule_create',
    errorMessage: '일정 등록 권한이 없습니다.'
  });

  const parsed = scheduleCreateSchema.parse({
    title: formData.get('title'),
    scheduleKind: formData.get('scheduleKind'),
    scheduledStart: formData.get('scheduledStart'),
    scheduledEnd: formData.get('scheduledEnd'),
    location: formData.get('location'),
    notes: formData.get('notes'),
    clientVisibility: formData.get('clientVisibility'),
    isImportant: formData.get('isImportant') === 'on'
  });

  const { error } = await supabase.from('case_schedules').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    title: parsed.title,
    schedule_kind: parsed.scheduleKind,
    scheduled_start: parsed.scheduledStart,
    scheduled_end: parsed.scheduledEnd || null,
    location: parsed.location || null,
    notes: parsed.notes || null,
    client_visibility: parsed.clientVisibility,
    is_important: parsed.isImportant,
    created_by: auth.user.id,
    created_by_name: auth.profile.full_name,
    updated_by: auth.user.id
  });

  if (error) {
    throw error;
  }

  if (parsed.isImportant || parsed.scheduleKind === 'hearing' || parsed.scheduleKind === 'deadline') {
    await notifyBillingStakeholders({
      supabase,
      organizationId: caseRecord.organization_id,
      caseId,
      actorId: auth.user.id,
      title: `[일정] ${parsed.title}`,
      body: `${caseRecord.title} 사건에 ${parsed.scheduleKind === 'hearing' ? '기일' : parsed.scheduleKind === 'deadline' ? '기한' : '중요 일정'}이 등록되었습니다: ${parsed.title}${parsed.scheduledStart ? ` · ${parsed.scheduledStart}` : ''}`,
      payload: {
        source: 'schedule_created',
        schedule_kind: parsed.scheduleKind,
        scheduled_start: parsed.scheduledStart
      }
    });
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
}

// 기존 사건 일정을 수정한다.
export async function updateScheduleAction(scheduleId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: scheduleRow, error: scheduleError } = await supabase
    .from('case_schedules')
    .select('id, case_id, organization_id')
    .eq('id', scheduleId)
    .single();

  if (scheduleError || !scheduleRow) {
    throw scheduleError ?? new Error('일정을 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(scheduleRow.organization_id, {
    permission: 'schedule_edit',
    errorMessage: '일정 수정 권한이 없습니다.'
  });

  const parsed = scheduleCreateSchema.parse({
    title: formData.get('title'),
    scheduleKind: formData.get('scheduleKind'),
    scheduledStart: formData.get('scheduledStart'),
    scheduledEnd: formData.get('scheduledEnd'),
    location: formData.get('location'),
    notes: formData.get('notes'),
    clientVisibility: formData.get('clientVisibility'),
    isImportant: formData.get('isImportant') === 'on'
  });

  const { error } = await supabase
    .from('case_schedules')
    .update({
      title: parsed.title,
      schedule_kind: parsed.scheduleKind,
      scheduled_start: parsed.scheduledStart,
      scheduled_end: parsed.scheduledEnd || null,
      location: parsed.location || null,
      notes: parsed.notes || null,
      client_visibility: parsed.clientVisibility,
      is_important: parsed.isImportant,
      updated_by: auth.user.id
    })
    .eq('id', scheduleId);

  if (error) throw error;

  revalidatePath(`/cases/${scheduleRow.case_id}`);
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
}

// 사건 일정의 완료 상태와 완료자를 갱신한다.
export async function updateScheduleCompletionAction(scheduleId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: scheduleRow, error: scheduleError } = await supabase
    .from('case_schedules')
    .select('id, case_id, organization_id, title, scheduled_start, completed_at, canceled_at')
    .eq('id', scheduleId)
    .single();

  if (scheduleError || !scheduleRow) {
    throw scheduleError ?? new Error('일정을 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(scheduleRow.organization_id, {
    permission: 'schedule_edit',
    errorMessage: '일정 완료 상태를 변경할 권한이 없습니다.'
  });

  const shouldComplete = `${formData.get('completed') ?? ''}` === 'true';
  if (shouldComplete && scheduleRow.canceled_at) {
    throw new Error('취소된 일정은 완료 처리할 수 없습니다. 먼저 취소를 해제해 주세요.');
  }
  const completedAt = shouldComplete ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('case_schedules')
    .update({
      completed_at: completedAt,
      completed_by: shouldComplete ? auth.user.id : null,
      completed_by_name: shouldComplete ? auth.profile.full_name : null,
      updated_by: auth.user.id
    })
    .eq('id', scheduleId);

  if (error) throw error;

  const actionType = shouldComplete ? 'completed' : 'reopened';
  const actionLabel = shouldComplete ? '완료 처리' : '완료 해제';
  const summary = `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일 ${auth.profile.full_name}이(가) "${scheduleRow.title}" 일을 ${actionLabel}했습니다.`;

  const { error: logError } = await supabase
    .from('case_schedule_activity_logs')
    .insert({
      organization_id: scheduleRow.organization_id,
      case_id: scheduleRow.case_id,
      case_schedule_id: scheduleRow.id,
      actor_profile_id: auth.user.id,
      actor_name: auth.profile.full_name,
      action_type: actionType,
      summary,
      schedule_title: scheduleRow.title,
      schedule_scheduled_start: scheduleRow.scheduled_start
    });

  if (logError) throw logError;

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: scheduleRow.organization_id,
    resourceType: 'case_schedule',
    resourceId: scheduleId,
    action: shouldComplete ? 'schedule.completed' : 'schedule.reopened',
    meta: {
      case_id: scheduleRow.case_id,
      title: scheduleRow.title,
      completed_at: completedAt
    }
  });

  revalidatePath(`/cases/${scheduleRow.case_id}`);
  revalidatePath('/calendar');
  revalidatePath('/calendar/worklog');
  revalidatePath('/dashboard');
}

// 사건 일정의 취소 상태와 취소자를 갱신한다.
export async function updateScheduleCancellationAction(scheduleId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: scheduleRow, error: scheduleError } = await supabase
    .from('case_schedules')
    .select('id, case_id, organization_id, title, scheduled_start, canceled_at')
    .eq('id', scheduleId)
    .single();

  if (scheduleError || !scheduleRow) {
    throw scheduleError ?? new Error('일정을 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(scheduleRow.organization_id, {
    permission: 'schedule_edit',
    errorMessage: '일정 취소 상태를 변경할 권한이 없습니다.'
  });

  const shouldCancel = `${formData.get('canceled') ?? ''}` === 'true';
  const cancelReason = `${formData.get('reason') ?? ''}`.trim() || null;
  const canceledAt = shouldCancel ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('case_schedules')
    .update({
      canceled_at: canceledAt,
      canceled_by: shouldCancel ? auth.user.id : null,
      canceled_by_name: shouldCancel ? auth.profile.full_name : null,
      canceled_reason: shouldCancel ? cancelReason : null,
      completed_at: shouldCancel ? null : undefined,
      completed_by: shouldCancel ? null : undefined,
      completed_by_name: shouldCancel ? null : undefined,
      updated_by: auth.user.id
    })
    .eq('id', scheduleId);

  if (error) throw error;

  const actionType = shouldCancel ? 'canceled' : 'cancel_reverted';
  const actionLabel = shouldCancel ? '취소 처리' : '취소 해제';
  const summary = `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일 ${auth.profile.full_name}이(가) "${scheduleRow.title}" 일정을 ${actionLabel}했습니다.${shouldCancel && cancelReason ? ` 사유: ${cancelReason}` : ''}`;

  const { error: logError } = await supabase
    .from('case_schedule_activity_logs')
    .insert({
      organization_id: scheduleRow.organization_id,
      case_id: scheduleRow.case_id,
      case_schedule_id: scheduleRow.id,
      actor_profile_id: auth.user.id,
      actor_name: auth.profile.full_name,
      action_type: actionType,
      summary,
      schedule_title: scheduleRow.title,
      schedule_scheduled_start: scheduleRow.scheduled_start
    });

  if (logError) throw logError;

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: scheduleRow.organization_id,
    resourceType: 'case_schedule',
    resourceId: scheduleId,
    action: shouldCancel ? 'schedule.canceled' : 'schedule.cancel_reverted',
    meta: {
      case_id: scheduleRow.case_id,
      title: scheduleRow.title,
      canceled_at: canceledAt,
      canceled_reason: cancelReason
    }
  });

  revalidatePath(`/cases/${scheduleRow.case_id}`);
  revalidatePath('/calendar');
  revalidatePath('/calendar/worklog');
  revalidatePath('/dashboard');
}

// 회수 활동 이력을 추가한다.
export async function addRecoveryActivityAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'collection_contact_manage',
    errorMessage: '회수 활동 등록 권한이 없습니다.'
  });

  const parsed = recoveryActivitySchema.parse({
    activityKind: formData.get('activityKind'),
    occurredAt: formData.get('occurredAt'),
    amount: formData.get('amount') || 0,
    outcomeStatus: formData.get('outcomeStatus'),
    notes: formData.get('notes'),
    clientVisibility: formData.get('clientVisibility')
  });

  const { error } = await supabase.from('case_recovery_activities').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    activity_kind: parsed.activityKind,
    occurred_at: parsed.occurredAt,
    amount: parsed.amount || 0,
    outcome_status: parsed.outcomeStatus || null,
    notes: parsed.notes || null,
    client_visibility: parsed.clientVisibility,
    created_by: auth.user.id,
    created_by_name: auth.profile.full_name,
    updated_by: auth.user.id
  });

  if (error) {
    throw error;
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/collections');
}

// 사건 메시지를 남기고 관련 허브를 갱신한다.
export async function addMessageAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth, membership } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    errorMessage: '사건 접근 권한이 없습니다.'
  });

  const parsed = caseMessageSchema.parse({
    body: formData.get('body'),
    isInternal: formData.get('isInternal') === 'on'
  });

  const senderRole = isManagementRole(membership.role) ? 'admin' : 'staff';
  const { error } = await supabase.from('case_messages').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    sender_profile_id: auth.user.id,
    sender_role: senderRole,
    body: parsed.body,
    is_internal: parsed.isInternal
  });

  if (error) throw error;

  const { data: clientProfiles } = await supabase
    .from('case_clients')
    .select('profile_id')
    .eq('case_id', caseRecord.id)
    .eq('is_portal_enabled', true)
    .not('profile_id', 'is', null);

  if (!parsed.isInternal) {
    await notifyProfiles(
      supabase,
      (clientProfiles ?? [])
        .filter((row: any) => row.profile_id && row.profile_id !== auth.user.id)
        .map((row: any) => ({
          organization_id: caseRecord.organization_id,
          case_id: caseRecord.id,
          recipient_profile_id: row.profile_id,
          kind: 'generic',
          title: `새 메시지: ${caseRecord.title}`,
          body: parsed.body.slice(0, 120),
          action_label: '소통 보기',
          action_href: `/portal/cases/${caseRecord.id}`,
          destination_type: 'internal_route',
          destination_url: `/portal/cases/${caseRecord.id}`
        }))
    );
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/inbox');
}

// 사건 표지 정보를 저장한다.
export async function updateCaseCoverAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!caseId || !organizationId) throw new Error('사건 정보가 필요합니다.');

  await requireOrganizationActionAccess(organizationId, {
    permission: 'case_create',
    errorMessage: '사건 정보를 수정할 권한이 없습니다.',
  });

  const supabase = await createSupabaseServerClient();
  const str = (key: string) => `${formData.get(key) ?? ''}`.trim() || null;
  const dateVal = (key: string) => `${formData.get(key) ?? ''}`.trim() || null;

  const { error } = await supabase.from('cases').update({
    court_division: str('court_division'),
    presiding_judge: str('presiding_judge'),
    assigned_judge: str('assigned_judge'),
    court_room: str('court_room'),
    appeal_court_name: str('appeal_court_name'),
    appeal_division: str('appeal_division'),
    appeal_case_number: str('appeal_case_number'),
    appeal_presiding_judge: str('appeal_presiding_judge'),
    appeal_assigned_judge: str('appeal_assigned_judge'),
    appeal_court_room: str('appeal_court_room'),
    supreme_case_number: str('supreme_case_number'),
    supreme_division: str('supreme_division'),
    supreme_presiding_judge: str('supreme_presiding_judge'),
    supreme_assigned_judge: str('supreme_assigned_judge'),
    opponent_counsel_name: str('opponent_counsel_name'),
    opponent_counsel_phone: str('opponent_counsel_phone'),
    opponent_counsel_fax: str('opponent_counsel_fax'),
    client_contact_address: str('client_contact_address'),
    client_contact_phone: str('client_contact_phone'),
    client_contact_fax: str('client_contact_fax'),
    deadline_filing: dateVal('deadline_filing'),
    deadline_appeal: dateVal('deadline_appeal'),
    deadline_final_appeal: dateVal('deadline_final_appeal'),
    cover_notes: str('cover_notes'),
  }).eq('id', caseId).eq('organization_id', organizationId);

  if (error) throw error;
  revalidatePath(`/cases/${caseId}`);
}

// 사건 진행 단계를 갱신한다.
export async function updateCaseStageAction(formData: FormData) {
  const parsed = caseStageUpdateSchema.parse({
    caseId: formData.get('caseId'),
    organizationId: formData.get('organizationId'),
    stageKey: formData.get('stageKey'),
    stageNote: formData.get('stageNote')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    permission: 'case_stage_manage',
    errorMessage: '사건 단계를 변경할 권한이 없습니다.'
  });
  const supabase = await createSupabaseServerClient();

  const { data: caseRecord, error: caseError } = await supabase
    .from('cases')
    .select('id, organization_id, title, stage_key')
    .eq('id', parsed.caseId)
    .eq('organization_id', parsed.organizationId)
    .maybeSingle();

  if (caseError || !caseRecord) {
    throw caseError ?? new Error('사건 정보를 찾을 수 없습니다.');
  }

  const previousStageKey = `${caseRecord.stage_key ?? ''}`;
  const changed = previousStageKey !== parsed.stageKey;
  if (!changed && !parsed.stageNote?.trim()) {
    revalidatePath(`/cases/${parsed.caseId}`);
    return;
  }

  if (changed) {
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        stage_key: parsed.stageKey,
        updated_by: auth.user.id
      })
      .eq('id', parsed.caseId)
      .eq('organization_id', parsed.organizationId);
    if (updateError) throw updateError;
  }

  const stageChangeLine = changed
    ? `단계 변경: ${getCaseStageLabel(previousStageKey || null)} -> ${getCaseStageLabel(parsed.stageKey)}`
    : `단계 확인: ${getCaseStageLabel(parsed.stageKey)}`;
  const noteLine = parsed.stageNote?.trim() ? `메모: ${parsed.stageNote.trim()}` : '';
  const messageBody = [stageChangeLine, noteLine].filter(Boolean).join('\n');

  const { error: messageError } = await supabase.from('case_messages').insert({
    organization_id: parsed.organizationId,
    case_id: parsed.caseId,
    sender_profile_id: auth.user.id,
    sender_role: 'admin',
    body: messageBody,
    is_internal: true
  });
  if (messageError) throw messageError;

  if (changed) {
    await notifyBillingStakeholders({
      supabase,
      organizationId: parsed.organizationId,
      caseId: parsed.caseId,
      actorId: auth.user.id,
      title: `[사건] 단계 변경: ${getCaseStageLabel(parsed.stageKey)}`,
      body: `${caseRecord.title} 사건의 진행 단계가 변경되었습니다.\n${stageChangeLine}${noteLine ? `\n${noteLine}` : ''}`,
      payload: {
        source: 'stage_changed',
        previous_stage: previousStageKey,
        new_stage: parsed.stageKey
      }
    });
  }

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath('/cases');
  revalidatePath('/dashboard');
}

// 사건 요청사항을 추가한다.
export async function addRequestAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    errorMessage: '사건 접근 권한이 없습니다.'
  });

  const parsed = caseRequestSchema.parse({
    kind: formData.get('kind'),
    title: formData.get('title'),
    body: formData.get('body'),
    dueAt: formData.get('dueAt'),
    clientVisible: formData.get('clientVisible') === 'on'
  });

  const { error } = await supabase.from('case_requests').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    created_by: auth.user.id,
    request_kind: parsed.kind,
    title: parsed.title,
    body: parsed.body,
    due_at: parsed.dueAt || null,
    client_visible: parsed.clientVisible
  });

  if (error) throw error;

  await notifyBillingStakeholders({
    supabase,
    organizationId: caseRecord.organization_id,
    caseId,
    actorId: auth.user.id,
    title: `[요청] ${parsed.title}`,
    body: `${caseRecord.title} 사건에 새 요청사항이 등록되었습니다: ${parsed.title}${parsed.dueAt ? ` · 기한 ${parsed.dueAt}` : ''}`,
    payload: {
      source: 'request_created',
      request_kind: parsed.kind,
      due_at: parsed.dueAt || null
    }
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/inbox');
}

// 사건 청구 항목을 등록한다.
export async function addBillingEntryAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '청구/입금 관리 권한이 없습니다.'
  });

  const parsed = billingEntrySchema.parse({
    billToPartyKind: formData.get('billToPartyKind') || 'case_client',
    billToCaseClientId: formData.get('billToCaseClientId'),
    billToCaseOrganizationId: formData.get('billToCaseOrganizationId'),
    entryType: formData.get('entryType'),
    title: formData.get('title'),
    amount: formData.get('amount') || 0,
    taxAmount: formData.get('taxAmount') || 0,
    dueOn: formData.get('dueOn'),
    notes: formData.get('notes')
  });

  const { data: billingOwner } = await supabase
    .from('case_organizations')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('organization_id', caseRecord.organization_id)
    .eq('role', 'managing_org')
    .maybeSingle();

  const { error } = await supabase.from('billing_entries').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    billing_owner_case_organization_id: billingOwner?.id ?? null,
    bill_to_party_kind: parsed.billToPartyKind,
    bill_to_case_client_id: parsed.billToCaseClientId || null,
    bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
    entry_kind: parsed.entryType,
    title: parsed.title,
    amount: parsed.amount,
    tax_amount: parsed.taxAmount,
    status: 'draft',
    due_on: parsed.dueOn || null,
    notes: parsed.notes || null,
    created_by: auth.user.id,
    updated_by: auth.user.id
  });

  if (error) throw error;

  await createBillingFollowUp({
    supabase,
    organizationId: caseRecord.organization_id,
    caseId: caseRecord.id,
    actorId: auth.user.id,
    actorName: auth.profile.full_name,
    title: `[비용] ${parsed.title}`,
    notes: `${parsed.title} · ${parsed.entryType} · 금액 ${parsed.amount}${parsed.taxAmount ? ` / 세액 ${parsed.taxAmount}` : ''}${parsed.notes ? `\n${parsed.notes}` : ''}`,
    dueAt: parsed.dueOn || null,
    isImportant: true,
    notificationTitle: `비용 항목 등록: ${parsed.title}`,
    notificationBody: parsed.dueOn
      ? `${caseRecord.title} 사건에 ${parsed.title} 항목이 등록되었습니다. ${parsed.dueOn}까지 비용 확인과 청구 준비가 필요합니다.`
      : `${caseRecord.title} 사건에 ${parsed.title} 항목이 등록되었습니다. 비용 처리 메뉴와 사건 Billing 탭에서 확인해 주세요.`,
    notificationType: 'billing_entry_created',
    priority: parsed.dueOn ? 'urgent' : 'normal',
    payload: {
      source: 'billing_entry_created',
      entry_title: parsed.title,
      entry_type: parsed.entryType,
      amount: parsed.amount,
      due_on: parsed.dueOn || null
    }
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/collections');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  revalidatePath('/billing');
  revalidatePath('/notifications');
}

export async function addOrganizationBillingEntryAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  if (!caseId) {
    throw new Error('사건을 먼저 선택해 주세요.');
  }
  return addBillingEntryAction(caseId, formData);
}

export async function updateBillingEntryAction(entryId: string, formData: FormData) {
  const { supabase, auth, caseRecord, entry } = await loadBillingEntryForMutation(entryId);

  const parsed = billingEntrySchema.parse({
    billToPartyKind: formData.get('billToPartyKind') || 'case_client',
    billToCaseClientId: formData.get('billToCaseClientId'),
    billToCaseOrganizationId: formData.get('billToCaseOrganizationId'),
    entryType: formData.get('entryType'),
    title: formData.get('title'),
    amount: formData.get('amount') || 0,
    taxAmount: formData.get('taxAmount') || 0,
    dueOn: formData.get('dueOn'),
    notes: formData.get('notes')
  });

  const { error } = await supabase
    .from('billing_entries')
    .update({
      bill_to_party_kind: parsed.billToPartyKind,
      bill_to_case_client_id: parsed.billToCaseClientId || null,
      bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
      entry_kind: parsed.entryType,
      title: parsed.title,
      amount: parsed.amount,
      tax_amount: parsed.taxAmount,
      total_amount: Number(parsed.amount) + Number(parsed.taxAmount ?? 0),
      due_on: parsed.dueOn || null,
      notes: parsed.notes || null,
      updated_by: auth.user.id
    })
    .eq('id', entryId);

  if (error) throw error;

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: caseRecord.organization_id,
    resourceType: 'billing_entry',
    resourceId: entryId,
    action: 'billing_entry_updated',
    meta: {
      before_title: entry.title,
      after_title: parsed.title,
      case_id: caseRecord.id
    }
  });

  revalidatePath(`/cases/${caseRecord.id}`);
  revalidatePath('/billing');
  revalidatePath('/billing/history');
  revalidatePath('/notifications');
}

export async function deleteBillingEntryAction(formData: FormData) {
  const entryId = `${formData.get('entryId') ?? ''}`.trim();
  if (!entryId) throw new Error('삭제할 청구 항목을 찾을 수 없습니다.');

  const { supabase, auth, caseRecord, entry } = await loadBillingEntryForMutation(entryId);
  const { error } = await supabase.from('billing_entries').delete().eq('id', entryId);
  if (error) throw error;

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: caseRecord.organization_id,
    resourceType: 'billing_entry',
    resourceId: entryId,
    action: 'billing_entry_deleted',
    meta: {
      title: entry.title,
      case_id: caseRecord.id
    }
  });

  revalidatePath(`/cases/${caseRecord.id}`);
  revalidatePath('/billing');
  revalidatePath('/billing/history');
  revalidatePath('/notifications');
}


// 사건에 참여 조직을 추가한다.
export async function addCaseOrganizationAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'case_assign',
    errorMessage: '참여 조직 연결 권한이 없습니다.'
  });

  const parsed = caseOrganizationSchema.parse({
    organizationId: formData.get('organizationId'),
    role: formData.get('role'),
    accessScope: formData.get('accessScope') || 'read_only',
    billingScope: formData.get('billingScope') || 'none',
    communicationScope: formData.get('communicationScope') || 'cross_org_only',
    isLead: formData.get('isLead') === 'on',
    canSubmitLegalRequests: formData.get('canSubmitLegalRequests') === 'on',
    canReceiveLegalRequests: formData.get('canReceiveLegalRequests') === 'on',
    canManageCollection: formData.get('canManageCollection') === 'on',
    canViewClientMessages: formData.get('canViewClientMessages') === 'on',
    agreementSummary: formData.get('agreementSummary')
  });

  const { error } = await supabase.from('case_organizations').insert({
    organization_id: parsed.organizationId,
    case_id: caseRecord.id,
    role: parsed.role,
    access_scope: parsed.accessScope,
    billing_scope: parsed.billingScope,
    communication_scope: parsed.communicationScope,
    is_lead: parsed.isLead,
    can_submit_legal_requests: parsed.canSubmitLegalRequests,
    can_receive_legal_requests: parsed.canReceiveLegalRequests,
    can_manage_collection: parsed.canManageCollection,
    can_view_client_messages: parsed.canViewClientMessages,
    agreement_summary: parsed.agreementSummary || null,
    created_by: auth.user.id,
    updated_by: auth.user.id
  });

  if (error) throw error;

  revalidatePath(`/cases/${caseId}`);
}

// 사건 비용 약정을 등록한다.
export async function addFeeAgreementAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '약정 등록 권한이 없습니다.'
  });

  const parsed = feeAgreementSchema.parse({
    billToPartyKind: formData.get('billToPartyKind'),
    billToCaseClientId: formData.get('billToCaseClientId'),
    billToCaseOrganizationId: formData.get('billToCaseOrganizationId'),
    agreementType: formData.get('agreementType'),
    title: formData.get('title'),
    description: formData.get('description'),
    fixedAmount: formData.get('fixedAmount') || undefined,
    taxAmount: formData.get('taxAmount') || undefined,
    rate: formData.get('rate') || undefined,
    effectiveFrom: formData.get('effectiveFrom'),
    effectiveTo: formData.get('effectiveTo'),
    termsJson: formData.get('termsJson')
  });

  const { data: billingOwner } = await supabase
    .from('case_organizations')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('organization_id', caseRecord.organization_id)
    .eq('role', 'managing_org')
    .maybeSingle();

  const termsJson = {
    ...(parsed.termsJson ? JSON.parse(parsed.termsJson || '{}') : {}),
    tax_amount: parsed.taxAmount ?? 0
  };

  const { error } = await supabase.from('fee_agreements').insert({
    case_id: caseRecord.id,
    billing_owner_case_organization_id: billingOwner?.id,
    bill_to_party_kind: parsed.billToPartyKind,
    bill_to_case_client_id: parsed.billToCaseClientId || null,
    bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
    agreement_type: parsed.agreementType,
    title: parsed.title,
    description: parsed.description || null,
    fixed_amount: parsed.fixedAmount ?? null,
    rate: parsed.rate ?? null,
    effective_from: parsed.effectiveFrom || null,
    effective_to: parsed.effectiveTo || null,
    terms_json: termsJson,
    created_by: auth.user.id,
    updated_by: auth.user.id
  });

  if (error) throw error;

  await createBillingFollowUp({
    supabase,
    organizationId: caseRecord.organization_id,
    caseId: caseRecord.id,
    actorId: auth.user.id,
    actorName: auth.profile.full_name,
    title: `[약정] ${parsed.title}`,
    notes: `${parsed.title} · ${parsed.agreementType}${parsed.fixedAmount != null ? ` · 고정금액 ${parsed.fixedAmount}` : ''}${parsed.taxAmount != null ? ` · 세액 ${parsed.taxAmount}` : ''}${parsed.rate != null ? ` · 비율 ${parsed.rate}%` : ''}${parsed.description ? `\n${parsed.description}` : ''}`,
    dueAt: parsed.effectiveTo || parsed.effectiveFrom || null,
    isImportant: Boolean(parsed.effectiveTo),
    notificationTitle: `비용 약정 등록: ${parsed.title}`,
    notificationBody: parsed.effectiveTo || parsed.effectiveFrom
      ? `${caseRecord.title} 사건에 ${parsed.title} 약정이 등록되었습니다. ${parsed.effectiveTo || parsed.effectiveFrom} 기준으로 약정 확인이 필요합니다.`
      : `${caseRecord.title} 사건에 ${parsed.title} 약정이 등록되었습니다. 비용 메뉴와 사건 Billing 탭에서 확인해 주세요.`,
    notificationType: 'fee_agreement_created',
    payload: {
      source: 'fee_agreement_created',
      agreement_title: parsed.title,
      agreement_type: parsed.agreementType,
      fixed_amount: parsed.fixedAmount ?? null,
      tax_amount: parsed.taxAmount ?? 0,
      rate: parsed.rate ?? null,
      effective_from: parsed.effectiveFrom || null,
      effective_to: parsed.effectiveTo || null
    },
    scheduleKind: 'reminder'
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  revalidatePath('/billing');
  revalidatePath('/contracts');
  revalidatePath('/notifications');
}

export async function addOrganizationFeeAgreementAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  if (!caseId) {
    throw new Error('사건을 먼저 선택해 주세요.');
  }
  return addFeeAgreementAction(caseId, formData);
}

export async function updateFeeAgreementAction(agreementId: string, formData: FormData) {
  const { supabase, auth, caseRecord, agreement } = await loadFeeAgreementForMutation(agreementId);

  const parsed = feeAgreementSchema.parse({
    billToPartyKind: formData.get('billToPartyKind'),
    billToCaseClientId: formData.get('billToCaseClientId'),
    billToCaseOrganizationId: formData.get('billToCaseOrganizationId'),
    agreementType: formData.get('agreementType'),
    title: formData.get('title'),
    description: formData.get('description'),
    fixedAmount: formData.get('fixedAmount') || undefined,
    taxAmount: formData.get('taxAmount') || undefined,
    rate: formData.get('rate') || undefined,
    effectiveFrom: formData.get('effectiveFrom'),
    effectiveTo: formData.get('effectiveTo'),
    termsJson: formData.get('termsJson')
  });

  const termsJson = {
    ...(parsed.termsJson ? JSON.parse(parsed.termsJson || '{}') : {}),
    tax_amount: parsed.taxAmount ?? 0
  };
  const { error } = await supabase
    .from('fee_agreements')
    .update({
      bill_to_party_kind: parsed.billToPartyKind,
      bill_to_case_client_id: parsed.billToCaseClientId || null,
      bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
      agreement_type: parsed.agreementType,
      title: parsed.title,
      description: parsed.description || null,
      fixed_amount: parsed.fixedAmount ?? null,
      rate: parsed.rate ?? null,
      effective_from: parsed.effectiveFrom || null,
      effective_to: parsed.effectiveTo || null,
      terms_json: termsJson,
      updated_by: auth.user.id
    })
    .eq('id', agreementId);

  if (error) throw error;

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: caseRecord.organization_id,
    resourceType: 'fee_agreement',
    resourceId: agreementId,
    action: 'fee_agreement_updated',
    meta: {
      before_title: agreement.title,
      after_title: parsed.title,
      case_id: caseRecord.id
    }
  });

  revalidatePath(`/cases/${caseRecord.id}`);
  revalidatePath('/billing');
  revalidatePath('/billing/history');
  revalidatePath('/contracts');
  revalidatePath('/notifications');
}

export async function deleteFeeAgreementAction(formData: FormData) {
  const agreementId = `${formData.get('agreementId') ?? ''}`.trim();
  if (!agreementId) throw new Error('삭제할 약정 항목을 찾을 수 없습니다.');

  const { supabase, auth, caseRecord, agreement } = await loadFeeAgreementForMutation(agreementId);
  const { error } = await supabase.from('fee_agreements').delete().eq('id', agreementId);
  if (error) throw error;

  await logCaseAudit({
    actorId: auth.user.id,
    organizationId: caseRecord.organization_id,
    resourceType: 'fee_agreement',
    resourceId: agreementId,
    action: 'fee_agreement_deleted',
    meta: {
      title: agreement.title,
      case_id: caseRecord.id
    }
  });

  revalidatePath(`/cases/${caseRecord.id}`);
  revalidatePath('/billing');
  revalidatePath('/billing/history');
  revalidatePath('/contracts');
  revalidatePath('/notifications');
}

// 계약서 업로드와 비용 약정을 함께 등록한다.
export async function registerContractPacketAction(formData: FormData) {
  const parsed = contractRegistrationSchema.parse({
    caseId: formData.get('caseId'),
    billToPartyKind: formData.get('billToPartyKind'),
    billToCaseClientId: formData.get('billToCaseClientId'),
    billToCaseOrganizationId: formData.get('billToCaseOrganizationId'),
    agreementType: formData.get('agreementType'),
    title: formData.get('title'),
    documentTitle: formData.get('documentTitle'),
    summary: formData.get('summary'),
    description: formData.get('description'),
    fixedAmount: formData.get('fixedAmount') || undefined,
    rate: formData.get('rate') || undefined,
    effectiveFrom: formData.get('effectiveFrom'),
    effectiveTo: formData.get('effectiveTo'),
    sendToClient: formData.get('sendToClient') === 'on',
    requestClientSignature: formData.get('requestClientSignature') === 'on',
    signatureMethod: formData.get('signatureMethod'),
    clientVisibility: formData.get('clientVisibility'),
    scanProvider: formData.get('scanProvider'),
    senderRegistrationNumber: formData.get('senderRegistrationNumber'),
    billingIntent: formData.get('billingIntent'),
    installmentStartMode: formData.get('installmentStartMode')
  });

  const upload = formData.get('file');
  if (!(upload instanceof File) || upload.size <= 0) {
    throw new Error('계약서 파일을 업로드해 주세요.');
  }

  const { supabase, caseRecord } = await loadCaseOrThrow(parsed.caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '계약을 등록할 권한이 없습니다.'
  });
  await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'document_create',
    errorMessage: '계약서 문서를 등록할 권한이 없습니다.'
  });

  if ((parsed.sendToClient || parsed.requestClientSignature) && parsed.billToPartyKind !== 'case_client') {
    throw new Error('의뢰인에게 보낼 계약은 청구 대상을 의뢰인으로 선택해 주세요.');
  }

  if ((parsed.sendToClient || parsed.requestClientSignature) && !parsed.billToCaseClientId) {
    throw new Error('의뢰인에게 보낼 계약은 대상 의뢰인을 선택해 주세요.');
  }

  const { data: billingOwner } = await supabase
    .from('case_organizations')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('organization_id', caseRecord.organization_id)
    .eq('role', 'managing_org')
    .maybeSingle();

  const { data: organizationSnapshot } = await supabase
    .from('organizations')
    .select('name, representative_name, address_line1, address_line2, business_number')
    .eq('id', caseRecord.organization_id)
    .maybeSingle();

  let storagePath: string | null = null;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'case-files';
  const now = new Date().toISOString();

  try {
    storagePath = buildStoragePath(caseRecord.organization_id, caseRecord.id, upload.name);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, upload, {
      contentType: upload.type,
      upsert: false
    });
    if (uploadError) throw uploadError;

    const { data: documentRow, error: documentError } = await supabase
      .from('case_documents')
      .insert({
        organization_id: caseRecord.organization_id,
        case_id: caseRecord.id,
        title: parsed.documentTitle,
        document_kind: 'contract',
        approval_status: 'draft',
        client_visibility: parsed.sendToClient ? 'client_visible' : parsed.clientVisibility,
        storage_path: storagePath,
        mime_type: upload.type || null,
        file_size: upload.size,
        summary: parsed.summary || null,
        content_markdown: parsed.description || null,
        created_by: auth.user.id,
        created_by_name: auth.profile.full_name,
        updated_by: auth.user.id
      })
      .select('id')
      .single();

    if (documentError || !documentRow) {
      throw documentError ?? new Error('계약서 문서를 저장하지 못했습니다.');
    }

    const termsJson = {
      contract_document_id: documentRow.id,
      contract_document_title: parsed.documentTitle,
      contract_summary: parsed.summary || null,
      scan_provider: parsed.scanProvider || null,
      sent_to_client: parsed.sendToClient,
      sent_to_client_at: parsed.sendToClient ? now : null,
      signature_request: parsed.requestClientSignature,
      signature_method: parsed.signatureMethod,
      delivery_status: parsed.requestClientSignature ? 'sent_for_signature' : parsed.sendToClient ? 'shared_with_client' : 'internal_registered',
      signature_status: parsed.requestClientSignature ? 'pending' : null,
      sender_snapshot: {
        organization_name: organizationSnapshot?.name ?? null,
        representative_name: organizationSnapshot?.representative_name ?? auth.profile.full_name,
        address: [organizationSnapshot?.address_line1, organizationSnapshot?.address_line2].filter(Boolean).join(' ').trim() || null,
        registration_number: parsed.senderRegistrationNumber || organizationSnapshot?.business_number || null,
        seal_data_url: buildOrganizationSealDataUrl(organizationSnapshot?.name ?? '조직')
      },
      billing_intent: parsed.billingIntent,
      installment_start_mode: parsed.installmentStartMode,
      signature_logs: [] as Array<Record<string, unknown>>
    };

    const { data: agreementRow, error: agreementError } = await supabase
      .from('fee_agreements')
      .insert({
        case_id: caseRecord.id,
        billing_owner_case_organization_id: billingOwner?.id,
        bill_to_party_kind: parsed.billToPartyKind,
        bill_to_case_client_id: parsed.billToCaseClientId || null,
        bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
        agreement_type: parsed.agreementType,
        title: parsed.title,
        description: parsed.description || null,
        fixed_amount: parsed.fixedAmount ?? null,
        rate: parsed.rate ?? null,
        effective_from: parsed.effectiveFrom || null,
        effective_to: parsed.effectiveTo || null,
        terms_json: termsJson,
        created_by: auth.user.id,
        updated_by: auth.user.id
      })
      .select('id')
      .single();

    if (agreementError || !agreementRow) {
      throw agreementError ?? new Error('계약 약정을 저장하지 못했습니다.');
    }

    if (parsed.requestClientSignature) {
      const signatureBody = [
        `${parsed.documentTitle} 계약서를 확인하고 ${signatureMethodLabel(parsed.signatureMethod)} 방식으로 동의를 남겨 주세요.`,
        parsed.summary ? `계약 요약: ${parsed.summary}` : null
      ].filter(Boolean).join('\n');

      const { error: requestError } = await supabase.from('case_requests').insert({
        organization_id: caseRecord.organization_id,
        case_id: caseRecord.id,
        created_by: auth.user.id,
        fee_agreement_id: agreementRow.id,
        request_kind: 'signature_request',
        title: `[계약] ${parsed.title} 서명 요청`,
        body: signatureBody,
        due_at: parsed.effectiveTo || null,
        client_visible: true
      });

      if (requestError) throw requestError;
    }

    const entryTitle = `[계약] ${parsed.title}`;
    const contractNote = `${parsed.documentTitle}${parsed.summary ? `\n계약 요약: ${parsed.summary}` : ''}`;

    if (parsed.fixedAmount != null && parsed.billingIntent === 'receivable') {
      const { error: billingEntryError } = await supabase.from('billing_entries').insert({
        organization_id: caseRecord.organization_id,
        case_id: caseRecord.id,
        billing_owner_case_organization_id: billingOwner?.id ?? null,
        bill_to_party_kind: parsed.billToPartyKind,
        bill_to_case_client_id: parsed.billToCaseClientId || null,
        bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
        entry_kind: parsed.agreementType === 'success_fee' ? 'success_fee' : parsed.agreementType === 'expense_reimbursement' ? 'expense' : 'service_fee',
        title: entryTitle,
        amount: parsed.fixedAmount,
        tax_amount: 0,
        status: 'issued',
        due_on: parsed.effectiveFrom || now.slice(0, 10),
        notes: contractNote,
        created_by: auth.user.id,
        updated_by: auth.user.id
      });
      if (billingEntryError) throw billingEntryError;
    }

    if (parsed.fixedAmount != null && parsed.billingIntent === 'received') {
      const { error: paymentError } = await supabase.from('payments').insert({
        case_id: caseRecord.id,
        billing_owner_case_organization_id: billingOwner?.id ?? null,
        payer_party_kind: parsed.billToPartyKind,
        payer_case_client_id: parsed.billToCaseClientId || null,
        payer_case_organization_id: parsed.billToCaseOrganizationId || null,
        payment_method: 'other',
        amount: parsed.fixedAmount,
        payment_status: 'confirmed',
        received_at: now,
        reference_text: entryTitle,
        note: '계약 등록 시 이미 받은 금액으로 표시됨',
        created_by: auth.user.id,
        updated_by: auth.user.id
      });
      if (paymentError) throw paymentError;
    }

    if (parsed.fixedAmount != null && parsed.billingIntent === 'installment_pending') {
      const dueOn = parsed.installmentStartMode === 'first_due'
        ? (parsed.effectiveTo || parsed.effectiveFrom || now.slice(0, 10))
        : (parsed.effectiveFrom || now.slice(0, 10));
      const { error: installmentEntryError } = await supabase.from('billing_entries').insert({
        organization_id: caseRecord.organization_id,
        case_id: caseRecord.id,
        billing_owner_case_organization_id: billingOwner?.id ?? null,
        bill_to_party_kind: parsed.billToPartyKind,
        bill_to_case_client_id: parsed.billToCaseClientId || null,
        bill_to_case_organization_id: parsed.billToCaseOrganizationId || null,
        entry_kind: 'service_fee',
        title: `${entryTitle} · 분납`,
        amount: parsed.fixedAmount,
        tax_amount: 0,
        status: 'issued',
        due_on: dueOn,
        notes: `분납 약정 미입금 확인 대상\n${contractNote}`,
        created_by: auth.user.id,
        updated_by: auth.user.id
      });
      if (installmentEntryError) throw installmentEntryError;
    }

    revalidatePath(`/cases/${caseRecord.id}`);
    revalidatePath(`/portal/cases/${caseRecord.id}`);
    revalidatePath('/billing');
    revalidatePath('/contracts');
    revalidatePath('/notifications');
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from(bucket).remove([storagePath]).catch(() => undefined);
    }
    throw error;
  }
}

// 사건 입금 내역을 기록한다.
export async function recordPaymentAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_payment_confirm',
    errorMessage: '입금 확인 권한이 없습니다.'
  });

  const parsed = paymentRecordSchema.parse({
    payerPartyKind: formData.get('payerPartyKind'),
    payerCaseClientId: formData.get('payerCaseClientId'),
    payerCaseOrganizationId: formData.get('payerCaseOrganizationId'),
    paymentMethod: formData.get('paymentMethod') || 'bank_transfer',
    amount: formData.get('amount') || 0,
    receivedAt: formData.get('receivedAt'),
    referenceText: formData.get('referenceText'),
    note: formData.get('note')
  });

  const { data: billingOwner } = await supabase
    .from('case_organizations')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('organization_id', caseRecord.organization_id)
    .eq('role', 'managing_org')
    .maybeSingle();

  const { error } = await supabase.from('payments').insert({
    case_id: caseRecord.id,
    billing_owner_case_organization_id: billingOwner?.id,
    payer_party_kind: parsed.payerPartyKind,
    payer_case_client_id: parsed.payerCaseClientId || null,
    payer_case_organization_id: parsed.payerCaseOrganizationId || null,
    payment_method: parsed.paymentMethod,
    payment_status: 'confirmed',
    amount: parsed.amount,
    received_at: parsed.receivedAt,
    reference_text: parsed.referenceText || null,
    note: parsed.note || null,
    confirmed_by: auth.user.id,
    created_by: auth.user.id,
    updated_by: auth.user.id
  });

  if (error) throw error;

  await notifyBillingStakeholders({
    supabase,
    organizationId: caseRecord.organization_id,
    caseId,
    actorId: auth.user.id,
    title: `입금 확인: ${parsed.referenceText || '입금 기록'}`,
    body: `${caseRecord.title} 사건에 ${formatCurrency(parsed.amount)} 입금이 확인되었습니다. 비용 관리와 사건 Billing 탭에서 반영 상태를 확인해 주세요.`,
    notificationType: 'payment_recorded',
    payload: {
      source: 'payment_recorded',
      amount: parsed.amount,
      payment_method: parsed.paymentMethod,
      received_at: parsed.receivedAt,
      reference_text: parsed.referenceText || null
    }
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  revalidatePath('/billing');
}

// 분납 부족분을 다음 청구에 합산 발행한다.
export async function issueInstallmentShortageBillingAction(formData: FormData) {
  const agreementId = `${formData.get('agreementId') ?? ''}`.trim();
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  if (!agreementId || !caseId) {
    throw new Error('분납 부족분 청구 정보가 올바르지 않습니다.');
  }

  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '비용 조정 권한이 없습니다.'
  });

  const { data: agreement, error: agreementError } = await supabase
    .from('fee_agreements')
    .select('id, title, fixed_amount, bill_to_party_kind, bill_to_case_client_id, bill_to_case_organization_id, billing_owner_case_organization_id, terms_json')
    .eq('id', agreementId)
    .eq('case_id', caseId)
    .maybeSingle();

  if (agreementError || !agreement) throw agreementError ?? new Error('분납 계약 정보를 찾지 못했습니다.');

  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('id, amount, payment_status')
    .eq('case_id', caseId)
    .eq('payer_party_kind', agreement.bill_to_party_kind)
    .eq('payer_case_client_id', agreement.bill_to_case_client_id ?? null)
    .eq('payer_case_organization_id', agreement.bill_to_case_organization_id ?? null);

  if (paymentError) throw paymentError;

  const paidAmount = (payments ?? [])
    .filter((item: any) => item.payment_status === 'confirmed')
    .reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const fixedAmount = Number(agreement.fixed_amount ?? 0);
  const shortageAmount = Math.max(fixedAmount - paidAmount, 0);

  if (shortageAmount <= 0) {
    throw new Error('현재 합산 청구가 필요한 부족 금액이 없습니다.');
  }

  const { error: entryError } = await supabase.from('billing_entries').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseId,
    billing_owner_case_organization_id: agreement.billing_owner_case_organization_id ?? null,
    fee_agreement_id: agreement.id,
    bill_to_party_kind: agreement.bill_to_party_kind,
    bill_to_case_client_id: agreement.bill_to_case_client_id,
    bill_to_case_organization_id: agreement.bill_to_case_organization_id,
    entry_kind: 'service_fee',
    title: `[분납 부족분] ${agreement.title}`,
    amount: shortageAmount,
    tax_amount: 0,
    status: 'issued',
    due_on: new Date().toISOString().slice(0, 10),
    notes: '분납 약정 부족분을 다음 청구에 합산 발행함',
    created_by: auth.user.id,
    updated_by: auth.user.id
  });

  if (entryError) throw entryError;

  const nextTerms = {
    ...((agreement.terms_json as Record<string, unknown> | null) ?? {}),
    installment_follow_up: {
      mode: 'merged_charge',
      shortage_amount: shortageAmount,
      decided_at: new Date().toISOString(),
      decided_by: auth.user.id
    }
  };

  await supabase
    .from('fee_agreements')
    .update({ terms_json: nextTerms, updated_by: auth.user.id })
    .eq('id', agreement.id);

  await createBillingFollowUp({
    supabase,
    organizationId: caseRecord.organization_id,
    caseId,
    actorId: auth.user.id,
    actorName: auth.profile.full_name,
    title: `[분납 부족분] ${agreement.title}`,
    notes: `부족분 ${formatCurrency(shortageAmount)}을 다음 청구에 합산했습니다.`,
    dueAt: new Date().toISOString().slice(0, 10),
    isImportant: true,
    scheduleKind: 'reminder',
    notificationTitle: `분납 부족분 합산 청구: ${agreement.title}`,
    notificationBody: `${caseRecord.title} 사건에서 분납 부족분 ${formatCurrency(shortageAmount)}을 다음 청구로 합산했습니다.`,
    notificationType: 'installment_shortage_merged',
    priority: 'normal',
    payload: {
      source: 'installment_shortage_merged',
      agreement_id: agreement.id,
      shortage_amount: shortageAmount
    }
  });

  revalidatePath('/billing');
  revalidatePath('/contracts');
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  revalidatePath('/notifications');
}

// 분납 부족분을 회차 연장으로 기록한다.
export async function extendInstallmentPlanAction(formData: FormData) {
  const parsed = installmentFollowUpSchema.parse({
    agreementId: formData.get('agreementId'),
    caseId: formData.get('caseId'),
    additionalRounds: formData.get('additionalRounds') || 1,
    nextDueOn: formData.get('nextDueOn')
  });

  const { supabase, caseRecord } = await loadCaseOrThrow(parsed.caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_manage',
    errorMessage: '비용 조정 권한이 없습니다.'
  });

  const { data: agreement, error: agreementError } = await supabase
    .from('fee_agreements')
    .select('id, title, fixed_amount, bill_to_party_kind, bill_to_case_client_id, bill_to_case_organization_id, terms_json')
    .eq('id', parsed.agreementId)
    .eq('case_id', parsed.caseId)
    .maybeSingle();

  if (agreementError || !agreement) throw agreementError ?? new Error('분납 계약 정보를 찾지 못했습니다.');

  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('id, amount, payment_status')
    .eq('case_id', parsed.caseId)
    .eq('payer_party_kind', agreement.bill_to_party_kind)
    .eq('payer_case_client_id', agreement.bill_to_case_client_id ?? null)
    .eq('payer_case_organization_id', agreement.bill_to_case_organization_id ?? null);

  if (paymentError) throw paymentError;

  const paidAmount = (payments ?? [])
    .filter((item: any) => item.payment_status === 'confirmed')
    .reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const fixedAmount = Number(agreement.fixed_amount ?? 0);
  const shortageAmount = Math.max(fixedAmount - paidAmount, 0);

  const nextTerms = {
    ...((agreement.terms_json as Record<string, unknown> | null) ?? {}),
    installment_follow_up: {
      mode: 'extend_rounds',
      shortage_amount: shortageAmount,
      additional_rounds: parsed.additionalRounds,
      next_due_on: parsed.nextDueOn,
      decided_at: new Date().toISOString(),
      decided_by: auth.user.id
    }
  };

  const { error: updateError } = await supabase
    .from('fee_agreements')
    .update({ terms_json: nextTerms, updated_by: auth.user.id })
    .eq('id', agreement.id);

  if (updateError) throw updateError;

  await createBillingFollowUp({
    supabase,
    organizationId: caseRecord.organization_id,
    caseId: parsed.caseId,
    actorId: auth.user.id,
    actorName: auth.profile.full_name,
    title: `[분납 회차 조정] ${agreement.title}`,
    notes: `추가 ${parsed.additionalRounds}회 · 다음 기준일 ${parsed.nextDueOn}`,
    dueAt: parsed.nextDueOn,
    isImportant: true,
    scheduleKind: 'reminder',
    notificationTitle: `분납 회차 조정: ${agreement.title}`,
    notificationBody: `${caseRecord.title} 사건의 분납 회차를 ${parsed.additionalRounds}회 늘렸습니다. 다음 기준일은 ${parsed.nextDueOn}입니다.`,
    notificationType: 'installment_rounds_extended',
    priority: 'normal',
    payload: {
      source: 'installment_rounds_extended',
      agreement_id: agreement.id,
      additional_rounds: parsed.additionalRounds,
      next_due_on: parsed.nextDueOn,
      shortage_amount: shortageAmount
    }
  });

  revalidatePath('/billing');
  revalidatePath('/contracts');
  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  revalidatePath('/notifications');
}

// 사건을 삭제함으로 이동한다.
export async function moveCaseToDeletedAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!caseId || !organizationId) {
    throw new Error('사건 삭제 요청 정보가 올바르지 않습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_assign',
    errorMessage: '사건 삭제함 이동 권한이 없습니다.'
  });
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('cases')
    .update({
      lifecycle_status: 'soft_deleted',
      case_status: 'archived',
      updated_by: auth.user.id
    })
    .eq('id', caseId)
    .eq('organization_id', organizationId);

  if (error) throw error;

  revalidatePath('/cases');
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
}

// 삭제함의 사건을 다시 복구한다.
export async function restoreCaseAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!caseId || !organizationId) {
    throw new Error('복구 요청 정보가 올바르지 않습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_assign',
    errorMessage: '사건 복구 권한이 없습니다.'
  });
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('cases')
    .update({
      lifecycle_status: 'active',
      case_status: 'active',
      updated_by: auth.user.id
    })
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .eq('lifecycle_status', 'soft_deleted');

  if (error) throw error;

  revalidatePath('/cases');
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
}

// 삭제함 사건을 최종 보관 처리한다.
export async function forceDeleteCaseAction(formData: FormData) {
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!caseId || !organizationId) {
    throw new Error('최종 보관 요청 정보가 올바르지 않습니다.');
  }

  await requireOrganizationActionAccess(organizationId, {
    permission: 'case_assign',
    errorMessage: '최종 보관 권한이 없습니다.'
  });
  const supabase = await createSupabaseServerClient();
  const archivedAt = new Date().toISOString();

  const { error } = await supabase
    .from('cases')
    .update({
      lifecycle_status: 'archived',
      case_status: 'archived',
      deleted_at: archivedAt,
      updated_at: archivedAt
    })
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .eq('lifecycle_status', 'soft_deleted');

  if (error) throw error;

  revalidatePath('/cases');
  revalidatePath('/dashboard');
}
