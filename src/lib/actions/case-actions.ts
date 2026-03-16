'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isManagementRole, requireOrganizationActionAccess } from '@/lib/auth';
import { buildCaseReference, makeSlug } from '@/lib/format';
import { createInvitationToken, hashInvitationToken } from '@/lib/invitations';
import { encryptString } from '@/lib/pii';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  billingEntrySchema,
  caseClientLinkSchema,
  caseCreateSchema,
  caseOrganizationSchema,
  caseDocumentSchema,
  caseMessageSchema,
  casePartySchema,
  caseRequestSchema,
  documentReviewSchema,
  feeAgreementSchema,
  paymentRecordSchema,
  recoveryActivitySchema,
  scheduleCreateSchema
} from '@/lib/validators';

function buildStoragePath(organizationId: string, caseId: string, originalName: string) {
  const sanitized = makeSlug(originalName.replace(/\.[^.]+$/, '')) || 'document';
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  return `org/${organizationId}/cases/${caseId}/${Date.now()}-${sanitized}${ext}`;
}

async function notifyProfiles(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    throw error;
  }
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
  payload
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organizationId: string;
  caseId: string;
  actorId: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
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
  const { error: notificationError } = await admin.from('notifications').insert(
    recipientProfileIds.map((recipientProfileId) => ({
      organization_id: organizationId,
      case_id: caseId,
      recipient_profile_id: recipientProfileId,
      kind: 'generic',
      title,
      body,
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
  scheduleKind = 'deadline'
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
    throw error ?? new Error('Case not found');
  }

  return { supabase, caseRecord };
}

function parseCreateCaseInput(formData: FormData) {
  return caseCreateSchema.parse({
    organizationId: formData.get('organizationId'),
    title: formData.get('title'),
    caseType: formData.get('caseType'),
    principalAmount: formData.get('principalAmount') || 0,
    openedOn: formData.get('openedOn'),
    courtName: formData.get('courtName'),
    caseNumber: formData.get('caseNumber'),
    summary: formData.get('summary'),
    billingPlanSummary: formData.get('billingPlanSummary'),
    billingFollowUpDueOn: formData.get('billingFollowUpDueOn')
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

  const { data: party, error } = await supabase
    .from('case_parties')
    .insert({
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      party_role: parsed.partyRole,
      entity_type: parsed.entityType,
      display_name: parsed.displayName,
      company_name: parsed.companyName || null,
      registration_number_masked: parsed.registrationNumber ? `${parsed.registrationNumber.slice(0, 3)}****` : null,
      resident_number_last4: parsed.residentNumber ? parsed.residentNumber.slice(-4) : null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address_summary: parsed.addressSummary || null,
      notes: parsed.notes || null,
      is_primary: parsed.isPrimary,
      created_by: auth.user.id,
      updated_by: auth.user.id
    })
    .select('id')
    .single();

  if (error || !party) {
    throw error ?? new Error('당사자 등록 실패');
  }

  if (parsed.residentNumber || parsed.addressDetail || parsed.registrationNumber) {
    const { error: privateError } = await supabase.from('case_party_private_profiles').insert({
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      case_party_id: party.id,
      resident_number_ciphertext: parsed.residentNumber ? encryptString(parsed.residentNumber) : null,
      registration_number_ciphertext: parsed.registrationNumber ? encryptString(parsed.registrationNumber) : null,
      address_detail_ciphertext: parsed.addressDetail ? encryptString(parsed.addressDetail) : null,
      created_by: auth.user.id,
      updated_by: auth.user.id
    });

    if (privateError) {
      throw privateError;
    }
  }

  revalidatePath(`/cases/${caseId}`);
}

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

  const { data: caseClient, error } = await supabase.from('case_clients').insert({
    organization_id: caseRecord.organization_id,
    case_id: caseRecord.id,
    profile_id: targetProfile?.id ?? null,
    client_name: parsed.clientName || targetProfile?.full_name || parsed.email,
    client_email_snapshot: parsed.email,
    relation_label: parsed.relationLabel || null,
    is_portal_enabled: Boolean(targetProfile?.id && parsed.portalEnabled),
    created_by: auth.user.id,
    updated_by: auth.user.id
  }).select('id').single();

  if (error || !caseClient) {
    throw error;
  }

  if (parsed.feeAgreementTitle) {
    const { error: agreementError } = await supabase.from('fee_agreements').insert({
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      bill_to_party_kind: 'case_client',
      bill_to_case_client_id: caseClient.id,
      bill_to_case_organization_id: null,
      billing_owner_case_organization_id: null,
      agreement_type: parsed.feeAgreementType,
      title: parsed.feeAgreementTitle,
      description: `${parsed.email}${parsed.relationLabel ? ` · ${parsed.relationLabel}` : ''}`,
      fixed_amount: parsed.feeAgreementAmount ?? null,
      rate: null,
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: null,
      is_active: true,
      terms_json: null,
      created_by: auth.user.id,
      updated_by: auth.user.id
    });

    if (agreementError) {
      throw agreementError;
    }
  }

  if (parsed.billingEntryTitle && parsed.billingEntryAmount != null) {
    const { error: entryError } = await supabase.from('billing_entries').insert({
      organization_id: caseRecord.organization_id,
      case_id: caseRecord.id,
      bill_to_party_kind: 'case_client',
      bill_to_case_client_id: caseClient.id,
      bill_to_case_organization_id: null,
      billing_owner_case_organization_id: null,
      entry_kind: 'retainer_fee',
      title: parsed.billingEntryTitle,
      amount: parsed.billingEntryAmount,
      tax_amount: 0,
      due_on: parsed.billingEntryDueOn || null,
      status: 'draft',
      notes: `${parsed.email}${parsed.relationLabel ? ` · ${parsed.relationLabel}` : ''}`,
      created_by: auth.user.id,
      updated_by: auth.user.id
    });

    if (entryError) {
      throw entryError;
    }

    await createBillingFollowUp({
      supabase,
      organizationId: caseRecord.organization_id,
      caseId: caseRecord.id,
      actorId: auth.user.id,
      actorName: auth.profile.full_name,
      title: parsed.billingEntryTitle,
      notes: `${parsed.email} 연결과 함께 비용 항목이 등록되었습니다.`,
      dueAt: parsed.billingEntryDueOn || null,
      isImportant: true,
      notificationTitle: `비용 확인: ${parsed.billingEntryTitle}`,
      notificationBody: `${caseRecord.title} 사건에서 ${parsed.email} 대상 비용 항목이 등록되었습니다. 비용 메뉴와 일정 확인에서 확인해 주세요.`,
      payload: {
        source: 'client_link_billing_entry'
      },
      scheduleKind: 'deadline'
    });
  }

  if (targetProfile?.id && parsed.portalEnabled) {
    const activatedAt = new Date().toISOString();
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        is_client_account: true,
        client_account_status: 'active',
        client_account_status_changed_at: activatedAt,
        client_account_status_reason: `${caseRecord.title} 사건 포털 연결 활성화`,
        client_last_approved_at: activatedAt
      })
      .eq('id', targetProfile.id);

    if (profileError) throw profileError;

    await notifyProfiles(supabase, [
      {
        organization_id: caseRecord.organization_id,
        case_id: caseRecord.id,
        recipient_profile_id: targetProfile.id,
        kind: 'generic',
        title: `새 사건이 연결되었습니다: ${caseRecord.title}`,
        body: '고객 포털에서 사건 진행상황을 확인할 수 있습니다.',
        action_label: '사건 보기',
        action_href: `/portal/cases/${caseRecord.id}`
      }
    ]);
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/billing');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
}

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
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from(bucket).remove([storagePath]);
    }
    throw error;
  }

  revalidatePath(`/cases/${caseId}`);
}

export async function requestDocumentReviewAction(documentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: document } = await supabase
    .from('case_documents')
    .select('id, case_id, organization_id, approval_requested_by, title')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('문서를 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(document.organization_id, {
    permission: 'document_create',
    errorMessage: '조직 구성원만 결재를 요청할 수 있습니다.'
  });

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('case_documents')
    .update({
      approval_status: 'pending_review',
      approval_requested_by: auth.user.id,
      approval_requested_by_name: auth.profile.full_name,
      approval_requested_at: now,
      updated_by: auth.user.id
    })
    .eq('id', documentId);

  if (updateError) {
    throw updateError;
  }

  const { error: reviewError } = await supabase.from('case_document_reviews').insert({
    organization_id: document.organization_id,
    case_id: document.case_id,
    case_document_id: documentId,
    request_status: 'pending_review',
    requested_by: auth.user.id,
    requested_by_name: auth.profile.full_name,
    snapshot_version: 0
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

  revalidatePath(`/cases/${document.case_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/inbox');
}

export async function reviewDocumentAction(documentId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: document } = await supabase
    .from('case_documents')
    .select('id, case_id, organization_id, approval_requested_by, title, row_version')
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

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('case_documents')
    .update({
      approval_status: parsed.decision,
      reviewed_by: auth.user.id,
      reviewed_by_name: auth.profile.full_name,
      reviewed_at: now,
      review_note: parsed.reviewNote || null,
      updated_by: auth.user.id
    })
    .eq('id', documentId);

  if (updateError) {
    throw updateError;
  }

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
        action_href: `/cases/${document.case_id}?tab=documents`
      }
    ]);
  }

  revalidatePath(`/cases/${document.case_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/inbox');
}

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

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
}

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
          action_href: `/portal/cases/${caseRecord.id}`
        }))
    );
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/inbox');
}

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

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/inbox');
}

export async function addBillingEntryAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_issue',
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

export async function addFeeAgreementAction(caseId: string, formData: FormData) {
  const { supabase, caseRecord } = await loadCaseOrThrow(caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'billing_issue',
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

  const termsJson = parsed.termsJson ? JSON.parse(parsed.termsJson || '{}') : {};

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
    notes: `${parsed.title} · ${parsed.agreementType}${parsed.fixedAmount != null ? ` · 고정금액 ${parsed.fixedAmount}` : ''}${parsed.rate != null ? ` · 비율 ${parsed.rate}%` : ''}${parsed.description ? `\n${parsed.description}` : ''}`,
    dueAt: parsed.effectiveTo || parsed.effectiveFrom || null,
    isImportant: Boolean(parsed.effectiveTo),
    notificationTitle: `비용 약정 등록: ${parsed.title}`,
    notificationBody: parsed.effectiveTo || parsed.effectiveFrom
      ? `${caseRecord.title} 사건에 ${parsed.title} 약정이 등록되었습니다. ${parsed.effectiveTo || parsed.effectiveFrom} 기준으로 약정 확인이 필요합니다.`
      : `${caseRecord.title} 사건에 ${parsed.title} 약정이 등록되었습니다. 비용 메뉴와 사건 Billing 탭에서 확인해 주세요.`,
    payload: {
      source: 'fee_agreement_created',
      agreement_title: parsed.title,
      agreement_type: parsed.agreementType,
      fixed_amount: parsed.fixedAmount ?? null,
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
  revalidatePath('/notifications');
}

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

  revalidatePath(`/cases/${caseId}`);
}
