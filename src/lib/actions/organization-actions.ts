'use server';

import type { Route } from 'next';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  hasActivePlatformAdminView,
  requireAuthenticatedUser,
  requireOrganizationActionAccess,
  requirePlatformAdminAction
} from '@/lib/auth';
import { createInvitationToken, hashInvitationToken } from '@/lib/invitations';
import { decodeInvitationNote, encodeInvitationNote } from '@/lib/invitation-metadata';
import { isValidKoreanBusinessNumber, makeSlug, normalizeBusinessNumber } from '@/lib/format';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDefaultTemplatePermissions, hasPermission, PERMISSION_KEYS } from '@/lib/permissions';
import {
  clientAccessCaseLinkSchema,
  clientAccessRequestSchema,
  clientAccessReviewSchema,
  invitationCreateSchema,
  membershipPermissionsSchema,
  membershipSetupSchema,
  organizationCreateSchema,
  organizationSignupSchema
} from '@/lib/validators';

const organizationSignupDocumentBucket = 'organization-signup-documents';
const maxOrganizationSignupDocumentSize = 10 * 1024 * 1024;
const allowedOrganizationSignupDocumentMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const allowedOrganizationSignupDocumentExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg']);

type OrganizationSignupDocumentMimeType = 'application/pdf' | 'image/png' | 'image/jpeg';
type OrganizationSignupVerificationStatus = 'matched' | 'mismatch' | 'unreadable';

function isPostgresUniqueViolation(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && `${(error as { code?: string }).code ?? ''}` === '23505'
  );
}

function resolveRequesterEmail(auth: { user: { email?: string | null }; profile: { email?: string | null } }) {
  const email = `${auth.user.email ?? auth.profile.email ?? ''}`.trim().toLowerCase();

  if (!email) {
    throw new Error('로그인 계정에 이메일 정보가 없어 요청을 제출할 수 없습니다. 카카오 계정 이메일 제공에 동의한 뒤 다시 시도해 주세요.');
  }

  return email;
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function listActivePlatformAdminIds() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('platform_role', 'platform_admin')
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []).map((row: { id: string }) => row.id).filter(Boolean);
}

function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extension = trimmed.includes('.') ? trimmed.split('.').pop()?.toLowerCase() ?? '' : '';
  const baseName = (extension ? trimmed.slice(0, -(extension.length + 1)) : trimmed)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'document';

  return extension ? `${baseName}.${extension}` : baseName;
}

function buildOrganizationSignupDocumentPath(requesterProfileId: string, fileName: string) {
  const safeName = sanitizeStorageFileName(fileName);
  return `requester/${requesterProfileId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
}

function detectOrganizationSignupDocumentType(fileBytes: Uint8Array): OrganizationSignupDocumentMimeType | null {
  if (
    fileBytes.length >= 8
    && fileBytes[0] === 0x89
    && fileBytes[1] === 0x50
    && fileBytes[2] === 0x4e
    && fileBytes[3] === 0x47
    && fileBytes[4] === 0x0d
    && fileBytes[5] === 0x0a
    && fileBytes[6] === 0x1a
    && fileBytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (fileBytes.length >= 3 && fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    fileBytes.length >= 5
    && fileBytes[0] === 0x25
    && fileBytes[1] === 0x50
    && fileBytes[2] === 0x44
    && fileBytes[3] === 0x46
    && fileBytes[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  return null;
}

function getAllowedOrganizationSignupDocumentExtensionsByType(type: OrganizationSignupDocumentMimeType) {
  if (type === 'application/pdf') {
    return new Set(['pdf']);
  }

  if (type === 'image/png') {
    return new Set(['png']);
  }

  return new Set(['jpg', 'jpeg']);
}

async function validateOrganizationSignupDocument(file: File) {
  if (file.size <= 0) {
    throw new Error('사업자등록증 파일을 업로드해 주세요.');
  }

  if (file.size > maxOrganizationSignupDocumentSize) {
    throw new Error('사업자등록증 파일은 10MB 이하만 업로드할 수 있습니다.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!allowedOrganizationSignupDocumentExtensions.has(extension)) {
    throw new Error('사업자등록증은 PDF, PNG, JPG 파일만 업로드할 수 있습니다.');
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedType = detectOrganizationSignupDocumentType(signature);
  if (!detectedType) {
    throw new Error('실제 파일 형식을 확인할 수 없습니다. PDF, PNG, JPG 파일만 업로드해 주세요.');
  }

  if (!getAllowedOrganizationSignupDocumentExtensionsByType(detectedType).has(extension)) {
    throw new Error('파일 확장자와 실제 파일 형식이 일치하지 않습니다. 파일을 다시 확인해 주세요.');
  }

  const mimeType = file.type.toLowerCase();
  if (mimeType && (!allowedOrganizationSignupDocumentMimeTypes.has(mimeType) || mimeType !== detectedType)) {
    throw new Error('파일 정보와 실제 파일 형식이 일치하지 않습니다. 다른 파일로 다시 시도해 주세요.');
  }

  return detectedType;
}

function extractBusinessNumberCandidates(text: string) {
  const matches = new Set<string>();

  for (const match of text.matchAll(/\d{3}[-\s]?\d{2}[-\s]?\d{5}/g)) {
    const normalized = normalizeBusinessNumber(match[0]);
    if (normalized.length === 10) {
      matches.add(normalized);
    }
  }

  for (const match of text.matchAll(/\d{10}/g)) {
    const normalized = normalizeBusinessNumber(match[0]);
    if (normalized.length === 10) {
      matches.add(normalized);
    }
  }

  return Array.from(matches);
}

async function verifyOrganizationSignupDocument(
  file: File,
  normalizedBusinessNumber: string,
  detectedType: OrganizationSignupDocumentMimeType
): Promise<{
  status: OrganizationSignupVerificationStatus;
  note: string;
  verifiedNumber: string | null;
}> {
  if (!isValidKoreanBusinessNumber(normalizedBusinessNumber)) {
    return {
      status: 'mismatch',
      note: '입력한 사업자등록번호가 유효하지 않습니다.',
      verifiedNumber: null
    };
  }

  if (detectedType.startsWith('image/')) {
    return {
      status: 'unreadable',
      note: '이미지 파일은 현재 자동 판독이 지원되지 않아 관리자 수기 확인이 필요합니다.',
      verifiedNumber: null
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const candidates = Array.from(new Set([
    ...extractBusinessNumberCandidates(buffer.toString('utf8')),
    ...extractBusinessNumberCandidates(buffer.toString('latin1'))
  ]));

  if (candidates.includes(normalizedBusinessNumber)) {
    return {
      status: 'matched',
      note: 'PDF 내부 텍스트에서 입력한 사업자등록번호와 일치하는 값을 찾았습니다.',
      verifiedNumber: normalizedBusinessNumber
    };
  }

  if (candidates.length > 0) {
    return {
      status: 'mismatch',
      note: `문서에서 다른 사업자등록번호 후보(${candidates[0]})가 감지되었습니다. 관리자 확인이 필요합니다.`,
      verifiedNumber: candidates[0]
    };
  }

  return {
    status: 'unreadable',
    note: '문서에서 사업자등록번호를 자동 추출하지 못했습니다. 관리자 수기 확인이 필요합니다.',
    verifiedNumber: null
  };
}

function buildOrganizationSlug(name: string) {
  const base = makeSlug(name) || 'org';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function findOrganizationForSignupRequest(requestId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('source_signup_request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function claimOrganizationSignupReviewLock(requestId: string, reviewerProfileId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('organization_signup_requests')
    .update({
      approval_locked_by_profile_id: reviewerProfileId,
      approval_locked_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .is('approval_locked_by_profile_id', null)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function clearOrganizationSignupReviewLock(requestId: string, reviewerProfileId: string) {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from('organization_signup_requests')
    .update({
      approval_locked_by_profile_id: null,
      approval_locked_at: null
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .eq('approval_locked_by_profile_id', reviewerProfileId);
}

async function createOrganizationCore({
  createdBy,
  name,
  kind,
  businessNumber,
  representativeName,
  representativeTitle,
  email,
  phone,
  addressLine1,
  addressLine2,
  postalCode,
  websiteUrl,
  requestedModules,
  sourceSignupRequestId,
  setDefaultOrganization = true
}: {
  createdBy: string;
  name: string;
  kind: 'law_firm' | 'collection_company' | 'mixed_practice' | 'corporate_legal_team' | 'other';
  businessNumber?: string | null;
  representativeName?: string | null;
  representativeTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  websiteUrl?: string | null;
  requestedModules?: string[];
  sourceSignupRequestId?: string | null;
  setDefaultOrganization?: boolean;
}) {
  const supabase = createSupabaseAdminClient();

  const enabledModules = Object.fromEntries([
    ['billing', true],
    ['collections', requestedModules?.includes('collections') || kind === 'collection_company' || kind === 'mixed_practice'],
    ['client_portal', requestedModules?.includes('client_portal') ?? true],
    ['reports', true]
  ]);

  let organization = sourceSignupRequestId ? await findOrganizationForSignupRequest(sourceSignupRequestId) : null;

  if (!organization) {
    const slug = buildOrganizationSlug(name);
    const { data: createdOrganization, error: organizationError } = await supabase
      .from('organizations')
      .insert({
        slug,
        name,
        kind,
        business_number: businessNumber || null,
        representative_name: representativeName || null,
        representative_title: representativeTitle || null,
        email: email || null,
        phone: phone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        postal_code: postalCode || null,
        website_url: websiteUrl || null,
        enabled_modules: enabledModules,
        onboarding_status: 'approved',
        created_by: createdBy,
        source_signup_request_id: sourceSignupRequestId || null
      })
      .select('id, slug')
      .single();

    if (organizationError) {
      if (!sourceSignupRequestId || !isPostgresUniqueViolation(organizationError)) {
        throw organizationError;
      }

      organization = await findOrganizationForSignupRequest(sourceSignupRequestId);
      if (!organization) {
        throw organizationError;
      }
    } else if (!createdOrganization) {
      throw new Error('Failed to create organization');
    } else {
      organization = createdOrganization;
    }
  }

  const { error: membershipError } = await supabase.from('organization_memberships').upsert({
    organization_id: organization.id,
    profile_id: createdBy,
    role: 'org_owner',
    status: 'active',
    actor_category: 'admin',
    permission_template_key: 'admin_general',
    case_scope_policy: 'all_org_cases',
    title: '대표 관리자',
    is_primary: true,
    permissions: getDefaultTemplatePermissions('admin_general')
  }, {
    onConflict: 'organization_id,profile_id'
  });

  if (membershipError) throw membershipError;

  if (setDefaultOrganization) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ default_organization_id: organization.id })
      .eq('id', createdBy);

    if (profileError) throw profileError;
  }

  return organization;
}

async function requireOrganizationUserManagementAccess(organizationId: string, errorMessage: string) {
  return requireOrganizationActionAccess(organizationId, {
    requireManager: true,
    permission: 'user_manage',
    errorMessage
  });
}

function parseStaffInvitationInput(formData: FormData) {
  return invitationCreateSchema.parse({
    organizationId: formData.get('organizationId'),
    email: formData.get('email'),
    kind: 'staff_invite',
    caseId: '',
    membershipTitle: formData.get('membershipTitle'),
    note: formData.get('note'),
    expiresHours: formData.get('expiresHours') || 72,
    actorCategory: formData.get('actorCategory') || 'staff',
    roleTemplateKey: formData.get('roleTemplateKey') || 'office_manager',
    caseScopePolicy: formData.get('caseScopePolicy') || 'assigned_cases_only'
  });
}

function buildStaffInvitationRecord(parsed: ReturnType<typeof parseStaffInvitationInput>, actorId: string) {
  const token = createInvitationToken();
  const requestedRole = parsed.actorCategory === 'admin' ? 'org_manager' : 'org_staff';

  return {
    token,
    record: {
      organization_id: parsed.organizationId,
      kind: 'staff_invite',
      email: parsed.email,
      requested_role: requestedRole,
      actor_category: parsed.actorCategory,
      role_template_key: parsed.roleTemplateKey,
      case_scope_policy: parsed.caseScopePolicy,
      permissions_override: {},
      token_hash: hashInvitationToken(token),
      share_token: null,
      token_hint: token.slice(-6),
      note: encodeInvitationNote(parsed.note, parsed.membershipTitle),
      created_by: actorId,
      expires_at: new Date(Date.now() + parsed.expiresHours * 60 * 60 * 1000).toISOString()
    }
  };
}

async function persistStaffInvitation(record: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('invitations').insert(record);
  if (error) throw error;
}

async function loadPendingInvitationByToken(token: string) {
  const adminClient = createSupabaseAdminClient();
  const { data: invitation, error } = await adminClient
    .from('invitations')
    .select('*')
    .eq('token_hash', hashInvitationToken(token))
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !invitation) {
    throw error ?? new Error('초대 링크를 찾을 수 없습니다.');
  }

  return { adminClient, invitation };
}

function validateInvitationAcceptance(invitation: any, signedInEmail: string | null | undefined) {
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new Error('만료된 초대 링크입니다.');
  }

  if ((signedInEmail ?? '').toLowerCase() !== String(invitation.email).toLowerCase()) {
    throw new Error('초대받은 이메일과 로그인 계정이 일치하지 않습니다.');
  }
}

async function applyStaffInvitation({ adminClient, invitation, userId }: { adminClient: ReturnType<typeof createSupabaseAdminClient>; invitation: any; userId: string; }) {
  const invitationMeta = decodeInvitationNote(invitation.note);
  const templateKey = invitation.role_template_key ?? (invitation.requested_role === 'org_manager' ? 'admin_general' : 'office_manager');
  const actorCategory = invitation.actor_category ?? (invitation.requested_role === 'org_manager' ? 'admin' : 'staff');
  const caseScopePolicy = invitation.case_scope_policy ?? (actorCategory === 'admin' ? 'all_org_cases' : 'assigned_cases_only');
  const basePermissions = getDefaultTemplatePermissions(templateKey);
  const overridePermissions = invitation.permissions_override ?? {};

  const { error: membershipError } = await adminClient
    .from('organization_memberships')
    .upsert({
      organization_id: invitation.organization_id,
      profile_id: userId,
      role: invitation.requested_role ?? 'org_staff',
      title: invitationMeta.membershipTitle,
      actor_category: actorCategory,
      permission_template_key: templateKey,
      case_scope_policy: caseScopePolicy,
      permissions: { ...basePermissions, ...overridePermissions },
      status: 'active',
      is_primary: false
    }, { onConflict: 'organization_id,profile_id' });

  if (membershipError) throw membershipError;

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ default_organization_id: invitation.organization_id })
    .eq('id', userId);

  if (profileError) throw profileError;
}

async function applyClientInvitation({ adminClient, invitation, userId, profileName, profileEmail }: {
  adminClient: ReturnType<typeof createSupabaseAdminClient>;
  invitation: any;
  userId: string;
  profileName?: string | null;
  profileEmail?: string | null;
}) {
  const targetCaseClientId = invitation.case_client_id;
  const activatedAt = new Date().toISOString();

  if (targetCaseClientId) {
    const { error: updateClientError } = await adminClient
      .from('case_clients')
      .update({ profile_id: userId, is_portal_enabled: true })
      .eq('id', targetCaseClientId);
    if (updateClientError) throw updateClientError;

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        is_client_account: true,
        client_account_status: 'active',
        client_account_status_changed_at: activatedAt,
        client_account_status_reason: '의뢰인 초대 수락으로 활성화',
        client_last_approved_at: activatedAt
      })
      .eq('id', userId);

    if (profileError) throw profileError;
    return;
  }

  const { data: existingClient } = await adminClient
    .from('case_clients')
    .select('id')
    .eq('case_id', invitation.case_id)
    .eq('client_email_snapshot', invitation.email)
    .maybeSingle();

  if (existingClient?.id) {
    const { error: updateClientError } = await adminClient
      .from('case_clients')
      .update({ profile_id: userId, is_portal_enabled: true })
      .eq('id', existingClient.id);
    if (updateClientError) throw updateClientError;

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        is_client_account: true,
        client_account_status: 'active',
        client_account_status_changed_at: activatedAt,
        client_account_status_reason: '의뢰인 초대 수락으로 활성화',
        client_last_approved_at: activatedAt
      })
      .eq('id', userId);

    if (profileError) throw profileError;
    return;
  }

  const { data: caseRow } = await adminClient
    .from('cases')
    .select('organization_id, title')
    .eq('id', invitation.case_id)
    .single();

  if (!caseRow) {
    throw new Error('사건 정보를 찾을 수 없습니다.');
  }

  const { error: insertClientError } = await adminClient
    .from('case_clients')
    .insert({
      organization_id: caseRow.organization_id,
      case_id: invitation.case_id,
      profile_id: userId,
      client_name: invitation.invited_name || profileName,
      client_email_snapshot: profileEmail,
      relation_label: '의뢰인',
      is_portal_enabled: true,
      created_by: invitation.created_by,
      updated_by: invitation.created_by
    });
  if (insertClientError) throw insertClientError;

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      is_client_account: true,
      client_account_status: 'active',
      client_account_status_changed_at: activatedAt,
      client_account_status_reason: '의뢰인 초대 수락으로 활성화',
      client_last_approved_at: activatedAt
    })
    .eq('id', userId);

  if (profileError) throw profileError;
}

async function finalizeInvitationAcceptance(adminClient: ReturnType<typeof createSupabaseAdminClient>, invitationId: string, acceptedBy: string) {
  const { error } = await adminClient
    .from('invitations')
    .update({ status: 'accepted', accepted_by: acceptedBy, accepted_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) throw error;
}

function finalizeInvitationAcceptanceNavigation(kind: string) {
  revalidatePath('/settings/team');
  revalidatePath('/clients');
  revalidatePath('/cases');

  if (kind === 'staff_invite') {
    redirect('/dashboard');
  }

  redirect('/portal');
}

export async function createOrganizationAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 조직을 생성할 수 있습니다.');
  const parsed = organizationCreateSchema.parse({
    name: formData.get('name'),
    kind: formData.get('kind') || 'law_firm',
    businessNumber: formData.get('businessNumber'),
    representativeName: formData.get('representativeName'),
    representativeTitle: formData.get('representativeTitle'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2'),
    postalCode: formData.get('postalCode'),
    websiteUrl: formData.get('websiteUrl'),
    requestedModules: formData.getAll('requestedModules').map(String)
  });

  const organization = await createOrganizationCore({
    createdBy: auth.user.id,
    name: parsed.name,
    kind: parsed.kind,
    businessNumber: parsed.businessNumber || null,
    representativeName: parsed.representativeName || null,
    representativeTitle: parsed.representativeTitle || null,
    email: parsed.email || null,
    phone: parsed.phone || null,
    addressLine1: parsed.addressLine1 || null,
    addressLine2: parsed.addressLine2 || null,
    postalCode: parsed.postalCode || null,
    websiteUrl: parsed.websiteUrl || null,
    requestedModules: parsed.requestedModules,
    setDefaultOrganization: false
  });

  revalidatePath('/organizations');
  revalidatePath('/admin/organization-requests');
  redirect(`/organizations/${organization.id}`);
}

export async function submitOrganizationSignupRequestAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  let storagePath: string | null = null;
  let requestPersisted = false;
  try {
    const parsed = organizationSignupSchema.parse({
      name: formData.get('name'),
      kind: formData.get('kind') || 'law_firm',
      businessNumber: formData.get('businessNumber'),
      businessRegistrationDocument: formData.get('businessRegistrationDocument'),
      representativeName: formData.get('representativeName'),
      representativeTitle: formData.get('representativeTitle'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      addressLine1: formData.get('addressLine1'),
      addressLine2: formData.get('addressLine2'),
      postalCode: formData.get('postalCode'),
      websiteUrl: formData.get('websiteUrl'),
      requestedModules: formData.getAll('requestedModules').map(String),
      note: formData.get('note')
    });

    const detectedDocumentType = await validateOrganizationSignupDocument(parsed.businessRegistrationDocument);

    const requesterEmail = resolveRequesterEmail(auth);
    const normalizedBusinessNumber = normalizeBusinessNumber(parsed.businessNumber);
    const verification = await verifyOrganizationSignupDocument(parsed.businessRegistrationDocument, normalizedBusinessNumber, detectedDocumentType);
    storagePath = buildOrganizationSignupDocumentPath(auth.user.id, parsed.businessRegistrationDocument.name);

    const { error: uploadError } = await admin.storage.from(organizationSignupDocumentBucket).upload(storagePath, parsed.businessRegistrationDocument, {
      contentType: detectedDocumentType,
      upsert: false
    });

    if (uploadError) throw uploadError;

    const { data: requestRow, error } = await supabase.from('organization_signup_requests').insert({
      requester_profile_id: auth.user.id,
      requester_email: requesterEmail,
      organization_name: parsed.name,
      organization_kind: parsed.kind,
      business_number: normalizedBusinessNumber,
      representative_name: parsed.representativeName || null,
      representative_title: parsed.representativeTitle || null,
      contact_phone: parsed.phone || null,
      website_url: parsed.websiteUrl || null,
      requested_modules: parsed.requestedModules,
      note: parsed.note || null,
      business_registration_document_path: storagePath,
      business_registration_document_name: parsed.businessRegistrationDocument.name,
      business_registration_document_mime_type: detectedDocumentType,
      business_registration_document_size: parsed.businessRegistrationDocument.size,
      business_registration_verification_status: verification.status,
      business_registration_verification_note: verification.note,
      business_registration_verified_number: verification.verifiedNumber,
      business_registration_verified_at: new Date().toISOString()
    }).select('id').single();

    if (error) throw error;
    requestPersisted = true;

    try {
      const { error: notificationError } = await admin.from('notifications').insert({
        recipient_profile_id: auth.user.id,
        kind: 'generic',
        title: '조직 개설 신청이 접수되었습니다.',
        body: `현재 단계 구현 필요사항 메모: 사업자등록번호 체크섬 검증, 사업자등록증 업로드 보관, PDF 텍스트 기반 1차 자동 대조까지 적용되었습니다. 정부24/홈택스 API 연동 전까지는 이미지 파일과 판독 불가 문서는 운영팀이 최종 확인합니다.${requestRow?.id ? ` 신청 번호: ${requestRow.id}` : ''}`,
        payload: {
          category: 'organization_signup_submission',
          request_id: requestRow?.id ?? null,
          verification_status: verification.status
        },
        action_label: '알림 보기',
        action_href: '/notifications'
      });

      if (notificationError) throw notificationError;

      const platformAdminIds = (await listActivePlatformAdminIds()).filter((profileId) => profileId !== auth.user.id);
      if (platformAdminIds.length) {
        const { error: adminNotificationError } = await admin.from('notifications').insert(
          platformAdminIds.map((profileId) => ({
            recipient_profile_id: profileId,
            kind: 'generic',
            title: '새 조직 개설 신청이 접수되었습니다.',
            body: `${parsed.name} 조직 신청이 접수되었습니다. 사업자등록번호 자동 대조 결과는 ${verification.status} 상태입니다. 검토 대기열에서 확인해 주세요.`,
            payload: {
              category: 'organization_signup_review',
              request_id: requestRow?.id ?? null,
              verification_status: verification.status,
              organization_name: parsed.name
            },
            requires_action: true,
            action_label: '조직 신청 검토',
            action_href: '/admin/organization-requests',
            action_entity_type: 'organization_signup_request',
            action_target_id: requestRow?.id ?? null
          }))
        );

        if (adminNotificationError) throw adminNotificationError;
      }
    } catch (notificationError) {
      console.warn('organization signup notification delivery failed', notificationError);
    }
  } catch (error) {
    if (!requestPersisted && storagePath) {
      await admin.storage.from(organizationSignupDocumentBucket).remove([storagePath]).catch(() => undefined);
    }

    const message = getActionErrorMessage(error, '조직 개설 신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    redirect(`/organization-request?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/organization-request');
  revalidatePath('/organizations');
  revalidatePath('/admin/organization-requests');
  redirect('/organization-request?submitted=1');
}

export async function updateOrganizationSignupRequestAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const admin = createSupabaseAdminClient();
  const requestId = `${formData.get('requestId') ?? ''}`.trim();

  if (!requestId) {
    redirect(`/organization-request?error=${encodeURIComponent('수정할 신청 정보를 찾을 수 없습니다.')}` as Route);
  }

  let nextStoragePath: string | null = null;
  let previousStoragePath: string | null = null;

  try {
    const { data: existingRequest, error: existingRequestError } = await admin
      .from('organization_signup_requests')
      .select('*')
      .eq('id', requestId)
      .eq('requester_profile_id', auth.user.id)
      .single();

    if (existingRequestError || !existingRequest) {
      throw existingRequestError ?? new Error('수정할 신청 내역을 찾을 수 없습니다.');
    }

    if (existingRequest.status !== 'pending') {
      throw new Error('검토 대기 상태의 신청만 수정할 수 있습니다.');
    }

    const parsed = organizationCreateSchema.extend({
      requestId: z.string().uuid(),
      note: z.string().trim().max(1000).optional().or(z.literal('')),
      businessNumber: z.string().trim().min(1, '사업자등록번호를 입력해 주세요.')
        .refine((value) => normalizeBusinessNumber(value).length === 10, '사업자등록번호는 숫자 10자리여야 합니다.')
        .refine((value) => isValidKoreanBusinessNumber(value), '유효한 사업자등록번호를 입력해 주세요.'),
      businessRegistrationDocument: z.any().optional()
    }).parse({
      requestId,
      name: formData.get('name'),
      kind: formData.get('kind') || 'law_firm',
      businessNumber: formData.get('businessNumber'),
      businessRegistrationDocument: formData.get('businessRegistrationDocument'),
      representativeName: formData.get('representativeName'),
      representativeTitle: formData.get('representativeTitle'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      addressLine1: formData.get('addressLine1'),
      addressLine2: formData.get('addressLine2'),
      postalCode: formData.get('postalCode'),
      websiteUrl: formData.get('websiteUrl'),
      requestedModules: formData.getAll('requestedModules').map(String),
      note: formData.get('note')
    });

    const requesterEmail = resolveRequesterEmail(auth);
    const normalizedBusinessNumber = normalizeBusinessNumber(parsed.businessNumber);
    const replacementDocument = parsed.businessRegistrationDocument instanceof File && parsed.businessRegistrationDocument.size > 0
      ? parsed.businessRegistrationDocument
      : null;

    let documentMimeType = existingRequest.business_registration_document_mime_type as string | null;
    let documentName = existingRequest.business_registration_document_name as string | null;
    let documentSize = existingRequest.business_registration_document_size as number | null;
    let verificationStatus = existingRequest.business_registration_verification_status as string | null;
    let verificationNote = existingRequest.business_registration_verification_note as string | null;
    let verifiedNumber = existingRequest.business_registration_verified_number as string | null;
    let verifiedAt = existingRequest.business_registration_verified_at as string | null;

    if (replacementDocument) {
      const detectedDocumentType = await validateOrganizationSignupDocument(replacementDocument);
      const verification = await verifyOrganizationSignupDocument(replacementDocument, normalizedBusinessNumber, detectedDocumentType);
      nextStoragePath = buildOrganizationSignupDocumentPath(auth.user.id, replacementDocument.name);

      const { error: uploadError } = await admin.storage.from(organizationSignupDocumentBucket).upload(nextStoragePath, replacementDocument, {
        contentType: detectedDocumentType,
        upsert: false
      });

      if (uploadError) throw uploadError;

      previousStoragePath = existingRequest.business_registration_document_path as string | null;
      documentMimeType = detectedDocumentType;
      documentName = replacementDocument.name;
      documentSize = replacementDocument.size;
      verificationStatus = verification.status;
      verificationNote = verification.note;
      verifiedNumber = verification.verifiedNumber;
      verifiedAt = new Date().toISOString();
    } else if (normalizedBusinessNumber !== existingRequest.business_number) {
      verificationStatus = 'pending_review';
      verificationNote = '사업자등록번호가 변경되어 운영팀이 제출 문서를 다시 확인해야 합니다.';
      verifiedNumber = null;
      verifiedAt = new Date().toISOString();
    }

    const { error: updateError } = await admin
      .from('organization_signup_requests')
      .update({
        requester_email: requesterEmail,
        organization_name: parsed.name,
        organization_kind: parsed.kind,
        business_number: normalizedBusinessNumber,
        representative_name: parsed.representativeName || null,
        representative_title: parsed.representativeTitle || null,
        contact_phone: parsed.phone || null,
        website_url: parsed.websiteUrl || null,
        requested_modules: parsed.requestedModules,
        note: parsed.note || null,
        business_registration_document_path: nextStoragePath ?? existingRequest.business_registration_document_path,
        business_registration_document_name: documentName,
        business_registration_document_mime_type: documentMimeType,
        business_registration_document_size: documentSize,
        business_registration_verification_status: verificationStatus,
        business_registration_verification_note: verificationNote,
        business_registration_verified_number: verifiedNumber,
        business_registration_verified_at: verifiedAt
      })
      .eq('id', requestId)
      .eq('requester_profile_id', auth.user.id)
      .eq('status', 'pending');

    if (updateError) throw updateError;

    if (previousStoragePath) {
      await admin.storage.from(organizationSignupDocumentBucket).remove([previousStoragePath]).catch(() => undefined);
    }
  } catch (error) {
    if (nextStoragePath) {
      await admin.storage.from(organizationSignupDocumentBucket).remove([nextStoragePath]).catch(() => undefined);
    }

    const message = getActionErrorMessage(error, '조직 개설 신청 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    redirect(`/organization-request?edit=${encodeURIComponent(requestId)}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/organization-request');
  revalidatePath('/admin/organization-requests');
  redirect('/organization-request?updated=1');
}

export async function cancelOrganizationSignupRequestAction(formData: FormData) {
  await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const requestId = `${formData.get('requestId') ?? ''}`.trim();

  if (!requestId) {
    redirect(`/organization-request?error=${encodeURIComponent('취소할 신청 정보를 찾을 수 없습니다.')}` as Route);
  }

  try {
    const { error } = await supabase.rpc('cancel_organization_signup_request_atomic', {
      p_request_id: requestId
    });

    if (error) throw error;
  } catch (error) {
    const message = getActionErrorMessage(error, '조직 개설 신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    redirect(`/organization-request?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/organization-request');
  revalidatePath('/admin/organization-requests');
  redirect('/organization-request?cancelled=1');
}

export async function reviewOrganizationSignupRequestAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 조직 개설 신청을 검토할 수 있습니다.');
  const admin = createSupabaseAdminClient();
  const requestId = `${formData.get('requestId') ?? ''}`;
  const decision = `${formData.get('decision') ?? ''}`;
  const reviewNote = `${formData.get('reviewNote') ?? ''}`;

  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    throw new Error('잘못된 요청입니다.');
  }

  const { data: initialRequestRow, error: requestError } = await admin
    .from('organization_signup_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError || !initialRequestRow) throw requestError ?? new Error('요청을 찾을 수 없습니다.');
  if (!initialRequestRow.requester_profile_id) throw new Error('신청자 프로필이 연결되어 있지 않습니다.');

  if (initialRequestRow.status === 'approved' && initialRequestRow.approved_organization_id) {
    revalidatePath('/admin/organization-requests');
    revalidatePath('/organizations');
    revalidatePath('/organization-request');
    revalidatePath('/notifications');
    redirect(`/organizations/${initialRequestRow.approved_organization_id}`);
  }

  if (initialRequestRow.status !== 'pending') {
    throw new Error('이미 처리된 요청입니다.');
  }

  let requestRow = initialRequestRow;
  let ownsReviewLock = initialRequestRow.approval_locked_by_profile_id === auth.user.id;

  if (!ownsReviewLock) {
    if (initialRequestRow.approval_locked_by_profile_id && initialRequestRow.approval_locked_by_profile_id !== auth.user.id) {
      throw new Error('다른 관리자가 현재 이 신청을 처리 중입니다. 잠시 후 다시 확인해 주세요.');
    }

    const claimedRow = await claimOrganizationSignupReviewLock(requestId, auth.user.id);
    if (!claimedRow) {
      const { data: refreshedRequest, error: refreshedRequestError } = await admin
        .from('organization_signup_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (refreshedRequestError || !refreshedRequest) {
        throw refreshedRequestError ?? new Error('요청을 다시 불러오지 못했습니다.');
      }

      if (refreshedRequest.status === 'approved' && refreshedRequest.approved_organization_id) {
        revalidatePath('/admin/organization-requests');
        revalidatePath('/organizations');
        revalidatePath('/organization-request');
        revalidatePath('/notifications');
        redirect(`/organizations/${refreshedRequest.approved_organization_id}`);
      }

      if (refreshedRequest.status !== 'pending') {
        throw new Error('이미 처리된 요청입니다.');
      }

      if (refreshedRequest.approval_locked_by_profile_id && refreshedRequest.approval_locked_by_profile_id !== auth.user.id) {
        throw new Error('다른 관리자가 현재 이 신청을 처리 중입니다. 잠시 후 다시 확인해 주세요.');
      }

      requestRow = refreshedRequest;
    } else {
      requestRow = claimedRow;
      ownsReviewLock = true;
    }
  }

  const resolvedAt = new Date().toISOString();

  const resolvePendingReviewNotifications = async () => {
    const { error: resolveNotificationError } = await admin
      .from('notifications')
      .update({ resolved_at: resolvedAt })
      .eq('action_entity_type', 'organization_signup_request')
      .eq('action_target_id', requestId)
      .is('resolved_at', null);

    if (resolveNotificationError) throw resolveNotificationError;
  };

  const notifyRequester = async (title: string, body: string, actionHref: string | null) => {
    const { error: requesterNotificationError } = await admin.from('notifications').insert({
      recipient_profile_id: requestRow.requester_profile_id,
      kind: 'generic',
      title,
      body,
      payload: {
        category: 'organization_signup_result',
        request_id: requestId,
        decision
      },
      action_label: actionHref ? '신청 현황 보기' : null,
      action_href: actionHref
    });

    if (requesterNotificationError) throw requesterNotificationError;
  };

  try {
    if (decision === 'approved') {
      const organization = await createOrganizationCore({
        createdBy: requestRow.requester_profile_id,
        name: requestRow.organization_name,
        kind: requestRow.organization_kind,
        businessNumber: requestRow.business_number,
        representativeName: requestRow.representative_name,
        representativeTitle: requestRow.representative_title,
        email: requestRow.requester_email,
        phone: requestRow.contact_phone,
        websiteUrl: requestRow.website_url,
        requestedModules: requestRow.requested_modules || [],
        sourceSignupRequestId: requestRow.id
      });

      const { data: finalizedRequest, error: updateError } = await admin
        .from('organization_signup_requests')
        .update({
          status: 'approved',
          reviewed_by: auth.user.id,
          reviewed_note: reviewNote || null,
          reviewed_at: resolvedAt,
          approved_organization_id: organization.id,
          approval_locked_by_profile_id: null,
          approval_locked_at: null
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .eq('approval_locked_by_profile_id', auth.user.id)
        .select('*')
        .maybeSingle();

      if (updateError) throw updateError;

      if (!finalizedRequest) {
        const { data: refreshedRequest, error: refreshedRequestError } = await admin
          .from('organization_signup_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();

        if (refreshedRequestError || !refreshedRequest) {
          throw refreshedRequestError ?? new Error('승인 상태를 다시 확인하지 못했습니다.');
        }

        if (refreshedRequest.status !== 'approved' || refreshedRequest.approved_organization_id !== organization.id) {
          throw new Error('승인 상태를 확정하지 못했습니다. 다시 시도해 주세요.');
        }
      }

      ownsReviewLock = false;
      await resolvePendingReviewNotifications();
      await notifyRequester(
        '조직 개설 신청이 승인되었습니다.',
        `${requestRow.organization_name} 조직 개설 신청이 승인되었습니다. 이제 조직 워크스페이스를 사용할 수 있습니다.${reviewNote ? ` 검토 메모: ${reviewNote}` : ''}`,
        '/organizations'
      );

      revalidatePath('/admin/organization-requests');
      revalidatePath('/organizations');
      revalidatePath('/organization-request');
      revalidatePath('/notifications');
      redirect(`/organizations/${organization.id}`);
    }

    const { error: updateError } = await admin
      .from('organization_signup_requests')
      .update({
        status: 'rejected',
        reviewed_by: auth.user.id,
        reviewed_note: reviewNote || '반려',
        reviewed_at: resolvedAt,
        approval_locked_by_profile_id: null,
        approval_locked_at: null
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .eq('approval_locked_by_profile_id', auth.user.id);

    if (updateError) throw updateError;

    ownsReviewLock = false;
    await resolvePendingReviewNotifications();
    await notifyRequester(
      '조직 개설 신청이 반려되었습니다.',
      `${requestRow.organization_name} 조직 개설 신청이 반려되었습니다.${reviewNote ? ` 반려 사유: ${reviewNote}` : ''}`,
      '/organization-request'
    );

    revalidatePath('/admin/organization-requests');
    revalidatePath('/organization-request');
    revalidatePath('/notifications');
  } catch (error) {
    if (ownsReviewLock) {
      await clearOrganizationSignupReviewLock(requestId, auth.user.id);
    }
    throw error;
  }
}

export async function createStaffInvitationAction(formData: FormData) {
  const parsed = parseStaffInvitationInput(formData);

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 직원을 초대할 수 있습니다.');
  const { token, record } = buildStaffInvitationRecord(parsed, auth.user.id);

  await persistStaffInvitation(record);

  revalidatePath('/settings/team');
  redirect(`/settings/team?invite=${encodeURIComponent(token)}`);
}

export async function updateMembershipPermissionsAction(formData: FormData) {
  const membershipId = `${formData.get('membershipId') ?? ''}`;
  const organizationId = `${formData.get('organizationId') ?? ''}`;
  const { auth } = await requireOrganizationUserManagementAccess(organizationId, '권한 설정 권한이 없습니다.');
  const supabase = await createSupabaseServerClient();

  const setup = membershipSetupSchema.parse({
    actorCategory: formData.get('actorCategory'),
    roleTemplateKey: formData.get('roleTemplateKey'),
    caseScopePolicy: formData.get('caseScopePolicy'),
    membershipTitle: formData.get('membershipTitle')
  });

  const permissionValues = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, formData.get(key) === 'on'])
  );

  const parsed = membershipPermissionsSchema.parse(permissionValues);
  const role = setup.actorCategory === 'admin' ? 'org_manager' : 'org_staff';

  const { error } = await supabase
    .from('organization_memberships')
    .update({
      role,
      title: setup.membershipTitle || null,
      actor_category: setup.actorCategory,
      permission_template_key: setup.roleTemplateKey,
      case_scope_policy: setup.caseScopePolicy,
      permissions: parsed
    })
    .eq('id', membershipId)
    .eq('organization_id', organizationId);

  if (error) throw error;

  revalidatePath('/settings/team');
  revalidatePath(`/organizations/${organizationId}`);
}

export async function switchDefaultOrganizationAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const organizationId = `${formData.get('organizationId') ?? ''}`;
  const canUsePlatformScope = await hasActivePlatformAdminView(auth);

  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  if (!hasMembership && !canUsePlatformScope) {
    throw new Error('No membership for the requested organization');
  }

  if (!hasMembership && canUsePlatformScope) {
    const supabase = await createSupabaseServerClient();
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .neq('lifecycle_status', 'soft_deleted')
      .maybeSingle();

    if (organizationError || !organization) {
      throw organizationError ?? new Error('Organization not found');
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ default_organization_id: organizationId })
    .eq('id', auth.user.id);

  if (error) {
    throw error;
  }

  revalidatePath('/dashboard');
  revalidatePath('/cases');
  revalidatePath('/settings/team');
  revalidatePath('/organizations');
}

export async function submitClientAccessRequestAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const adminClient = createSupabaseAdminClient();
  try {
    if (!auth.profile.is_client_account) {
      throw new Error('의뢰인 가입 정보를 먼저 등록한 뒤 조직 연결 요청을 보낼 수 있습니다.');
    }

    const parsed = clientAccessRequestSchema.parse({
      organizationId: formData.get('organizationId'),
      organizationKey: formData.get('organizationKey'),
      requestNote: formData.get('requestNote')
    });

    const requesterEmail = resolveRequesterEmail(auth);

    const { data: organization, error: organizationError } = await adminClient
      .from('organizations')
      .select('id, name, slug')
      .eq('id', parsed.organizationId)
      .neq('lifecycle_status', 'soft_deleted')
      .maybeSingle();

    if (organizationError || !organization) {
      throw organizationError ?? new Error('조직 정보를 찾을 수 없습니다.');
    }

    if ((organization.slug ?? '').toLowerCase() !== parsed.organizationKey.toLowerCase()) {
      throw new Error('조직 키가 일치하지 않습니다.');
    }

    const { data: existingPending } = await adminClient
      .from('client_access_requests')
      .select('id')
      .eq('target_organization_id', parsed.organizationId)
      .eq('requester_profile_id', auth.user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending?.id) {
      throw new Error('이미 처리 대기 중인 연결 요청이 있습니다.');
    }

    const { data: requestRow, error } = await adminClient
      .from('client_access_requests')
      .insert({
        target_organization_id: parsed.organizationId,
        target_organization_key: organization.slug,
        requester_profile_id: auth.user.id,
        requester_name: auth.profile.full_name,
        requester_email: requesterEmail,
        request_note: parsed.requestNote || null
      })
      .select('id')
      .single();

    if (error || !requestRow) throw error ?? new Error('협업 연결 요청을 저장하지 못했습니다.');

    const { data: managers } = await adminClient
      .from('organization_memberships')
      .select('profile_id')
      .eq('organization_id', parsed.organizationId)
      .in('role', ['org_owner', 'org_manager'])
      .eq('status', 'active');

    const managerRows = (managers ?? [])
      .map((item: any) => item.profile_id)
      .filter(Boolean)
      .map((profileId: string) => ({
        organization_id: parsed.organizationId,
        recipient_profile_id: profileId,
        kind: 'generic',
        title: '새 의뢰인 협업 요청이 도착했습니다.',
        body: `${auth.profile.full_name}님이 ${organization.name} 조직에 협업 연결을 요청했습니다.`,
        payload: { requester_profile_id: auth.user.id, target_organization_id: parsed.organizationId, request_id: requestRow.id },
        requires_action: true,
        action_label: '연결 요청 검토',
        action_href: '/clients',
        action_entity_type: 'client_access_request',
        action_target_id: requestRow.id
      }));

    if (managerRows.length) {
      const { error: notificationError } = await adminClient.from('notifications').insert(managerRows);
      if (notificationError) throw notificationError;
    }
  } catch (error) {
    const message = getActionErrorMessage(error, '조직가입신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    redirect(`/client-access?error=${encodeURIComponent(message)}` as Route);
  }

  revalidatePath('/client-access');
  redirect('/client-access' as Route);
}

export async function reviewClientAccessRequestAction(formData: FormData) {
  const parsed = clientAccessReviewSchema.parse({
    requestId: formData.get('requestId'),
    organizationId: formData.get('organizationId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote')
  });
  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '의뢰인 연결 요청을 검토할 권한이 없습니다.');

  const adminClient = createSupabaseAdminClient();
  const { data: requestRow, error: requestError } = await adminClient
    .from('client_access_requests')
    .select('id, requester_profile_id, requester_name, target_organization_id, status, organization:organizations(name)')
    .eq('id', parsed.requestId)
    .eq('target_organization_id', parsed.organizationId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw requestError ?? new Error('연결 요청을 찾을 수 없습니다.');
  }

  if (requestRow.status !== 'pending') {
    throw new Error('이미 처리된 연결 요청입니다.');
  }

  const nextStatus = parsed.decision === 'approved' ? 'approved' : 'rejected';
  const resolvedAt = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from('client_access_requests')
    .update({
      status: nextStatus,
      review_note: parsed.reviewNote || null,
      reviewed_by: auth.user.id,
      reviewed_at: resolvedAt
    })
    .eq('id', parsed.requestId);

  if (updateError) throw updateError;

  await adminClient
    .from('notifications')
    .update({ resolved_at: resolvedAt })
    .eq('organization_id', parsed.organizationId)
    .eq('action_entity_type', 'client_access_request')
    .eq('action_target_id', parsed.requestId)
    .is('resolved_at', null);

  const orgName = (requestRow.organization as any)?.name ?? '선택한 조직';

  const { error: notificationError } = await adminClient.from('notifications').insert({
    organization_id: parsed.organizationId,
    recipient_profile_id: requestRow.requester_profile_id,
    kind: 'generic',
    title: parsed.decision === 'approved' ? '협업 요청이 승인되었습니다.' : '협업 요청이 반려되었습니다.',
    body:
      parsed.decision === 'approved'
        ? `${orgName}에서 협업 연결 요청을 승인했습니다. 사건 연결이 완료되면 포털 접근이 자동으로 활성화됩니다.`
        : `${orgName}에서 협업 연결 요청을 반려했습니다.${parsed.reviewNote ? ` 메모: ${parsed.reviewNote}` : ''}`,
    payload: { request_id: parsed.requestId, target_organization_id: parsed.organizationId, decision: parsed.decision },
    action_label: parsed.decision === 'approved' ? '연결 상태 보기' : null,
    action_href: parsed.decision === 'approved' ? '/start/pending' : null
  });

  if (notificationError) throw notificationError;

  revalidatePath('/clients');
  revalidatePath('/client-access');
}

export async function attachClientAccessRequestToCaseAction(formData: FormData) {
  const parsed = clientAccessCaseLinkSchema.parse({
    requestId: formData.get('requestId'),
    organizationId: formData.get('organizationId'),
    caseId: formData.get('caseId'),
    relationLabel: formData.get('relationLabel'),
    portalEnabled: formData.get('portalEnabled') === 'on'
  });
  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    permission: 'case_edit',
    errorMessage: '의뢰인을 사건에 연결할 권한이 없습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: requestRow, error: requestError } = await adminClient
    .from('client_access_requests')
    .select('id, requester_profile_id, requester_name, requester_email, target_organization_id, status')
    .eq('id', parsed.requestId)
    .eq('target_organization_id', parsed.organizationId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw requestError ?? new Error('협업 연결 요청을 찾을 수 없습니다.');
  }

  if (requestRow.status !== 'approved') {
    throw new Error('승인된 요청만 사건에 연결할 수 있습니다.');
  }

  if (!requestRow.requester_profile_id) {
    throw new Error('요청자 계정 정보가 없어 사건에 연결할 수 없습니다.');
  }

  const { data: caseRow, error: caseError } = await adminClient
    .from('cases')
    .select('id, organization_id, title, lifecycle_status')
    .eq('id', parsed.caseId)
    .eq('organization_id', parsed.organizationId)
    .neq('lifecycle_status', 'soft_deleted')
    .maybeSingle();

  if (caseError || !caseRow) {
    throw caseError ?? new Error('연결할 사건을 찾을 수 없습니다.');
  }

  const [existingByProfile, existingByEmail] = await Promise.all([
    adminClient
      .from('case_clients')
      .select('id, client_name, relation_label, is_portal_enabled')
      .eq('case_id', parsed.caseId)
      .eq('profile_id', requestRow.requester_profile_id)
      .maybeSingle(),
    adminClient
      .from('case_clients')
      .select('id, client_name, relation_label, is_portal_enabled')
      .eq('case_id', parsed.caseId)
      .eq('client_email_snapshot', requestRow.requester_email)
      .maybeSingle()
  ]);

  const existingClient = existingByProfile.data ?? existingByEmail.data;
  const relationLabel = parsed.relationLabel || existingClient?.relation_label || '의뢰인';
  const clientName = existingClient?.client_name || requestRow.requester_name || requestRow.requester_email;
  const portalEnabled = parsed.portalEnabled && Boolean(requestRow.requester_profile_id);

  if (existingClient?.id) {
    const { error: updateError } = await adminClient
      .from('case_clients')
      .update({
        profile_id: requestRow.requester_profile_id,
        client_name: clientName,
        client_email_snapshot: requestRow.requester_email,
        relation_label: relationLabel,
        is_portal_enabled: portalEnabled || existingClient.is_portal_enabled,
        updated_by: auth.user.id
      })
      .eq('id', existingClient.id);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await adminClient.from('case_clients').insert({
      organization_id: parsed.organizationId,
      case_id: parsed.caseId,
      profile_id: requestRow.requester_profile_id,
      client_name: clientName,
      client_email_snapshot: requestRow.requester_email,
      relation_label: relationLabel,
      is_portal_enabled: portalEnabled,
      created_by: auth.user.id,
      updated_by: auth.user.id
    });

    if (insertError) throw insertError;
  }

  const { error: notificationError } = await adminClient.from('notifications').insert({
    organization_id: parsed.organizationId,
    case_id: parsed.caseId,
    recipient_profile_id: requestRow.requester_profile_id,
    kind: 'generic',
    title: '사건 연결이 완료되었습니다.',
    body: portalEnabled
      ? `${caseRow.title} 사건에서 협업이 시작되었습니다. 포털에서 진행 상황을 확인할 수 있습니다.`
      : `${caseRow.title} 사건 연결이 완료되었습니다. 포털 접근은 아직 활성화되지 않았습니다.`,
    payload: { request_id: parsed.requestId, case_id: parsed.caseId, organization_id: parsed.organizationId },
    action_label: portalEnabled ? '사건 보기' : null,
    action_href: portalEnabled ? `/portal/cases/${parsed.caseId}` : null
  });

  if (notificationError) throw notificationError;

  if (portalEnabled && requestRow.requester_profile_id) {
    const activatedAt = new Date().toISOString();
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        is_client_account: true,
        client_account_status: 'active',
        client_account_status_changed_at: activatedAt,
        client_account_status_reason: `${caseRow.title} 사건 연결 완료`,
        client_last_approved_at: activatedAt
      })
      .eq('id', requestRow.requester_profile_id);

    if (profileError) throw profileError;
  }

  revalidatePath('/clients');
  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath('/client-access');
  revalidatePath('/portal');
}

export async function acceptInvitationAction(token: string) {
  const auth = await requireAuthenticatedUser();
  const { adminClient, invitation } = await loadPendingInvitationByToken(token);

  validateInvitationAcceptance(invitation, auth.user.email ?? auth.profile.email);

  if (invitation.kind === 'staff_invite') {
    await applyStaffInvitation({ adminClient, invitation, userId: auth.user.id });
  } else {
    await applyClientInvitation({
      adminClient,
      invitation,
      userId: auth.user.id,
      profileName: auth.profile.full_name,
      profileEmail: auth.profile.email
    });
  }

  await finalizeInvitationAcceptance(adminClient, invitation.id, auth.user.id);
  finalizeInvitationAcceptanceNavigation(invitation.kind);
}
