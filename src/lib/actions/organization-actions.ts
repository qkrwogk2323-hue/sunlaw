'use server';

import type { Route } from 'next';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getEffectiveOrganizationId,
  hasActivePlatformAdminView,
  requireAuthenticatedUser,
  requireOrganizationActionAccess,
  requirePlatformAdminAction
} from '@/lib/auth';
import { createInvitationToken, hashInvitationToken } from '@/lib/invitations';
import { decodeInvitationNote, encodeInvitationNote } from '@/lib/invitation-metadata';
import {
  formatResidentRegistrationNumberMasked,
  isValidKoreanBusinessNumber,
  isValidResidentRegistrationNumber,
  makeSlug,
  normalizeBusinessNumber,
  normalizeResidentRegistrationNumber
} from '@/lib/format';
import { parseCsvFile, pickCsvValue } from '@/lib/csv';
import {
  createConditionFailedFeedback,
  createValidationFailedFeedback,
  normalizeGuardFeedback,
  parseGuardFeedback,
  throwGuardFeedback
} from '@/lib/guard-feedback';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { grantHubPinAccess, hashHubPin, revokeHubPinAccess } from '@/lib/hub-access';
import { encryptString } from '@/lib/pii';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
import { getDefaultTemplatePermissions, hasPermission, PERMISSION_KEYS } from '@/lib/permissions';
import {
  collaborationHubCaseShareSchema,
  collaborationHubMessageSchema,
  collaborationHubReadSchema,
  collaborationRequestCreateSchema,
  collaborationRequestReviewSchema,
  clientAccessCaseLinkSchema,
  clientAccessRequestSchema,
  clientAccessReviewSchema,
  invitationCreateSchema,
  membershipPermissionsSchema,
  membershipSetupSchema,
  organizationCreateSchema,
  organizationSignupSchema
} from '@/lib/validators';

import { captureNotificationFailure } from '@/lib/notification-failure';

const organizationSignupDocumentBucket = 'organization-signup-documents';
const maxOrganizationSignupDocumentSize = 10 * 1024 * 1024;
const maxCollaborationDocumentSize = 15 * 1024 * 1024;
const allowedOrganizationSignupDocumentMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const allowedOrganizationSignupDocumentExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg']);

function generateFourDigitPin() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return `${1000 + (arr[0] % 9000)}`;
}

function pinExpiresAt() {
  return new Date(Date.now() + 1000 * 60 * 2).toISOString();
}

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
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'REQUESTER_EMAIL_MISSING',
      blocked: '로그인 계정 이메일 확인이 필요합니다.',
      cause: '로그인 계정에 이메일 정보가 없어 요청을 제출할 수 없습니다. 카카오 계정 이메일 제공에 동의한 뒤 다시 시도해 주세요.',
      resolution: '이메일이 포함된 계정으로 다시 로그인하거나 계정 정보를 확인한 뒤 다시 시도해 주세요.'
    }));
  }

  return email;
}

function buildCollaborationDocumentStoragePath(organizationId: string, hubId: string, originalName: string) {
  const sanitized = makeSlug(originalName.replace(/\.[^.]+$/, '')) || 'document';
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  return `org/${organizationId}/collaboration-hubs/${hubId}/${Date.now()}-${sanitized}${ext}`;
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const guardFeedback = parseGuardFeedback(error);
  if (guardFeedback) {
    return guardFeedback.cause;
  }

  if (error instanceof z.ZodError || (error instanceof Error && error.message.trim().startsWith('['))) {
    const feedback = normalizeGuardFeedback(error, {
      type: 'validation_failed',
      code: 'VALIDATION_FAILED',
      blocked: fallback,
      cause: '입력값 또는 첨부한 파일 형식을 확인해 주세요.',
      resolution: '필수 항목과 입력 형식을 수정한 뒤 다시 제출해 주세요.'
    });
    return feedback.cause;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function listActivePlatformAdminRecipients() {
  const admin = createSupabaseAdminClient();

  // Find the platform root org first (by is_platform_root = true OR kind = 'platform_management')
  const { data: platformOrgData, error: orgError } = await admin
    .from('organizations')
    .select('id')
    .or('is_platform_root.eq.true,kind.eq.platform_management')
    .limit(1)
    .maybeSingle();

  if (orgError) {
    console.error('[listActivePlatformAdminRecipients] platform org lookup error:', orgError.message);
    throw orgError;
  }

  // Fall back to membership join if org lookup fails or returns null
  if (!platformOrgData?.id) {
    console.warn('[listActivePlatformAdminRecipients] platform org not found via is_platform_root/kind, falling back to membership filter');
    const { data: fallbackData, error: fallbackError } = await admin
      .from('organization_memberships')
      .select('profile_id, organization_id, profile:profiles(id, is_active), organization:organizations(id, kind, is_platform_root)')
      .eq('status', 'active')
      .in('role', ['org_owner', 'org_manager']);

    if (fallbackError) throw fallbackError;
    return (fallbackData ?? [])
      .filter((row: any) => isPlatformManagementOrganization(row.organization) && row.profile?.is_active !== false)
      .map((row: any) => ({ profileId: row.profile_id, organizationId: row.organization_id }))
      .filter((row: any) => row.profileId && row.organizationId);
  }

  const platformOrganizationId = platformOrgData.id;
  const { data, error } = await admin
    .from('organization_memberships')
    .select('profile_id, profile:profiles(id, is_active)')
    .eq('organization_id', platformOrganizationId)
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager']);

  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => row.profile?.is_active !== false)
    .map((row: any) => ({
      profileId: row.profile_id,
      organizationId: platformOrganizationId
    }))
    .filter((row: any) => row.profileId);
}

async function listOrganizationManagerProfileIds(adminClient: ReturnType<typeof createSupabaseAdminClient>, organizationId: string) {
  const { data, error } = await adminClient
    .from('organization_memberships')
    .select('profile_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager']);

  if (error) throw error;

  return (data ?? []).map((item: any) => item.profile_id).filter(Boolean);
}

async function findActiveCollaborationHub(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  leftOrganizationId: string,
  rightOrganizationId: string
) {
  const { data, error } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id, title, summary, status')
    .eq('status', 'active')
    .or(`and(primary_organization_id.eq.${leftOrganizationId},partner_organization_id.eq.${rightOrganizationId}),and(primary_organization_id.eq.${rightOrganizationId},partner_organization_id.eq.${leftOrganizationId})`)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
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
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  const rand = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
  return `requester/${requesterProfileId}/${Date.now()}-${rand}-${safeName}`;
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
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_DOCUMENT_MISSING',
      blocked: '사업자등록증 파일이 없어 신청을 접수할 수 없습니다.',
      cause: '업로드된 사업자등록증 파일이 없거나 비어 있습니다.',
      resolution: 'PDF, PNG, JPG 형식의 사업자등록증 파일을 다시 선택해 주세요.'
    }));
  }

  if (file.size > maxOrganizationSignupDocumentSize) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_DOCUMENT_TOO_LARGE',
      blocked: '사업자등록증 파일 크기 제한으로 차단되었습니다.',
      cause: '업로드한 파일이 10MB를 초과했습니다.',
      resolution: '10MB 이하 파일로 줄이거나 다시 저장한 뒤 업로드해 주세요.'
    }));
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!allowedOrganizationSignupDocumentExtensions.has(extension)) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_DOCUMENT_EXTENSION_INVALID',
      blocked: '지원하지 않는 사업자등록증 파일 형식입니다.',
      cause: '파일 확장자가 PDF, PNG, JPG, JPEG 중 하나가 아닙니다.',
      resolution: 'PDF, PNG, JPG 형식으로 다시 저장한 파일을 업로드해 주세요.'
    }));
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedType = detectOrganizationSignupDocumentType(signature);
  if (!detectedType) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_DOCUMENT_TYPE_UNREADABLE',
      blocked: '파일 실제 형식을 확인하지 못해 차단되었습니다.',
      cause: '실제 파일 형식을 확인할 수 없습니다. PDF, PNG, JPG 파일만 업로드해 주세요.',
      resolution: '정상적인 원본 파일인지 확인하고 다시 업로드해 주세요.'
    }));
  }

  if (!getAllowedOrganizationSignupDocumentExtensionsByType(detectedType).has(extension)) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_DOCUMENT_EXTENSION_MISMATCH',
      blocked: '파일 확장자와 실제 형식이 일치하지 않습니다.',
      cause: '파일 확장자와 실제 파일 형식이 일치하지 않습니다. 파일을 다시 확인해 주세요.',
      resolution: '파일 형식에 맞는 확장자로 다시 저장하거나 원본 파일을 다시 선택해 주세요.'
    }));
  }

  const mimeType = file.type.toLowerCase();
  if (mimeType && (!allowedOrganizationSignupDocumentMimeTypes.has(mimeType) || mimeType !== detectedType)) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_DOCUMENT_MIME_MISMATCH',
      blocked: '파일 정보와 실제 형식이 일치하지 않아 차단되었습니다.',
      cause: '파일 정보와 실제 파일 형식이 일치하지 않습니다. 다른 파일로 다시 시도해 주세요.',
      resolution: '다른 파일로 다시 시도하거나 원본 파일을 다시 업로드해 주세요.'
    }));
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
  const arr = new Uint8Array(2);
  crypto.getRandomValues(arr);
  const rand = Array.from(arr, b => b.toString(36)).join('').slice(0, 4);
  return `${base}-${rand}`;
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
  organizationIndustry,
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
  organizationIndustry?: string | null;
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
        organization_industry: organizationIndustry || null,
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
      throwGuardFeedback(createConditionFailedFeedback({
        code: 'ORGANIZATION_CREATE_EMPTY_RESULT',
        blocked: '조직 생성을 완료하지 못했습니다.',
        cause: '조직 생성 요청은 성공한 것처럼 보였지만 생성된 조직 정보를 돌려받지 못했습니다.',
        resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 신청 시간과 조직명을 함께 전달해 주세요.'
      }));
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

const staffPreRegisterInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  membershipTitle: z.string().trim().max(80).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  actorCategory: z.enum(['admin', 'staff']).default('staff'),
  roleTemplateKey: z.enum(['admin_general', 'lawyer', 'office_manager', 'org_staff', 'collection_agent', 'intern_readonly']).default('org_staff'),
  caseScopePolicy: z.enum(['all_org_cases', 'assigned_cases_only', 'read_only_assigned']).default('assigned_cases_only'),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72)
});

function randomAlphaNumeric(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

async function generateUniqueTempLoginId(admin: ReturnType<typeof createSupabaseAdminClient>, organizationId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `staff-${randomAlphaNumeric(6)}`.toLowerCase();
    const { data } = await admin
      .from('organization_staff_temp_credentials')
      .select('profile_id')
      .eq('organization_id', organizationId)
      .eq('login_id_normalized', candidate)
      .maybeSingle();
    if (!data?.profile_id) return candidate;
  }
  throwGuardFeedback(createConditionFailedFeedback({
    code: 'STAFF_TEMP_LOGIN_ID_EXHAUSTED',
    blocked: '직원 임시 아이디를 만들 수 없어 초대를 진행하지 못했습니다.',
    cause: '중복되지 않는 임시 아이디를 정해진 횟수 안에 만들지 못했습니다.',
    resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
  }));
}

async function generateUniqueClientTempLoginId(admin: ReturnType<typeof createSupabaseAdminClient>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = `client-${randomAlphaNumeric(6)}`.toLowerCase();
    const { data } = await admin
      .from('client_temp_credentials')
      .select('profile_id')
      .eq('login_id_normalized', candidate)
      .maybeSingle();
    if (!data?.profile_id) return candidate;
  }
  throwGuardFeedback(createConditionFailedFeedback({
    code: 'CLIENT_TEMP_LOGIN_ID_EXHAUSTED',
    blocked: '의뢰인 임시 아이디를 만들 수 없어 초대를 진행하지 못했습니다.',
    cause: '중복되지 않는 의뢰인 임시 아이디를 정해진 횟수 안에 만들지 못했습니다.',
    resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
  }));
}

function generateTempPassword() {
  return `${randomAlphaNumeric(4)}!${randomAlphaNumeric(4)}#${randomAlphaNumeric(4)}`;
}

const clientDirectInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  caseId: z.string().uuid(),
  email: z.string().trim().email(),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72)
});

const clientPreRegisterInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  caseId: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  relationLabel: z.string().trim().max(80).optional().or(z.literal('')),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72)
});

const staffBulkInviteEntrySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  secondaryEmail: z.string().trim().email().optional().or(z.literal('')),
  membershipTitle: z.string().trim().max(80).optional().or(z.literal(''))
});

const staffBulkInviteSchema = z.object({
  organizationId: z.string().uuid(),
  actorCategory: z.enum(['admin', 'staff']).default('staff'),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72),
  entries: z.array(staffBulkInviteEntrySchema).min(1).max(5)
});

const clientBulkInviteEntrySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  relationLabel: z.string().trim().max(80).optional().or(z.literal('')),
  secondaryContact: z.string().trim().max(120).optional().or(z.literal(''))
});

const clientStructuredBulkInviteSchema = z.object({
  organizationId: z.string().uuid(),
  caseId: z.string().uuid(),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72),
  entries: z.array(clientBulkInviteEntrySchema).min(1)
});

const resendInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72)
});

const selfMemberProfileUpdateSchema = z.object({
  organizationId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  displayTitle: z.string().trim().max(80).optional().or(z.literal('')),
  residentNumber: z.string().trim().max(20).optional().or(z.literal('')),
  addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
  addressLine2: z.string().trim().max(200).optional().or(z.literal(''))
});

const membershipAdminSummarySchema = z.object({
  organizationId: z.string().uuid(),
  membershipId: z.string().uuid(),
  actorCategory: z.enum(['admin', 'staff']).default('staff'),
  status: z.enum(['active', 'suspended']).default('active'),
  title: z.string().trim().max(80).optional().or(z.literal(''))
});

const membershipDeleteSchema = z.object({
  organizationId: z.string().uuid(),
  membershipId: z.string().uuid()
});

const organizationExitRequestSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().trim().min(5).max(1000)
});

const organizationExitReviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal(''))
});


async function resolveCaseIdFromCsv({
  supabase,
  organizationId,
  caseId,
  caseReference,
  caseTitle
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organizationId: string;
  caseId?: string | null;
  caseReference?: string | null;
  caseTitle?: string | null;
}) {
  if (caseId?.trim()) return caseId.trim();

  if (caseReference?.trim()) {
    const { data } = await supabase
      .from('cases')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('reference_no', caseReference.trim())
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (caseTitle?.trim()) {
    const { data } = await supabase
      .from('cases')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('title', caseTitle.trim())
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

function buildClientInvitationNote(note?: string | null, relationLabel?: string | null, phone?: string | null) {
  const lines = [
    relationLabel?.trim() ? `관계:${relationLabel.trim()}` : null,
    phone?.trim() ? `연락처:${phone.trim()}` : null,
    note?.trim() ? note.trim() : null
  ].filter(Boolean) as string[];
  return lines.length ? lines.join('\n') : null;
}
function parseStaffInvitationInput(formData: FormData) {
  const actorCategory = formData.get('actorCategory') || 'staff';
  const roleTemplateKey = actorCategory === 'admin' ? 'admin_general' : 'org_staff';
  const caseScopePolicy = actorCategory === 'admin' ? 'all_org_cases' : 'assigned_cases_only';
  return invitationCreateSchema.parse({
    organizationId: formData.get('organizationId'),
    email: formData.get('email'),
    kind: 'staff_invite',
    caseId: '',
    membershipTitle: formData.get('membershipTitle'),
    note: formData.get('note'),
    expiresHours: formData.get('expiresHours') || 72,
    actorCategory,
    roleTemplateKey,
    caseScopePolicy
  });
}

function parseJsonEntries<T>(formData: FormData, fieldName: string) {
  const raw = `${formData.get(fieldName) ?? '[]'}`.trim();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    throw new Error('입력 대상을 다시 확인해 주세요.');
  }
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

function buildStaffInvitationRecordFromEntry({
  organizationId,
  actorCategory,
  expiresHours,
  entry,
  actorId
}: {
  organizationId: string;
  actorCategory: 'admin' | 'staff';
  expiresHours: number;
  entry: z.infer<typeof staffBulkInviteEntrySchema>;
  actorId: string;
}) {
  const token = createInvitationToken();
  const requestedRole = actorCategory === 'admin' ? 'org_manager' : 'org_staff';
  const roleTemplateKey = actorCategory === 'admin' ? 'admin_general' : 'org_staff';
  const caseScopePolicy = actorCategory === 'admin' ? 'all_org_cases' : 'assigned_cases_only';
  const publicNote = entry.secondaryEmail?.trim()
    ? `보조 이메일: ${entry.secondaryEmail.trim()}`
    : null;

  return {
    token,
    record: {
      organization_id: organizationId,
      kind: 'staff_invite',
      email: entry.email,
      invited_name: entry.name,
      requested_role: requestedRole,
      actor_category: actorCategory,
      role_template_key: roleTemplateKey,
      case_scope_policy: caseScopePolicy,
      permissions_override: {},
      token_hash: hashInvitationToken(token),
      share_token: null,
      token_hint: token.slice(-6),
      note: encodeInvitationNote(publicNote, entry.membershipTitle),
      created_by: actorId,
      expires_at: new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()
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
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'INVITATION_EXPIRED',
      blocked: '만료된 초대 링크입니다.',
      cause: '초대 유효 시간이 지나 더 이상 사용할 수 없습니다.',
      resolution: '초대한 담당자에게 새 초대 링크를 요청해 주세요.'
    }));
  }

  if ((signedInEmail ?? '').toLowerCase() !== String(invitation.email).toLowerCase()) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'INVITATION_EMAIL_MISMATCH',
      blocked: '초대받은 이메일과 현재 로그인 계정이 다릅니다.',
      cause: `초대 대상 이메일은 ${String(invitation.email)}인데 현재 다른 계정으로 로그인되어 있습니다.`,
      resolution: '초대받은 이메일 계정으로 다시 로그인한 뒤 초대를 수락해 주세요.'
    }));
  }
}

async function applyStaffInvitation({ adminClient, invitation, userId }: { adminClient: ReturnType<typeof createSupabaseAdminClient>; invitation: any; userId: string; }) {
  const invitationMeta = decodeInvitationNote(invitation.note);
  const templateKey = invitation.role_template_key ?? (invitation.requested_role === 'org_manager' ? 'admin_general' : 'org_staff');
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
      .update({
        profile_id: userId,
        is_portal_enabled: true,
        link_status: 'linked',
        orphan_reason: null,
        updated_by: userId
      })
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
      .update({
        profile_id: userId,
        is_portal_enabled: true,
        link_status: 'linked',
        orphan_reason: null,
        updated_by: userId
      })
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
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'INVITATION_CASE_NOT_FOUND',
      blocked: '연결할 사건 정보를 찾을 수 없습니다.',
      cause: '초대 링크가 가리키는 사건이 삭제되었거나 접근할 수 없는 상태입니다.',
      resolution: '초대한 담당자에게 사건 상태를 확인하거나 새 초대 링크를 요청해 주세요.'
    }));
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
      link_status: 'linked',
      relink_policy: 'auto_when_profile_returns',
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
    redirect('/settings/team');
  }

  redirect('/portal');
}

// 새 조직을 생성하고 기본 멤버십을 연결한다.
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
    managerInviteName: formData.get('managerInviteName'),
    managerInviteEmail: formData.get('managerInviteEmail'),
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

  const managerInviteEmail = parsed.managerInviteEmail?.trim().toLowerCase();
  const creatorEmail = `${auth.user.email ?? auth.profile.email ?? ''}`.trim().toLowerCase();
  let managerInviteToken: string | null = null;

  if (managerInviteEmail && managerInviteEmail !== creatorEmail) {
    const token = createInvitationToken();
    const { error: invitationError } = await (await createSupabaseServerClient()).from('invitations').insert({
      organization_id: organization.id,
      kind: 'staff_invite',
      email: managerInviteEmail,
      invited_name: parsed.managerInviteName?.trim() || managerInviteEmail,
      requested_role: 'org_manager',
      actor_category: 'admin',
      role_template_key: 'admin_general',
      case_scope_policy: 'all_org_cases',
      permissions_override: {},
      token_hash: hashInvitationToken(token),
      share_token: null,
      token_hint: token.slice(-6),
      note: encodeInvitationNote('조직 생성 시 초기 관리자 초대', '조직관리자'),
      created_by: auth.user.id,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    });

    if (invitationError) throw invitationError;
    managerInviteToken = token;
  }

  revalidatePath('/organizations');
  revalidatePath('/admin/organization-requests');
  if (managerInviteToken) {
    redirect(`/organizations/${organization.id}?invite=${encodeURIComponent(managerInviteToken)}` as Route);
  }

  redirect(`/organizations/${organization.id}`);
}

// 조직 가입 신청을 접수한다.
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
      organizationIndustry: formData.get('organizationIndustry'),
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
      organization_industry: parsed.organizationIndustry || null,
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
        action_label: '신청 현황 확인',
        action_href: '/organization-request',
        destination_type: 'internal_route',
        destination_url: '/organization-request'
      });

      if (notificationError) throw notificationError;

      const platformAdmins = (await listActivePlatformAdminRecipients()).filter((item) => item.profileId !== auth.user.id);
      if (platformAdmins.length) {
        const { error: adminNotificationError } = await admin.from('notifications').insert(
          platformAdmins.map((item) => ({
            organization_id: item.organizationId,
            recipient_profile_id: item.profileId,
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
            destination_type: 'internal_route',
            destination_url: '/admin/organization-requests',
            action_entity_type: 'organization_signup_request',
            action_target_id: requestRow?.id ?? null
          }))
        );

        if (adminNotificationError) throw adminNotificationError;
      }
    } catch (notificationError) {
      captureNotificationFailure(notificationError, 'organization_signup', {
        hasRequestRow: Boolean(requestRow?.id)
      });
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

// 작성 중인 조직 가입 신청 내용을 수정한다.
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
      organizationIndustry: formData.get('organizationIndustry'),
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
        organization_industry: parsed.organizationIndustry || null,
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

// 제출한 조직 가입 신청을 취소한다.
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

// 조직 가입 신청을 승인 또는 반려한다.
export async function reviewOrganizationSignupRequestAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 조직 개설 신청을 검토할 수 있습니다.');
  const admin = createSupabaseAdminClient();
  const requestId = `${formData.get('requestId') ?? ''}`;
  const decision = `${formData.get('decision') ?? ''}`;
  const reviewNote = `${formData.get('reviewNote') ?? ''}`;

  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'ORG_SIGNUP_REVIEW_INPUT_INVALID',
      blocked: '조직 신청 검토 요청 형식이 올바르지 않습니다.',
      cause: '신청 ID 또는 승인/반려 결정값이 누락되었거나 유효하지 않습니다.',
      resolution: '목록 화면에서 다시 열어 검토를 진행해 주세요.'
    }));
  }

  const { data: initialRequestRow, error: requestError } = await admin
    .from('organization_signup_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError || !initialRequestRow) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'ORG_SIGNUP_REQUEST_NOT_FOUND',
      blocked: '검토할 조직 신청을 찾을 수 없습니다.',
      cause: requestError?.message ?? '해당 신청이 삭제되었거나 더 이상 접근할 수 없는 상태입니다.',
      resolution: '신청 목록을 새로고침한 뒤 다시 선택해 주세요.'
    }));
  }
  if (!initialRequestRow.requester_profile_id) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'ORG_SIGNUP_REQUESTER_MISSING',
      blocked: '신청자 계정 정보가 없어 검토를 진행할 수 없습니다.',
      cause: '조직 신청에 연결된 신청자 프로필 ID가 비어 있습니다.',
      resolution: '관리자에게 신청 시각과 조직명을 전달해 주세요.'
    }));
  }

  if (initialRequestRow.status === 'approved' && initialRequestRow.approved_organization_id) {
    revalidatePath('/admin/organization-requests');
    revalidatePath('/organizations');
    revalidatePath('/organization-request');
    revalidatePath('/notifications');
    redirect(`/organizations/${initialRequestRow.approved_organization_id}`);
  }

  if (initialRequestRow.status !== 'pending') {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'ORG_SIGNUP_ALREADY_REVIEWED',
      blocked: '이미 처리된 조직 신청입니다.',
      cause: `현재 신청 상태가 ${initialRequestRow.status} 이므로 다시 검토할 수 없습니다.`,
      resolution: '신청 목록을 새로고침해 현재 상태를 확인해 주세요.'
    }));
  }

  let requestRow = initialRequestRow;
  let ownsReviewLock = initialRequestRow.approval_locked_by_profile_id === auth.user.id;

  if (!ownsReviewLock) {
    if (initialRequestRow.approval_locked_by_profile_id && initialRequestRow.approval_locked_by_profile_id !== auth.user.id) {
      throwGuardFeedback(createConditionFailedFeedback({
        code: 'ORG_SIGNUP_REVIEW_LOCKED',
        blocked: '다른 관리자가 현재 이 신청을 처리 중입니다.',
        cause: '이미 다른 검토자가 승인 잠금을 잡고 있어 중복 처리를 막고 있습니다.',
        resolution: '잠시 후 다시 확인해 주세요.'
      }));
    }

    const claimedRow = await claimOrganizationSignupReviewLock(requestId, auth.user.id);
    if (!claimedRow) {
      const { data: refreshedRequest, error: refreshedRequestError } = await admin
        .from('organization_signup_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (refreshedRequestError || !refreshedRequest) {
        throwGuardFeedback(createConditionFailedFeedback({
          code: 'ORG_SIGNUP_REQUEST_REFRESH_FAILED',
          blocked: '신청 상태를 다시 불러오지 못했습니다.',
          cause: refreshedRequestError?.message ?? '잠금 재확인 중 신청 정보를 찾지 못했습니다.',
          resolution: '목록을 새로고침한 뒤 다시 시도해 주세요.'
        }));
      }

      if (refreshedRequest.status === 'approved' && refreshedRequest.approved_organization_id) {
        revalidatePath('/admin/organization-requests');
        revalidatePath('/organizations');
        revalidatePath('/organization-request');
        revalidatePath('/notifications');
        redirect(`/organizations/${refreshedRequest.approved_organization_id}`);
      }

      if (refreshedRequest.status !== 'pending') {
        throwGuardFeedback(createConditionFailedFeedback({
          code: 'ORG_SIGNUP_ALREADY_REVIEWED',
          blocked: '이미 처리된 조직 신청입니다.',
          cause: `현재 신청 상태가 ${refreshedRequest.status} 이므로 다시 검토할 수 없습니다.`,
          resolution: '신청 목록을 새로고침해 현재 상태를 확인해 주세요.'
        }));
      }

      if (refreshedRequest.approval_locked_by_profile_id && refreshedRequest.approval_locked_by_profile_id !== auth.user.id) {
        throwGuardFeedback(createConditionFailedFeedback({
          code: 'ORG_SIGNUP_REVIEW_LOCKED',
          blocked: '다른 관리자가 현재 이 신청을 처리 중입니다.',
          cause: '잠금 재확인 시 이미 다른 검토자가 이 신청을 처리 중인 것으로 확인되었습니다.',
          resolution: '잠시 후 다시 확인해 주세요.'
        }));
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
      action_href: actionHref,
      destination_type: actionHref ? 'internal_route' : null,
      destination_url: actionHref
    });

    if (requesterNotificationError) throw requesterNotificationError;
  };

  try {
    if (decision === 'approved') {
      const organization = await createOrganizationCore({
        createdBy: requestRow.requester_profile_id,
        name: requestRow.organization_name,
        kind: requestRow.organization_kind,
        organizationIndustry: requestRow.organization_industry,
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
          throwGuardFeedback(createConditionFailedFeedback({
            code: 'ORG_SIGNUP_APPROVAL_REFRESH_FAILED',
            blocked: '승인 결과를 다시 확인하지 못했습니다.',
            cause: refreshedRequestError?.message ?? '승인 처리 후 신청 상태를 다시 읽어오지 못했습니다.',
            resolution: '신청 목록을 새로고침해 승인 결과를 다시 확인해 주세요.'
          }));
        }

        if (refreshedRequest.status !== 'approved' || refreshedRequest.approved_organization_id !== organization.id) {
          throwGuardFeedback(createConditionFailedFeedback({
            code: 'ORG_SIGNUP_APPROVAL_NOT_FINALIZED',
            blocked: '승인 상태를 확정하지 못했습니다.',
            cause: '조직은 생성되었지만 신청 상태가 승인 완료로 확정되지 않았습니다.',
            resolution: '신청 목록을 새로고침한 뒤 다시 확인해 주세요. 반복되면 관리자에게 문의해 주세요.'
          }));
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

// 조직 탈퇴 신청을 제출한다.
export async function submitOrganizationExitRequestAction(formData: FormData) {
  const parsed = organizationExitRequestSchema.parse({
    organizationId: formData.get('organizationId'),
    reason: formData.get('reason')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    requireManager: true,
    permission: 'organization_settings_manage',
    errorMessage: '조직 관리자만 조직 탈퇴를 신청할 수 있습니다.'
  });

  const admin = createSupabaseAdminClient();
  const { data: existingPending } = await admin
    .from('organization_exit_requests')
    .select('id')
    .eq('organization_id', parsed.organizationId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending?.id) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'ORG_EXIT_ALREADY_PENDING',
      blocked: '이미 처리 대기 중인 조직 탈퇴 신청이 있습니다.',
      cause: '같은 조직에 대해 보류 중인 탈퇴 신청이 존재합니다.',
      resolution: '현재 신청 결과를 먼저 확인해 주세요.'
    }));
  }

  const { error } = await admin.from('organization_exit_requests').insert({
    organization_id: parsed.organizationId,
    requested_by_profile_id: auth.user.id,
    reason: parsed.reason,
    status: 'pending'
  });
  if (error) throw error;

  const platformAdmins = await listActivePlatformAdminRecipients();
  if (platformAdmins.length) {
    await admin.from('notifications').insert(
      platformAdmins.map((item) => ({
        organization_id: item.organizationId,
        recipient_profile_id: item.profileId,
        kind: 'generic',
        title: '조직 탈퇴 승인 요청이 접수되었습니다.',
        body: `${parsed.organizationId} 조직에서 탈퇴 승인 요청이 들어왔습니다.`,
        requires_action: true,
        action_label: '탈퇴 요청 검토',
        action_href: '/admin/organization-requests',
        destination_type: 'internal_route',
        destination_url: '/admin/organization-requests',
        action_entity_type: 'organization',
        action_target_id: parsed.organizationId
      }))
    );
  }

  revalidatePath('/settings/organization');
  revalidatePath('/admin/organization-requests');
  revalidatePath('/notifications');
}

// 조직 탈퇴 신청을 승인 또는 반려한다.
export async function reviewOrganizationExitRequestAction(formData: FormData) {
  const parsed = organizationExitReviewSchema.parse({
    requestId: formData.get('requestId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote')
  });

  await requirePlatformAdminAction('플랫폼 관리자만 조직 탈퇴 요청을 검토할 수 있습니다.');
  const admin = createSupabaseAdminClient();

  const { data: requestRow, error: requestError } = await admin
    .from('organization_exit_requests')
    .select('id, organization_id, status')
    .eq('id', parsed.requestId)
    .maybeSingle();
  if (requestError || !requestRow) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'ORG_EXIT_REQUEST_NOT_FOUND',
      blocked: '조직 탈퇴 요청을 찾을 수 없습니다.',
      cause: requestError?.message ?? '해당 탈퇴 요청이 삭제되었거나 더 이상 접근할 수 없는 상태입니다.',
      resolution: '목록을 새로고침한 뒤 다시 확인해 주세요.'
    }));
  }
  if (requestRow.status !== 'pending') {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'ORG_EXIT_ALREADY_REVIEWED',
      blocked: '이미 처리된 조직 탈퇴 요청입니다.',
      cause: `현재 요청 상태가 ${requestRow.status} 입니다.`,
      resolution: '목록을 새로고침해 현재 상태를 확인해 주세요.'
    }));
  }

  const reviewer = await requireAuthenticatedUser();
  const { error } = await admin
    .from('organization_exit_requests')
    .update({
      status: parsed.decision,
      reviewed_by_profile_id: reviewer.user.id,
      review_note: parsed.reviewNote || null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', parsed.requestId)
    .eq('status', 'pending');
  if (error) throw error;

  revalidatePath('/settings/organization');
  revalidatePath('/admin/organization-requests');
  revalidatePath('/notifications');
}

// 구성원 초대 링크를 생성한다.
export async function createStaffInvitationAction(formData: FormData) {
  const parsed = parseStaffInvitationInput(formData);
  const returnPath = `${formData.get('returnPath') ?? ''}`.trim();

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 직원을 초대할 수 있습니다.');
  const { token, record } = buildStaffInvitationRecord(parsed, auth.user.id);

  await persistStaffInvitation(record);

  revalidatePath('/settings/team');
  if (returnPath) {
    const separator = returnPath.includes('?') ? '&' : '?';
    redirect(`${returnPath}${separator}invite=${encodeURIComponent(token)}` as Route);
  }

  redirect(`/settings/team?invite=${encodeURIComponent(token)}`);
}

// 구성원 대량 초대 링크를 생성한다.
export async function createStaffBulkInvitationAction(formData: FormData) {
  const parsed = staffBulkInviteSchema.parse({
    organizationId: formData.get('organizationId'),
    actorCategory: formData.get('actorCategory') || 'staff',
    expiresHours: formData.get('expiresHours') || 72,
    entries: parseJsonEntries<z.infer<typeof staffBulkInviteEntrySchema>>(formData, 'entries')
  });

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 직원을 초대할 수 있습니다.');
  const supabase = await createSupabaseServerClient();
  const created: Array<{ name: string; email: string; url: string; membershipTitle: string | null }> = [];
  const failed: Array<{ name: string; email: string; reason: string }> = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  for (const entry of parsed.entries) {
    const { token, record } = buildStaffInvitationRecordFromEntry({
      organizationId: parsed.organizationId,
      actorCategory: parsed.actorCategory,
      expiresHours: parsed.expiresHours,
      entry,
      actorId: auth.user.id
    });

    const { error } = await supabase.from('invitations').insert(record);
    if (error) {
      failed.push({
        name: entry.name,
        email: entry.email,
        reason: getActionErrorMessage(error, '초대 링크를 생성하지 못했습니다.')
      });
      continue;
    }

    created.push({
      name: entry.name,
      email: entry.email,
      url: `${appUrl}/invite/${token}`,
      membershipTitle: entry.membershipTitle?.trim() || null
    });
  }

  if (!created.length) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'STAFF_BULK_INVITE_ALL_FAILED',
      blocked: '직원 대량 초대를 생성하지 못했습니다.',
      cause: failed[0]?.reason || '모든 대상에서 초대 링크 생성이 실패했습니다.',
      resolution: '입력한 이메일과 대상 정보를 다시 확인한 뒤 다시 시도해 주세요.'
    }));
  }

  const cookieStore = await cookies();
  cookieStore.set(
    '_vs_staff_invite_summary',
    encodeURIComponent(JSON.stringify({
      created,
      failed,
      actorCategory: parsed.actorCategory,
      expiresHours: parsed.expiresHours
    })),
    {
      maxAge: 300,
      path: '/settings/team',
      sameSite: 'strict',
      httpOnly: false
    }
  );

  revalidatePath('/settings/team');
  redirect(`/settings/team?staffInviteBatch=${created.length}&staffInviteFailed=${failed.length}`);
}

// 사전 등록 구성원 초대를 생성한다.
export async function createStaffPreRegisteredInvitationAction(formData: FormData) {
  const actorCategory = `${formData.get('actorCategory') || 'staff'}`;
  const normalizedRoleTemplateKey = actorCategory === 'admin' ? 'admin_general' : 'org_staff';
  const normalizedCaseScopePolicy = actorCategory === 'admin' ? 'all_org_cases' : 'assigned_cases_only';
  const parsed = staffPreRegisterInvitationSchema.parse({
    organizationId: formData.get('organizationId'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    membershipTitle: formData.get('membershipTitle'),
    note: formData.get('note'),
    actorCategory,
    roleTemplateKey: normalizedRoleTemplateKey,
    caseScopePolicy: normalizedCaseScopePolicy,
    expiresHours: formData.get('expiresHours') || 72
  });

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 구성원을 선등록할 수 있습니다.');
  const requestedRole = parsed.actorCategory === 'admin' ? 'org_manager' : 'org_staff';
  const admin = createSupabaseAdminClient();

  const supabase = await createSupabaseServerClient();
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('id', parsed.organizationId)
    .maybeSingle();
  if (organizationError || !organization) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'STAFF_PREREGISTER_ORGANIZATION_NOT_FOUND',
      blocked: '선등록 대상 조직을 찾을 수 없습니다.',
      cause: organizationError?.message ?? '해당 조직이 삭제되었거나 더 이상 접근할 수 없습니다.',
      resolution: '조직을 다시 선택한 뒤 시도해 주세요.'
    }));
  }

  const loginId = await generateUniqueTempLoginId(admin, parsed.organizationId);
  const loginEmail = `${organization.slug || parsed.organizationId}__${loginId}@staff.vein.local`;
  const tempPassword = generateTempPassword();

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.name,
      invited_by_organization_id: parsed.organizationId
    }
  });
  if (createUserError || !createdUser.user) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'STAFF_PREREGISTER_ACCOUNT_CREATE_FAILED',
      blocked: '임시 직원 계정을 생성하지 못했습니다.',
      cause: createUserError?.message ?? '임시 계정 생성 후 사용자 정보를 돌려받지 못했습니다.',
      resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    }));
  }
  const createdUserId = createdUser.user.id;

  try {
    const permissionSeed = getDefaultTemplatePermissions(parsed.roleTemplateKey);
    const { error: membershipError } = await admin
      .from('organization_memberships')
      .insert({
        organization_id: parsed.organizationId,
        profile_id: createdUserId,
        role: requestedRole,
        title: parsed.membershipTitle?.trim() || null,
        actor_category: parsed.actorCategory,
        permission_template_key: parsed.roleTemplateKey,
        case_scope_policy: parsed.caseScopePolicy,
        permissions: permissionSeed,
        created_by: auth.user.id
      });
    if (membershipError) throw membershipError;

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: parsed.name,
        must_change_password: true,
        must_complete_profile: true,
        default_organization_id: parsed.organizationId
      })
      .eq('id', createdUserId);
    if (profileError) throw profileError;

    const { error: credentialError } = await admin
      .from('organization_staff_temp_credentials')
      .upsert({
        profile_id: createdUserId,
        organization_id: parsed.organizationId,
        login_id: loginId,
        login_id_normalized: loginId.toLowerCase(),
        login_email: loginEmail,
        contact_email: parsed.email?.trim() || null,
        contact_phone: parsed.phone?.trim() || null,
        issued_by: auth.user.id,
        must_change_password: true
      }, { onConflict: 'profile_id' });
    if (credentialError) throw credentialError;
  } catch (error) {
    await admin.auth.admin.deleteUser(createdUserId);
    throw error;
  }

  // 핵심 감사 로그: 직원 임시계정 발급
  const supabaseForLog = await createSupabaseServerClient();
  await supabaseForLog.from('audit_logs').insert({
    action: 'staff_temp_credential.issued',
    resource_type: 'organization_staff_temp_credentials',
    resource_id: createdUserId,
    organization_id: parsed.organizationId,
    actor_id: auth.user.id,
    meta: { login_id: loginId, target_name: parsed.name }
  });

  revalidatePath('/settings/team');
  const cookieStore = await cookies();
  cookieStore.set('_vs_staff_issued_pw', tempPassword, {
    maxAge: 120,
    path: '/settings/team',
    sameSite: 'strict',
    httpOnly: true
  });
  redirect(`/settings/team?issuedLoginId=${encodeURIComponent(loginId)}`);
}

// 의뢰인 직접 초대를 생성한다.
export async function createClientDirectInvitationAction(formData: FormData) {
  const parsed = clientDirectInvitationSchema.parse({
    organizationId: formData.get('organizationId'),
    caseId: formData.get('caseId'),
    email: formData.get('email'),
    expiresHours: formData.get('expiresHours') || 72
  });
  const returnPath = `${formData.get('returnPath') ?? ''}`.trim();

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 의뢰인을 초대할 수 있습니다.');
  const supabase = await createSupabaseServerClient();
  const token = createInvitationToken();

  const { data: existingClient } = await supabase
    .from('case_clients')
    .select('id, client_name')
    .eq('organization_id', parsed.organizationId)
    .eq('case_id', parsed.caseId)
    .eq('client_email_snapshot', parsed.email)
    .maybeSingle();

  const { error } = await supabase.from('invitations').insert({
    organization_id: parsed.organizationId,
    case_id: parsed.caseId,
    case_client_id: existingClient?.id ?? null,
    kind: 'client_invite',
    email: parsed.email,
    invited_name: existingClient?.client_name ?? parsed.email,
    token_hash: hashInvitationToken(token),
    share_token: null,
    token_hint: token.slice(-6),
    note: '의뢰인 직접 초대',
    created_by: auth.user.id,
    expires_at: new Date(Date.now() + parsed.expiresHours * 60 * 60 * 1000).toISOString()
  });
  if (error) throw error;

  revalidatePath('/clients');
  if (returnPath) {
    const separator = returnPath.includes('?') ? '&' : '?';
    redirect(`${returnPath}${separator}invite=${encodeURIComponent(token)}` as Route);
  }

  redirect(`/clients?invite=${encodeURIComponent(token)}`);
}

async function createClientInvitationBatch(parsed: z.infer<typeof clientStructuredBulkInviteSchema>) {
  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 의뢰인을 초대할 수 있습니다.');
  const supabase = await createSupabaseServerClient();
  const created: Array<{ name: string; email: string; relationLabel: string | null; caseClientId: string; url: string }> = [];
  const failed: Array<{ name: string; email: string; reason: string }> = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, title')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    throw caseError ?? new Error('연결할 사건을 찾을 수 없습니다.');
  }

  for (const entry of parsed.entries) {
    const normalizedEmail = entry.email.trim().toLowerCase();
    const relationLabel = entry.relationLabel?.trim() || '의뢰인';
    let caseClientId: string | null = null;

    const { data: existingCaseClient } = await supabase
      .from('case_clients')
      .select('id')
      .eq('organization_id', parsed.organizationId)
      .eq('case_id', parsed.caseId)
      .eq('client_email_snapshot', normalizedEmail)
      .maybeSingle();

    if (existingCaseClient?.id) {
      caseClientId = existingCaseClient.id;
    } else {
      const { data: insertedCaseClient, error: caseClientError } = await supabase
        .from('case_clients')
        .insert({
          organization_id: parsed.organizationId,
          case_id: parsed.caseId,
          profile_id: null,
          client_name: entry.name,
          client_email_snapshot: normalizedEmail,
          relation_label: relationLabel,
          is_portal_enabled: false,
          link_status: 'linked',
          relink_policy: 'auto_when_profile_returns',
          created_by: auth.user.id,
          updated_by: auth.user.id
        })
        .select('id')
        .single();

      if (caseClientError || !insertedCaseClient?.id) {
        failed.push({
          name: entry.name,
          email: normalizedEmail,
          reason: getActionErrorMessage(caseClientError, '의뢰인 연결 정보를 생성하지 못했습니다.')
        });
        continue;
      }

      caseClientId = insertedCaseClient.id;
    }

    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', parsed.organizationId)
      .eq('case_client_id', caseClientId)
      .eq('status', 'pending')
      .eq('kind', 'client_invite')
      .maybeSingle();

    if (existingInvite?.id) {
      failed.push({
        name: entry.name,
        email: normalizedEmail,
        reason: '이미 대기 중인 초대가 있습니다.'
      });
      continue;
    }

    const token = createInvitationToken();
    const { error: inviteError } = await supabase.from('invitations').insert({
      organization_id: parsed.organizationId,
      case_id: parsed.caseId,
      case_client_id: caseClientId,
      kind: 'client_invite',
      email: normalizedEmail,
      invited_name: entry.name,
      token_hash: hashInvitationToken(token),
      share_token: null,
      token_hint: token.slice(-6),
      note: buildClientInvitationNote(entry.secondaryContact, relationLabel, entry.phone),
      created_by: auth.user.id,
      expires_at: new Date(Date.now() + parsed.expiresHours * 60 * 60 * 1000).toISOString()
    });

    if (inviteError) {
      failed.push({
        name: entry.name,
        email: normalizedEmail,
        reason: getActionErrorMessage(inviteError, '의뢰인 초대 링크를 생성하지 못했습니다.')
      });
      continue;
    }

    created.push({
      name: entry.name,
      email: normalizedEmail,
      relationLabel,
      caseClientId: caseClientId!,
      url: `${appUrl}/invite/${token}`
    });
  }

  if (!created.length) {
    throw new Error(failed[0]?.reason || '의뢰인 초대 링크를 생성하지 못했습니다.');
  }

  return {
    caseId: parsed.caseId,
    caseTitle: caseRow.title ?? '연결 사건',
    created,
    failed,
    expiresHours: parsed.expiresHours
  };
}

export type ClientInvitationBatchResult = {
  ok: true;
  caseId: string;
  caseTitle: string;
  expiresHours: number;
  created: Array<{ name: string; email: string; relationLabel: string | null; caseClientId: string; url: string }>;
  failed: Array<{ name: string; email: string; reason: string }>;
} | {
  ok: false;
  message: string;
};

export async function createClientBulkInvitationBatchAction(input: {
  organizationId: string;
  caseId: string;
  expiresHours?: number;
  entries: Array<z.infer<typeof clientBulkInviteEntrySchema>>;
}): Promise<ClientInvitationBatchResult> {
  try {
    const parsed = clientStructuredBulkInviteSchema.parse({
      organizationId: input.organizationId,
      caseId: input.caseId,
      expiresHours: input.expiresHours ?? 72,
      entries: input.entries
    });
    const result = await createClientInvitationBatch(parsed);
    revalidatePath('/clients');

    return {
      ok: true,
      caseId: result.caseId,
      caseTitle: result.caseTitle,
      expiresHours: result.expiresHours,
      created: result.created,
      failed: result.failed
    };
  } catch (error) {
    return {
      ok: false,
      message: getActionErrorMessage(error, '의뢰인 초대 링크를 생성하지 못했습니다.')
    };
  }
}

// 의뢰인 대량 초대를 생성한다.
export async function createClientBulkInvitationAction(formData: FormData) {
  const parsed = clientStructuredBulkInviteSchema.parse({
    organizationId: formData.get('organizationId'),
    caseId: formData.get('caseId'),
    expiresHours: formData.get('expiresHours') || 72,
    entries: parseJsonEntries<z.infer<typeof clientBulkInviteEntrySchema>>(formData, 'entries')
  });

  const result = await createClientInvitationBatch(parsed);
  const previewCreated = result.created.slice(0, 20);
  const previewFailed = result.failed.slice(0, 20);

  const cookieStore = await cookies();
  cookieStore.set(
    '_vs_client_invite_summary',
    encodeURIComponent(JSON.stringify({
      caseId: result.caseId,
      caseTitle: result.caseTitle,
      created: previewCreated,
      createdTotal: result.created.length,
      failed: previewFailed,
      failedTotal: result.failed.length,
      expiresHours: result.expiresHours,
      previewOnly: result.created.length > previewCreated.length || result.failed.length > previewFailed.length
    })),
    {
      maxAge: 300,
      path: '/clients',
      sameSite: 'strict',
      httpOnly: false
    }
  );

  revalidatePath('/clients');
  redirect(`/clients?clientInviteBatch=${result.created.length}&clientInviteFailed=${result.failed.length}`);
}

// 사전 등록 의뢰인 초대를 생성한다.
export async function createClientPreRegisteredInvitationAction(formData: FormData) {
  const parsed = clientPreRegisterInvitationSchema.parse({
    organizationId: formData.get('organizationId'),
    caseId: formData.get('caseId'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    note: formData.get('note'),
    relationLabel: formData.get('relationLabel'),
    expiresHours: formData.get('expiresHours') || 72
  });

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 의뢰인을 선등록할 수 있습니다.');
  const orgName = auth.memberships.find((membership) => membership.organization_id === parsed.organizationId)?.organization?.name ?? '현재 조직';
  const admin = createSupabaseAdminClient();
  const resolvedCaseId = parsed.caseId || null;
  const loginId = await generateUniqueClientTempLoginId(admin);
  const loginEmail = `client__${loginId}@client.vein.local`;
  const tempPassword = generateTempPassword();

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.name }
  });
  if (createUserError || !createdUser.user) throw createUserError ?? new Error('의뢰인 임시 계정을 생성하지 못했습니다.');
  const createdUserId = createdUser.user.id;

  try {
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: parsed.name,
        default_organization_id: parsed.organizationId,
        is_client_account: true,
        client_account_status: 'pending_initial_approval',
        client_account_status_changed_at: new Date().toISOString(),
        client_account_status_reason: '의뢰인 임시 계정 발급',
        must_change_password: true,
        must_complete_profile: true
      })
      .eq('id', createdUserId);
    if (profileError) throw profileError;

    const { error: credentialError } = await admin
      .from('client_temp_credentials')
      .insert({
        profile_id: createdUserId,
        organization_id: parsed.organizationId,
        case_id: resolvedCaseId,
        login_id: loginId,
        login_id_normalized: loginId.toLowerCase(),
        login_email: loginEmail,
        contact_email: parsed.email?.trim() || null,
        contact_phone: parsed.phone?.trim() || null,
        issued_by: auth.user.id,
        must_change_password: true
      });
    if (credentialError) throw credentialError;

    if (resolvedCaseId) {
      const { error: caseClientError } = await admin
        .from('case_clients')
        .insert({
          organization_id: parsed.organizationId,
          case_id: resolvedCaseId,
          profile_id: createdUserId,
          client_name: parsed.name,
          client_email_snapshot: parsed.email?.trim() || null,
          relation_label: parsed.relationLabel?.trim() || '의뢰인',
          is_portal_enabled: false,
          created_by: auth.user.id,
          updated_by: auth.user.id
        });
      if (caseClientError) throw caseClientError;
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(createdUserId);
    throw error;
  }

  // 핵심 감사 로그: 의뢰인 임시계정 발급
  const supabaseForLog = await createSupabaseServerClient();
  await supabaseForLog.from('audit_logs').insert({
    action: 'client_temp_credential.issued',
    resource_type: 'client_temp_credentials',
    resource_id: createdUserId,
    organization_id: parsed.organizationId,
    actor_id: auth.user.id,
    meta: { login_id: loginId, target_name: parsed.name }
  });

  revalidatePath('/clients');
  const cookieStore = await cookies();
  cookieStore.set('_vs_issued_pw', tempPassword, {
    maxAge: 120,
    path: '/clients',
    sameSite: 'strict',
    httpOnly: true
  });
  redirect(`/clients?issuedClientLoginId=${encodeURIComponent(loginId)}&issuedOrgName=${encodeURIComponent(orgName)}`);
}

// 기존 초대 링크를 다시 발송한다.
export async function resendInvitationLinkAction(formData: FormData) {
  const parsed = resendInvitationSchema.parse({
    invitationId: formData.get('invitationId'),
    expiresHours: formData.get('expiresHours') || 72
  });

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: invitationError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', parsed.invitationId)
    .maybeSingle();

  if (invitationError || !existing) {
    throw invitationError ?? new Error('초대 이력을 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationUserManagementAccess(existing.organization_id, '조직 관리자만 초대 링크를 재발송할 수 있습니다.');
  const token = createInvitationToken();

  const { error } = await supabase.from('invitations').insert({
    organization_id: existing.organization_id,
    case_id: existing.case_id,
    case_client_id: existing.case_client_id,
    kind: existing.kind,
    email: existing.email,
    invited_name: existing.invited_name,
    requested_role: existing.requested_role,
    actor_category: existing.actor_category,
    role_template_key: existing.role_template_key,
    case_scope_policy: existing.case_scope_policy,
    permissions_override: existing.permissions_override ?? {},
    token_hash: hashInvitationToken(token),
    share_token: null,
    token_hint: token.slice(-6),
    note: existing.note,
    created_by: auth.user.id,
    expires_at: new Date(Date.now() + parsed.expiresHours * 60 * 60 * 1000).toISOString(),
    status: 'pending'
  });
  if (error) throw error;

  revalidatePath('/clients');
  revalidatePath('/settings/team');
  if (existing.kind === 'staff_invite') {
    redirect(`/settings/team?invite=${encodeURIComponent(token)}`);
  }
  redirect(`/clients?invite=${encodeURIComponent(token)}`);
}

// 내 구성원 프로필 기본 정보를 수정한다.
export async function updateSelfMemberProfileAction(formData: FormData) {
  const parsed = selfMemberProfileUpdateSchema.parse({
    organizationId: formData.get('organizationId'),
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    displayTitle: formData.get('displayTitle'),
    residentNumber: formData.get('residentNumber'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    errorMessage: '조직 소속 구성원만 본인 정보를 수정할 수 있습니다.'
  });
  const supabase = await createSupabaseServerClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.fullName,
      phone_e164: parsed.phone?.trim() || null,
      must_complete_profile: false
    })
    .eq('id', auth.user.id);
  if (profileError) throw profileError;

  const { error: membershipError } = await supabase
    .from('organization_memberships')
    .update({
      title: parsed.displayTitle?.trim() || null
    })
    .eq('organization_id', parsed.organizationId)
    .eq('profile_id', auth.user.id);
  if (membershipError) throw membershipError;

  const normalizedResident = normalizeResidentRegistrationNumber(parsed.residentNumber ?? '');
  if (normalizedResident) {
    if (normalizedResident.length !== 13 || !isValidResidentRegistrationNumber(normalizedResident)) {
      throw new Error('유효한 주민등록번호 13자리를 입력해 주세요.');
    }
  }

  const nextAddressLine1 = parsed.addressLine1?.trim() || null;
  const nextAddressLine2 = parsed.addressLine2?.trim() || null;
  const shouldUpdatePrivateProfile = Boolean(normalizedResident || nextAddressLine1 || nextAddressLine2);

  if (shouldUpdatePrivateProfile) {
    const upsertPayload: Record<string, any> = { profile_id: auth.user.id };

    if (normalizedResident) {
      upsertPayload.resident_number_ciphertext = encryptString(normalizedResident);
      upsertPayload.resident_number_masked = formatResidentRegistrationNumberMasked(normalizedResident);
    }

    if (nextAddressLine1) {
      upsertPayload.address_line1_ciphertext = encryptString(nextAddressLine1);
      upsertPayload.address_line2_ciphertext = nextAddressLine2 ? encryptString(nextAddressLine2) : null;
    }

    const { error: privateProfileError } = await supabase
      .from('member_private_profiles')
      .upsert(upsertPayload, { onConflict: 'profile_id' });
    if (privateProfileError) throw privateProfileError;
  }

  revalidatePath('/settings/team');
}

// 관리자가 구성원 운영 요약 정보를 수정한다.
export async function updateMembershipAdminSummaryAction(formData: FormData) {
  const parsed = membershipAdminSummarySchema.parse({
    organizationId: formData.get('organizationId'),
    membershipId: formData.get('membershipId'),
    actorCategory: formData.get('actorCategory'),
    status: formData.get('status'),
    title: formData.get('title')
  });

  await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 구성원 상태를 수정할 수 있습니다.');
  const supabase = await createSupabaseServerClient();

  const { data: targetMember, error: memberReadError } = await supabase
    .from('organization_memberships')
    .select('id, role')
    .eq('id', parsed.membershipId)
    .eq('organization_id', parsed.organizationId)
    .maybeSingle();

  if (memberReadError || !targetMember) {
    throw memberReadError ?? new Error('수정 대상 구성원을 찾을 수 없습니다.');
  }

  if (targetMember.role === 'org_owner') {
    throw new Error('조직관리자는 이 화면에서 변경할 수 없습니다.');
  }

  const role = parsed.actorCategory === 'admin' ? 'org_manager' : 'org_staff';
  const { error } = await supabase
    .from('organization_memberships')
    .update({
      role,
      actor_category: parsed.actorCategory,
      status: parsed.status,
      title: parsed.title?.trim() || null
    })
    .eq('id', parsed.membershipId)
    .eq('organization_id', parsed.organizationId);

  if (error) throw error;
  revalidatePath('/settings/team');
}

// 조직 멤버십을 삭제한다.
export async function deleteMembershipAction(formData: FormData) {
  const parsed = membershipDeleteSchema.parse({
    organizationId: formData.get('organizationId'),
    membershipId: formData.get('membershipId')
  });

  const { auth } = await requireOrganizationUserManagementAccess(parsed.organizationId, '조직 관리자만 구성원을 삭제할 수 있습니다.');
  const supabase = await createSupabaseServerClient();

  const { data: targetMember, error: memberReadError } = await supabase
    .from('organization_memberships')
    .select('id, role, profile_id')
    .eq('id', parsed.membershipId)
    .eq('organization_id', parsed.organizationId)
    .maybeSingle();

  if (memberReadError || !targetMember) {
    throw memberReadError ?? new Error('삭제 대상 구성원을 찾을 수 없습니다.');
  }

  if (targetMember.role === 'org_owner') {
    throw new Error('조직관리자는 삭제할 수 없습니다.');
  }

  if (targetMember.profile_id === auth.user.id) {
    throw new Error('본인 계정은 이 화면에서 삭제할 수 없습니다.');
  }

  const { error } = await supabase
    .from('organization_memberships')
    .update({
      status: 'suspended',
      title: targetMember.role === 'org_staff' ? '삭제 처리됨' : null
    })
    .eq('id', parsed.membershipId)
    .eq('organization_id', parsed.organizationId);

  if (error) throw error;
  revalidatePath('/settings/team');
}

// 구성원별 권한 설정을 갱신한다.
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

// 기본 조직 컨텍스트를 전환한다.
export async function switchDefaultOrganizationAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const organizationId = `${formData.get('organizationId') ?? ''}`;
  const contextOrganizationId = `${formData.get('contextOrganizationId') ?? ''}`.trim() || null;
  if (!contextOrganizationId) {
    throw new Error('현재 조직 정보를 확인할 수 없습니다. 페이지를 새로고침해 주세요.');
  }
  const canUsePlatformScope = await hasActivePlatformAdminView(auth, contextOrganizationId);

  if (!organizationId) {
    throw new Error('전환할 조직을 선택해 주세요.');
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  if (!hasMembership && !canUsePlatformScope) {
    throw new Error('해당 조직의 구성원이 아닙니다. 초대를 받은 뒤 다시 시도해 주세요.');
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

// 다른 조직에 협업 제안을 생성한다.
export async function createOrganizationCollaborationRequestAction(formData: FormData) {
  const parsed = collaborationRequestCreateSchema.parse({
    sourceOrganizationId: formData.get('sourceOrganizationId'),
    targetOrganizationId: formData.get('targetOrganizationId'),
    title: formData.get('title'),
    proposalNote: formData.get('proposalNote'),
    returnPath: formData.get('returnPath')
  });

  if (parsed.sourceOrganizationId === parsed.targetOrganizationId) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'COLLABORATION_SAME_ORGANIZATION',
      blocked: '같은 조직에는 협업 제안을 보낼 수 없습니다.',
      cause: '출발 조직과 대상 조직이 동일합니다.',
      resolution: '다른 조직을 선택한 뒤 다시 시도해 주세요.'
    }));
  }

  const { auth } = await requireOrganizationActionAccess(parsed.sourceOrganizationId, {
    requireManager: true,
    errorMessage: '협업 제안은 조직 관리자만 보낼 수 있습니다.'
  });

  const effectiveOrganizationId = getEffectiveOrganizationId(auth);
  if (effectiveOrganizationId !== parsed.sourceOrganizationId) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_CONTEXT_MISMATCH',
      blocked: '현재 선택된 조직 기준으로만 협업 제안을 보낼 수 있습니다.',
      cause: `현재 조직 컨텍스트(${effectiveOrganizationId})와 요청 조직(${parsed.sourceOrganizationId})이 다릅니다.`,
      resolution: '상단 조직 전환 후 다시 시도해 주세요.'
    }));
  }

  const adminClient = createSupabaseAdminClient();
  const [sourceOrgResponse, targetOrgResponse, existingHub, existingRequestResponse] = await Promise.all([
    adminClient.from('organizations').select('id, name, slug').eq('id', parsed.sourceOrganizationId).maybeSingle(),
    adminClient.from('organizations').select('id, name, slug, lifecycle_status').eq('id', parsed.targetOrganizationId).maybeSingle(),
    findActiveCollaborationHub(adminClient, parsed.sourceOrganizationId, parsed.targetOrganizationId),
    adminClient
      .from('organization_collaboration_requests')
      .select('id, status')
      .eq('status', 'pending')
      .or(`and(source_organization_id.eq.${parsed.sourceOrganizationId},target_organization_id.eq.${parsed.targetOrganizationId}),and(source_organization_id.eq.${parsed.targetOrganizationId},target_organization_id.eq.${parsed.sourceOrganizationId})`)
      .maybeSingle()
  ]);

  if (sourceOrgResponse.error || !sourceOrgResponse.data) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_SOURCE_ORG_NOT_FOUND',
      blocked: '현재 조직 정보를 찾을 수 없습니다.',
      cause: sourceOrgResponse.error?.message ?? '출발 조직이 삭제되었거나 조회할 수 없습니다.',
      resolution: '조직 상태를 확인한 뒤 다시 시도해 주세요.'
    }));
  }

  if (targetOrgResponse.error || !targetOrgResponse.data || targetOrgResponse.data.lifecycle_status === 'soft_deleted') {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_TARGET_ORG_NOT_FOUND',
      blocked: '제안할 대상 조직을 찾을 수 없습니다.',
      cause: targetOrgResponse.error?.message ?? '대상 조직이 삭제되었거나 조회할 수 없습니다.',
      resolution: '대상 조직을 다시 확인한 뒤 시도해 주세요.'
    }));
  }

  const sourceOrganization = sourceOrgResponse.data;

  if (existingHub?.id) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_HUB_ALREADY_EXISTS',
      blocked: '이미 활성화된 업무 허브가 있습니다.',
      cause: '두 조직 사이에 활성 상태의 협업 허브가 이미 존재합니다.',
      resolution: '기존 업무 허브를 열어 이어서 사용해 주세요.'
    }));
  }

  if (existingRequestResponse.error) {
    throw existingRequestResponse.error;
  }

  if (existingRequestResponse.data?.id) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_REQUEST_ALREADY_PENDING',
      blocked: '이미 처리 대기 중인 협업 제안이 있습니다.',
      cause: '같은 조직 조합에 대해 보류 중인 협업 요청이 존재합니다.',
      resolution: '기존 요청의 승인 또는 반려 결과를 먼저 확인해 주세요.'
    }));
  }

  const { data: requestRow, error: insertError } = await adminClient
    .from('organization_collaboration_requests')
    .insert({
      source_organization_id: parsed.sourceOrganizationId,
      target_organization_id: parsed.targetOrganizationId,
      requested_by_profile_id: auth.user.id,
      title: parsed.title,
      proposal_note: parsed.proposalNote || null
    })
    .select('id')
    .single();

  if (insertError || !requestRow) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_REQUEST_CREATE_FAILED',
      blocked: '협업 제안을 저장하지 못했습니다.',
      cause: insertError?.message ?? '협업 요청을 저장했지만 요청 ID를 돌려받지 못했습니다.',
      resolution: '잠시 후 다시 시도해 주세요.'
    }));
  }

  const targetManagerIds = await listOrganizationManagerProfileIds(adminClient, parsed.targetOrganizationId);
  if (targetManagerIds.length) {
    const { error: notificationError } = await adminClient.from('notifications').insert(
      targetManagerIds.map((profileId) => ({
        organization_id: parsed.targetOrganizationId,
        recipient_profile_id: profileId,
        kind: 'generic',
        entity_type: 'collaboration',
        title: `${sourceOrganization.name}에서 협업 제안을 보냈습니다.`,
        body: `${parsed.title}${parsed.proposalNote ? ` · ${parsed.proposalNote}` : ''}`,
        payload: { request_id: requestRow.id, source_organization_id: parsed.sourceOrganizationId, target_organization_id: parsed.targetOrganizationId },
        requires_action: true,
        action_label: '승인 검토',
        action_href: `/organizations/${parsed.targetOrganizationId}`,
        action_entity_type: 'organization_collaboration_request',
        action_target_id: requestRow.id,
        destination_type: 'internal_route',
        destination_url: `/organizations/${parsed.targetOrganizationId}`
      }))
    );

    if (notificationError) throw notificationError;
  }

  revalidatePath('/organizations');
  revalidatePath(`/organizations/${parsed.targetOrganizationId}`);
  revalidatePath(`/organizations/${parsed.sourceOrganizationId}`);
  revalidatePath('/inbox');

  if (parsed.returnPath) {
    redirect(parsed.returnPath as Route);
  }
}

// 받은 협업 제안을 승인 또는 반려한다.
export async function reviewOrganizationCollaborationRequestAction(formData: FormData) {
  const parsed = collaborationRequestReviewSchema.parse({
    requestId: formData.get('requestId'),
    organizationId: formData.get('organizationId'),
    decision: formData.get('decision'),
    responseNote: formData.get('responseNote'),
    returnPath: formData.get('returnPath')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    requireManager: true,
    errorMessage: '협업 제안 검토는 조직 관리자만 처리할 수 있습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: requestRow, error: requestError } = await adminClient
    .from('organization_collaboration_requests')
    .select('id, source_organization_id, target_organization_id, title, proposal_note, status')
    .eq('id', parsed.requestId)
    .eq('target_organization_id', parsed.organizationId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_REQUEST_NOT_FOUND',
      blocked: '협업 제안을 찾을 수 없습니다.',
      cause: requestError?.message ?? '해당 협업 제안이 삭제되었거나 더 이상 접근할 수 없습니다.',
      resolution: '목록을 새로고침한 뒤 다시 확인해 주세요.'
    }));
  }

  if (requestRow.status !== 'pending') {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_REQUEST_ALREADY_REVIEWED',
      blocked: '이미 처리된 협업 제안입니다.',
      cause: `현재 협업 제안 상태가 ${requestRow.status} 입니다.`,
      resolution: '목록을 새로고침해 현재 상태를 확인해 주세요.'
    }));
  }

  const [sourceOrgResponse, targetOrgResponse] = await Promise.all([
    adminClient.from('organizations').select('id, name, slug').eq('id', requestRow.source_organization_id).maybeSingle(),
    adminClient.from('organizations').select('id, name, slug').eq('id', requestRow.target_organization_id).maybeSingle()
  ]);

  if (sourceOrgResponse.error || !sourceOrgResponse.data) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_SOURCE_ORG_NOT_FOUND',
      blocked: '제안 조직 정보를 찾을 수 없습니다.',
      cause: sourceOrgResponse.error?.message ?? '제안을 보낸 조직 정보를 조회할 수 없습니다.',
      resolution: '잠시 후 다시 시도해 주세요.'
    }));
  }

  if (targetOrgResponse.error || !targetOrgResponse.data) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'COLLABORATION_TARGET_ORG_NOT_FOUND',
      blocked: '대상 조직 정보를 찾을 수 없습니다.',
      cause: targetOrgResponse.error?.message ?? '대상 조직 정보를 조회할 수 없습니다.',
      resolution: '잠시 후 다시 시도해 주세요.'
    }));
  }

  const sourceOrganization = sourceOrgResponse.data;
  const targetOrganization = targetOrgResponse.data;

  let approvedHubId: string | null = null;
  if (parsed.decision === 'approved') {
    const existingHub = await findActiveCollaborationHub(adminClient, requestRow.source_organization_id, requestRow.target_organization_id);
    if (existingHub?.id) {
      approvedHubId = existingHub.id;
    } else {
      const { data: createdHub, error: hubError } = await adminClient
        .from('organization_collaboration_hubs')
        .insert({
          primary_organization_id: requestRow.source_organization_id,
          partner_organization_id: requestRow.target_organization_id,
          request_id: requestRow.id,
          created_by_profile_id: auth.user.id,
          title: `${sourceOrganization.name} × ${targetOrganization.name} 업무 허브`,
          summary: requestRow.proposal_note || null,
          status: 'active'
        })
        .select('id')
        .single();

      if (hubError || !createdHub) {
        throwGuardFeedback(createConditionFailedFeedback({
          code: 'COLLABORATION_HUB_CREATE_FAILED',
          blocked: '업무 허브를 생성하지 못했습니다.',
          cause: hubError?.message ?? '허브 생성 후 허브 ID를 돌려받지 못했습니다.',
          resolution: '잠시 후 다시 시도해 주세요.'
        }));
      }

      approvedHubId = createdHub.id;

      const { error: seedMessageError } = await adminClient.from('organization_collaboration_messages').insert({
        hub_id: approvedHubId,
        organization_id: parsed.organizationId,
        sender_profile_id: auth.user.id,
        body: `${targetOrganization.name}에서 협업 제안을 승인했습니다. 이 허브에서 사건 연결, 초대, 대화를 이어갈 수 있습니다.`,
        metadata: { request_id: requestRow.id, kind: 'approval_seed' }
      });

      if (seedMessageError) throw seedMessageError;
    }
  }

  const resolvedAt = new Date().toISOString();
  const nextStatus = parsed.decision === 'approved' ? 'approved' : 'rejected';
  const { error: updateError } = await adminClient
    .from('organization_collaboration_requests')
    .update({
      status: nextStatus,
      response_note: parsed.responseNote || null,
      reviewed_by_profile_id: auth.user.id,
      reviewed_at: resolvedAt,
      approved_at: parsed.decision === 'approved' ? resolvedAt : null,
      approved_hub_id: approvedHubId
    })
    .eq('id', parsed.requestId)
    .eq('status', 'pending');

  if (updateError) throw updateError;

  await adminClient
    .from('notifications')
    .update({ resolved_at: resolvedAt })
    .eq('organization_id', parsed.organizationId)
    .eq('action_entity_type', 'organization_collaboration_request')
    .eq('action_target_id', parsed.requestId)
    .is('resolved_at', null);

  const sourceManagerIds = await listOrganizationManagerProfileIds(adminClient, requestRow.source_organization_id);
  if (sourceManagerIds.length) {
    const approvedHref = approvedHubId ? `/inbox/${approvedHubId}` : `/organizations/${requestRow.source_organization_id}`;
    const { error: notificationError } = await adminClient.from('notifications').insert(
      sourceManagerIds.map((profileId) => ({
        organization_id: requestRow.source_organization_id,
        recipient_profile_id: profileId,
        kind: 'generic',
        entity_type: 'collaboration',
        title: parsed.decision === 'approved' ? '협업 제안이 승인되었습니다.' : '협업 제안이 반려되었습니다.',
        body: parsed.decision === 'approved'
          ? `${targetOrganization.name}에서 협업 제안을 승인했습니다. 업무 허브로 바로 이동할 수 있습니다.`
          : `${targetOrganization.name}에서 협업 제안을 반려했습니다.${parsed.responseNote ? ` 메모: ${parsed.responseNote}` : ''}`,
        payload: { request_id: requestRow.id, hub_id: approvedHubId, decision: parsed.decision },
        action_label: parsed.decision === 'approved' ? '업무 허브 열기' : '상세 보기',
        action_href: approvedHref,
        destination_type: 'internal_route',
        destination_url: approvedHref
      }))
    );

    if (notificationError) throw notificationError;
  }

  revalidatePath('/organizations');
  revalidatePath(`/organizations/${parsed.organizationId}`);
  revalidatePath(`/organizations/${requestRow.source_organization_id}`);
  revalidatePath('/inbox');
  if (approvedHubId) {
    revalidatePath(`/inbox/${approvedHubId}`);
  }

  if (parsed.returnPath) {
    redirect(parsed.returnPath as Route);
  }
}

// 협업 허브에 메시지를 전송한다.
export async function postCollaborationHubMessageAction(formData: FormData) {
  const parsed = collaborationHubMessageSchema.parse({
    hubId: formData.get('hubId'),
    organizationId: formData.get('organizationId'),
    body: formData.get('body'),
    documentTitle: formData.get('documentTitle'),
    caseId: formData.get('caseId'),
    returnPath: formData.get('returnPath')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    errorMessage: '업무 허브에 메시지를 남길 권한이 없습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: hubRow, error: hubError } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id, title, status')
    .eq('id', parsed.hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (hubError || !hubRow) {
    throw hubError ?? new Error('업무 허브를 찾을 수 없습니다.');
  }

  const hubOrganizationIds = [hubRow.primary_organization_id, hubRow.partner_organization_id];
  if (!hubOrganizationIds.includes(parsed.organizationId)) {
    throw new Error('현재 조직은 이 업무 허브에 참여하고 있지 않습니다.');
  }

  const upload = formData.get('documentFile');
  const hasMessageBody = Boolean(parsed.body?.trim());
  const hasUpload = upload instanceof File && upload.size > 0;
  if (!hasMessageBody && !hasUpload) {
    throw new Error('메시지 또는 공유 문서 중 하나는 반드시 입력해 주세요.');
  }

  let linkedCaseTitle: string | null = null;
  if (parsed.caseId) {
    const { data: caseRow, error: caseError } = await adminClient
      .from('cases')
      .select('id, title')
      .eq('id', parsed.caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      throw caseError ?? new Error('연결할 사건을 찾을 수 없습니다.');
    }

    linkedCaseTitle = caseRow.title ?? '사건';
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'case-files';
  let uploadedDocument:
    | {
        id: string;
        title: string;
        fileName: string;
        fileSize: number;
      }
    | null = null;
  let uploadedStoragePath: string | null = null;

  if (hasUpload && upload instanceof File) {
    if (upload.size > maxCollaborationDocumentSize) {
      throw new Error('공유 문서는 15MB 이하 파일만 업로드할 수 있습니다.');
    }

    uploadedStoragePath = buildCollaborationDocumentStoragePath(parsed.organizationId, parsed.hubId, upload.name);
    const { error: uploadError } = await adminClient.storage.from(bucket).upload(uploadedStoragePath, upload, {
      contentType: upload.type,
      upsert: false
    });

    if (uploadError) {
      throw uploadError;
    }

    const documentTitle = parsed.documentTitle?.trim() || upload.name.replace(/\.[^.]+$/, '') || '허브 공유 문서';
    const { data: documentRow, error: documentError } = await adminClient
      .from('case_documents')
      .insert({
        organization_id: parsed.organizationId,
        case_id: parsed.caseId || null,
        title: documentTitle,
        document_kind: 'other',
        approval_status: 'draft',
        client_visibility: 'internal_only',
        storage_path: uploadedStoragePath,
        mime_type: upload.type || null,
        file_size: upload.size,
        summary: hasMessageBody ? parsed.body?.trim() || null : '조직 협업 허브에서 공유된 문서입니다.',
        created_by: auth.user.id,
        created_by_name: auth.profile.full_name,
        updated_by: auth.user.id
      })
      .select('id, title, file_size')
      .single();

    if (documentError || !documentRow) {
      if (uploadedStoragePath) {
        await adminClient.storage.from(bucket).remove([uploadedStoragePath]).catch(() => undefined);
      }
      throw documentError ?? new Error('업로드 문서를 등록하지 못했습니다.');
    }

    uploadedDocument = {
      id: documentRow.id,
      title: documentRow.title ?? documentTitle,
      fileName: upload.name,
      fileSize: documentRow.file_size ?? upload.size
    };
  }

  const messageBody = hasMessageBody
    ? parsed.body!.trim()
    : uploadedDocument
      ? `${uploadedDocument.title} 문서를 공유했습니다.`
      : '';

  const { error: insertError } = await adminClient.from('organization_collaboration_messages').insert({
    hub_id: parsed.hubId,
    organization_id: parsed.organizationId,
    sender_profile_id: auth.user.id,
    case_id: parsed.caseId || null,
    body: messageBody,
    metadata: {
      ...(parsed.caseId ? { linked_case_id: parsed.caseId } : {}),
      ...(uploadedDocument
        ? {
            uploaded_document: {
              id: uploadedDocument.id,
              title: uploadedDocument.title,
              file_name: uploadedDocument.fileName,
              file_size: uploadedDocument.fileSize
            }
          }
        : {})
    }
  });

  if (insertError) {
    if (uploadedStoragePath) {
      await adminClient.storage.from(bucket).remove([uploadedStoragePath]).catch(() => undefined);
    }
    throw insertError;
  }

  const partnerOrganizationId = hubRow.primary_organization_id === parsed.organizationId
    ? hubRow.partner_organization_id
    : hubRow.primary_organization_id;
  const partnerManagerIds = await listOrganizationManagerProfileIds(adminClient, partnerOrganizationId);
  if (partnerManagerIds.length) {
    const senderOrganizationName = auth.memberships.find((membership) => membership.organization_id === parsed.organizationId)?.organization?.name ?? '협업 조직';
    const { error: notificationError } = await adminClient.from('notifications').insert(
      partnerManagerIds.map((profileId) => ({
        organization_id: partnerOrganizationId,
        recipient_profile_id: profileId,
        kind: 'generic',
        entity_type: 'collaboration',
        title: `${senderOrganizationName}에서 업무 허브 메시지가 도착했습니다.`,
        body: linkedCaseTitle ? `${messageBody} · 연결 사건: ${linkedCaseTitle}` : messageBody,
        payload: {
          hub_id: parsed.hubId,
          case_id: parsed.caseId || null,
          uploaded_document_id: uploadedDocument?.id ?? null
        },
        action_label: '업무 허브 열기',
        action_href: `/inbox/${parsed.hubId}`,
        destination_type: 'internal_route',
        destination_url: `/inbox/${parsed.hubId}`
      }))
    );

    if (notificationError) throw notificationError;
  }

  revalidatePath('/inbox');
  revalidatePath(`/inbox/${parsed.hubId}`);

  if (parsed.returnPath) {
    redirect(parsed.returnPath as Route);
  }
}

// 협업 허브 메시지를 읽음 처리한다.
export async function markCollaborationHubReadAction(formData: FormData) {
  const parsed = collaborationHubReadSchema.parse({
    hubId: formData.get('hubId'),
    organizationId: formData.get('organizationId')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    errorMessage: '업무 허브 읽음 상태를 갱신할 권한이 없습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: hubRow, error: hubError } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id')
    .eq('id', parsed.hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (hubError || !hubRow) {
    throw hubError ?? new Error('업무 허브를 찾을 수 없습니다.');
  }

  if (![hubRow.primary_organization_id, hubRow.partner_organization_id].includes(parsed.organizationId)) {
    throw new Error('현재 조직은 이 업무 허브에 참여하고 있지 않습니다.');
  }

  const { error } = await adminClient.from('organization_collaboration_reads').upsert({
    hub_id: parsed.hubId,
    organization_id: parsed.organizationId,
    profile_id: auth.user.id,
    last_read_at: new Date().toISOString()
  }, { onConflict: 'hub_id,profile_id' });

  if (error) throw error;

  revalidatePath('/inbox');
  revalidatePath(`/inbox/${parsed.hubId}`);
}

export async function verifyCollaborationHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const pin = `${formData.get('pin') ?? ''}`.trim();

  if (!hubId || !organizationId || pin.length !== 4) {
    throw new Error('업무 허브 비밀번호 4자리를 입력해 주세요.');
  }

  await requireOrganizationActionAccess(organizationId, {
    errorMessage: '업무 허브 입장 권한을 확인할 수 없습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: hubRow, error } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id, access_pin_enabled, access_pin_hash, access_pin_expires_at, status')
    .eq('id', hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !hubRow) {
    throw error ?? new Error('업무 허브를 찾을 수 없습니다.');
  }

  if (![hubRow.primary_organization_id, hubRow.partner_organization_id].includes(organizationId)) {
    throw new Error('현재 조직은 이 업무 허브를 볼 수 없습니다.');
  }

  if (hubRow.access_pin_enabled && hubRow.access_pin_hash) {
    if (!hubRow.access_pin_expires_at || new Date(hubRow.access_pin_expires_at).getTime() <= Date.now()) {
      const refreshedPin = generateFourDigitPin();
      const nextExpiresAt = pinExpiresAt();
      await adminClient
        .from('organization_collaboration_hubs')
        .update({
          access_pin_hash: hashHubPin(refreshedPin),
          access_pin_expires_at: nextExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', hubId);
      await revokeHubPinAccess('collaboration_hub', hubId);
      throw new Error('기존 조직허브 PIN이 만료되었습니다. 새 PIN이 다시 생성되었습니다. 허브 관리자에게 새 PIN을 확인해 주세요.');
    }
    if (hashHubPin(pin) !== hubRow.access_pin_hash) {
      throw new Error('업무 허브 비밀번호가 맞지 않습니다.');
    }
  }

  await grantHubPinAccess('collaboration_hub', hubId, hubRow.access_pin_expires_at ?? null);
}

export async function updateCollaborationHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const pin = `${formData.get('pin') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('업무 허브 정보를 확인할 수 없습니다.');
  }

  await requireOrganizationActionAccess(organizationId, {
    requireManager: true,
    errorMessage: '조직 관리자만 업무 허브 비밀번호를 설정할 수 있습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: hubRow, error: hubError } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id')
    .eq('id', hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (hubError || !hubRow) {
    throw hubError ?? new Error('업무 허브를 찾을 수 없습니다.');
  }

  if (![hubRow.primary_organization_id, hubRow.partner_organization_id].includes(organizationId)) {
    throw new Error('현재 조직은 이 업무 허브를 관리할 수 없습니다.');
  }

  const nextEnabled = pin.length === 4;
  const { error } = await adminClient
    .from('organization_collaboration_hubs')
    .update({
      access_pin_enabled: nextEnabled,
      access_pin_hash: nextEnabled ? hashHubPin(pin) : null,
      access_pin_expires_at: nextEnabled ? pinExpiresAt() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', hubId);

  if (error) throw error;

  await revokeHubPinAccess('collaboration_hub', hubId);
  revalidatePath(`/inbox/${hubId}`);
  revalidatePath('/inbox');
}

export async function generateCollaborationHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('업무 허브 정보를 확인할 수 없습니다.');
  }

  await requireOrganizationActionAccess(organizationId, {
    requireManager: true,
    errorMessage: '조직 관리자만 업무 허브 비밀번호를 생성할 수 있습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: hubRow, error: hubError } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id')
    .eq('id', hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (hubError || !hubRow) {
    throw hubError ?? new Error('업무 허브를 찾을 수 없습니다.');
  }

  if (![hubRow.primary_organization_id, hubRow.partner_organization_id].includes(organizationId)) {
    throw new Error('현재 조직은 이 업무 허브를 관리할 수 없습니다.');
  }

  const pin = generateFourDigitPin();
  const { error } = await adminClient
    .from('organization_collaboration_hubs')
    .update({
      access_pin_enabled: true,
      access_pin_hash: hashHubPin(pin),
      access_pin_expires_at: pinExpiresAt(),
      updated_at: new Date().toISOString()
    })
    .eq('id', hubId);

  if (error) throw error;

  await revokeHubPinAccess('collaboration_hub', hubId);
  revalidatePath(`/inbox/${hubId}`);
  revalidatePath('/inbox');
  redirect(`/inbox/${hubId}/pin?generated=${pin}` as any);
}

// 사건을 협업 허브에 공유한다.
export async function shareCaseToCollaborationHubAction(formData: FormData) {
  const parsed = collaborationHubCaseShareSchema.parse({
    hubId: formData.get('hubId'),
    organizationId: formData.get('organizationId'),
    caseId: formData.get('caseId'),
    permissionScope: formData.get('permissionScope') || 'view',
    note: formData.get('note'),
    returnPath: formData.get('returnPath')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    permission: 'case_edit',
    errorMessage: '허브에 사건을 공유할 권한이 없습니다.'
  });

  const adminClient = createSupabaseAdminClient();
  const { data: hubRow, error: hubError } = await adminClient
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id')
    .eq('id', parsed.hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (hubError || !hubRow) {
    throw hubError ?? new Error('업무 허브를 찾을 수 없습니다.');
  }

  if (![hubRow.primary_organization_id, hubRow.partner_organization_id].includes(parsed.organizationId)) {
    throw new Error('현재 조직은 이 업무 허브에 참여하고 있지 않습니다.');
  }

  const { data: caseOrganization, error: caseOrganizationError } = await adminClient
    .from('case_organizations')
    .select('id')
    .eq('case_id', parsed.caseId)
    .eq('organization_id', parsed.organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (caseOrganizationError || !caseOrganization) {
    throw caseOrganizationError ?? new Error('현재 조직이 접근 가능한 사건만 허브에 공유할 수 있습니다.');
  }

  const { data: caseRow, error: caseError } = await adminClient
    .from('cases')
    .select('id, title')
    .eq('id', parsed.caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    throw caseError ?? new Error('공유할 사건을 찾을 수 없습니다.');
  }

  const { error: upsertError } = await adminClient.from('organization_collaboration_case_shares').upsert({
    hub_id: parsed.hubId,
    case_id: parsed.caseId,
    shared_by_organization_id: parsed.organizationId,
    shared_by_profile_id: auth.user.id,
    permission_scope: parsed.permissionScope,
    note: parsed.note || null
  }, { onConflict: 'hub_id,case_id' });

  if (upsertError) throw upsertError;

  const partnerOrganizationId = hubRow.primary_organization_id === parsed.organizationId
    ? hubRow.partner_organization_id
    : hubRow.primary_organization_id;
  const partnerManagerIds = await listOrganizationManagerProfileIds(adminClient, partnerOrganizationId);
  if (partnerManagerIds.length) {
    const senderOrganizationName = auth.memberships.find((membership) => membership.organization_id === parsed.organizationId)?.organization?.name ?? '협업 조직';
    const { error: notificationError } = await adminClient.from('notifications').insert(
      partnerManagerIds.map((profileId) => ({
        organization_id: partnerOrganizationId,
        recipient_profile_id: profileId,
        kind: 'generic',
        entity_type: 'collaboration',
        title: `${senderOrganizationName}에서 사건을 업무 허브에 공유했습니다.`,
        body: `${caseRow.title} · 권한 범위: ${parsed.permissionScope}`,
        payload: { hub_id: parsed.hubId, case_id: parsed.caseId, permission_scope: parsed.permissionScope },
        action_label: '허브 열기',
        action_href: `/inbox/${parsed.hubId}`,
        destination_type: 'internal_route',
        destination_url: `/inbox/${parsed.hubId}`
      }))
    );

    if (notificationError) throw notificationError;
  }

  revalidatePath('/inbox');
  revalidatePath(`/inbox/${parsed.hubId}`);
  if (parsed.returnPath) {
    redirect(parsed.returnPath as Route);
  }
}

// 의뢰인 조직 연결 요청을 접수한다.
export async function submitClientAccessRequestAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const adminClient = createSupabaseAdminClient();
  try {
    if (!auth.profile.is_client_account) {
      throwGuardFeedback(createConditionFailedFeedback({
        code: 'CLIENT_PROFILE_REQUIRED',
        blocked: '의뢰인 가입 정보가 먼저 필요합니다.',
        cause: '조직 연결 요청은 의뢰인 가입을 완료한 계정만 보낼 수 있습니다.',
        resolution: '의뢰인 가입을 먼저 완료한 뒤 다시 요청해 주세요.'
      }));
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
      throwGuardFeedback(createConditionFailedFeedback({
        code: 'TARGET_ORGANIZATION_NOT_FOUND',
        blocked: '연결할 조직을 찾을 수 없습니다.',
        cause: organizationError?.message ?? '입력한 조직이 삭제되었거나 조회할 수 없는 상태입니다.',
        resolution: '조직명 또는 조직 키를 다시 확인한 뒤 다시 시도해 주세요.'
      }));
    }

    if ((organization.slug ?? '').toLowerCase() !== parsed.organizationKey.toLowerCase()) {
      throwGuardFeedback(createValidationFailedFeedback({
        code: 'ORGANIZATION_KEY_MISMATCH',
        blocked: '조직 키가 일치하지 않습니다.',
        cause: `입력한 조직 키와 실제 조직 키(${organization.slug ?? '-'})가 다릅니다.`,
        resolution: '조직 담당자에게 받은 조직 키를 다시 확인한 뒤 요청해 주세요.'
      }));
    }

    const { data: existingPending } = await adminClient
      .from('client_access_requests')
      .select('id')
      .eq('target_organization_id', parsed.organizationId)
      .eq('requester_profile_id', auth.user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending?.id) {
      throwGuardFeedback(createConditionFailedFeedback({
        code: 'CLIENT_ACCESS_ALREADY_PENDING',
        blocked: '이미 검토 중인 조직 연결 요청이 있습니다.',
        cause: '같은 조직에 대한 연결 요청이 아직 처리 대기 상태입니다.',
        resolution: '기존 요청의 승인 또는 반려 결과를 먼저 확인해 주세요.'
      }));
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

// 의뢰인 조직 연결 요청을 승인 또는 반려한다.
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

// 승인된 의뢰인 연결 요청을 사건에 붙인다.
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
  const previousPortalEnabled = existingClient?.is_portal_enabled ?? false;
  let insertedCaseClientId: string | null = null;

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
    const insertPayload = {
      organization_id: parsed.organizationId,
      case_id: parsed.caseId,
      profile_id: requestRow.requester_profile_id,
      client_name: clientName,
      client_email_snapshot: requestRow.requester_email,
      relation_label: relationLabel,
      is_portal_enabled: portalEnabled,
      link_status: 'linked' as const,
      created_by: auth.user.id,
      updated_by: auth.user.id
    };

    if (portalEnabled) {
      const { data: insertedClient, error: insertError } = await adminClient
        .from('case_clients')
        .insert(insertPayload)
        .select('id')
        .single();
      if (insertError) throw insertError;
      insertedCaseClientId = insertedClient?.id ?? null;
    } else {
      const { error: insertError } = await adminClient.from('case_clients').insert(insertPayload);
      if (insertError) throw insertError;
    }
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

    if (profileError) {
      if (insertedCaseClientId) {
        // Compensating delete: remove the row created in this failed approval flow.
        await adminClient.from('case_clients').delete().eq('id', insertedCaseClientId);
      } else if (existingClient?.id) {
        await adminClient
          .from('case_clients')
          .update({ is_portal_enabled: previousPortalEnabled, updated_by: auth.user.id })
          .eq('id', existingClient.id);
      }
      throw profileError;
    }
  }

  revalidatePath('/clients');
  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath('/client-access');
  revalidatePath('/portal');
}

// 초대 토큰을 수락하고 멤버십 또는 계정 연결을 마무리한다.
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


// CSV 파일에서 의뢰인 목록을 가져온다.
export async function importClientsCsvAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!organizationId) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CLIENT_CSV_ORGANIZATION_MISSING',
      blocked: '조직 정보가 없어 의뢰인 CSV를 등록할 수 없습니다.',
      cause: 'organizationId 값이 비어 있습니다.',
      resolution: '조직을 다시 선택한 뒤 시도해 주세요.'
    }));
  }

  const { auth } = await requireOrganizationUserManagementAccess(organizationId, '조직 관리자만 의뢰인 CSV를 등록할 수 있습니다.');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CLIENT_CSV_FILE_MISSING',
      blocked: 'CSV 파일을 선택해 주세요.',
      cause: '업로드할 CSV 파일이 비어 있거나 선택되지 않았습니다.',
      resolution: 'CSV 파일을 다시 선택한 뒤 시도해 주세요.'
    }));
  }

  const supabase = await createSupabaseServerClient();
  const rows = await parseCsvFile(file);
  if (!rows.length) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CLIENT_CSV_EMPTY',
      blocked: 'CSV에서 읽을 수 있는 행이 없습니다.',
      cause: '헤더를 제외한 유효 데이터 행이 없습니다.',
      resolution: 'CSV 내용을 확인한 뒤 다시 업로드해 주세요.'
    }));
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = pickCsvValue(row, ['email', '이메일', 'mail']).toLowerCase();
    const name = pickCsvValue(row, ['name', 'clientname', '의뢰인명', '이름']);
    const relationLabel = pickCsvValue(row, ['relationlabel', 'relation', '관계', '관계라벨']);
    const note = pickCsvValue(row, ['note', 'memo', '메모', '비고']);
    const phone = pickCsvValue(row, ['phone', 'mobile', '연락처', '전화번호']);
    const caseId = await resolveCaseIdFromCsv({
      supabase,
      organizationId,
      caseId: pickCsvValue(row, ['caseid', '사건id']),
      caseReference: pickCsvValue(row, ['casereference', 'reference', '사건번호', '사건참조번호']),
      caseTitle: pickCsvValue(row, ['casetitle', 'case', '사건명', '사건제목'])
    });

    if (!email) {
      skipped += 1;
      continue;
    }

    const clientName = name || email;
    const combinedRelation = [relationLabel, phone ? `연락처:${phone}` : null, note ? `메모:${note}` : null].filter(Boolean).join(' · ') || null;

    const { data: existing } = await supabase
      .from('case_clients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('client_email_snapshot', email)
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from('profiles').select('id').eq('email', email).maybeSingle();
    const { error } = await adminClient.from('case_clients').insert({
      organization_id: organizationId,
      case_id: caseId,
      profile_id: profile?.id ?? null,
      client_name: clientName,
      client_email_snapshot: email,
      relation_label: combinedRelation,
      is_portal_enabled: false,
      link_status: 'linked' as const,
      created_by: auth.user.id,
      updated_by: auth.user.id
    });

    if (error) throw error;
    imported += 1;
  }

  revalidatePath('/clients');
  redirect(`/clients?imported=${imported}&skipped=${skipped}`);
}

// 가져온 의뢰인 목록을 일괄 초대한다.
export async function bulkInviteClientsAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const mode = `${formData.get('mode') ?? 'selected'}`.trim();
  if (!organizationId) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CLIENT_BULK_INVITE_ORGANIZATION_MISSING',
      blocked: '조직 정보가 없어 의뢰인 초대를 진행할 수 없습니다.',
      cause: 'organizationId 값이 비어 있습니다.',
      resolution: '조직을 다시 선택한 뒤 시도해 주세요.'
    }));
  }

  const { auth } = await requireOrganizationUserManagementAccess(organizationId, '조직 관리자만 의뢰인을 초대할 수 있습니다.');
  const supabase = await createSupabaseServerClient();
  const expiresHours = 72;

  let targetIds = formData.getAll('clientIds').map((value) => `${value}`.trim()).filter(Boolean);
  if (mode === 'all') {
    const { data } = await supabase
      .from('case_clients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_portal_enabled', false)
      .not('client_email_snapshot', 'is', null)
      .limit(500);
    targetIds = (data ?? []).map((item: any) => item.id);
  }

  if (!targetIds.length) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CLIENT_BULK_INVITE_SELECTION_MISSING',
      blocked: '초대할 의뢰인을 선택해 주세요.',
      cause: '선택된 의뢰인 ID가 없습니다.',
      resolution: '초대할 대상을 선택한 뒤 다시 시도해 주세요.'
    }));
  }

  const { data: clients, error } = await supabase
    .from('case_clients')
    .select('id, case_id, client_name, client_email_snapshot')
    .in('id', targetIds)
    .eq('organization_id', organizationId);

  if (error) throw error;

  let invited = 0;
  for (const client of clients ?? []) {
    const email = `${client.client_email_snapshot ?? ''}`.trim().toLowerCase();
    if (!email) continue;

    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('case_client_id', client.id)
      .eq('status', 'pending')
      .eq('kind', 'client_invite')
      .maybeSingle();

    if (existingInvite?.id) continue;

    const token = createInvitationToken();
    const { error: inviteError } = await supabase.from('invitations').insert({
      organization_id: organizationId,
      case_id: client.case_id,
      case_client_id: client.id,
      kind: 'client_invite',
      email,
      invited_name: client.client_name ?? email,
      token_hash: hashInvitationToken(token),
      share_token: null,
      token_hint: token.slice(-6),
      note: '의뢰인 일괄 초대',
      created_by: auth.user.id,
      expires_at: new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()
    });
    if (inviteError) throw inviteError;
    invited += 1;
  }

  revalidatePath('/clients');
  redirect(`/clients?invited=${invited}`);
}

const CASE_TYPE_CSV_MAP: Record<string, string> = {
  민사: 'civil', 민사소송: 'civil', civil: 'civil',
  채권: 'debt_collection', 수금: 'debt_collection', debt_collection: 'debt_collection',
  집행: 'execution', 강제집행: 'execution', execution: 'execution',
  가처분: 'injunction', 가압류: 'injunction', injunction: 'injunction',
  형사: 'criminal', criminal: 'criminal',
  자문: 'advisory', advisory: 'advisory',
  기타: 'other', other: 'other',
};

// CSV 파일에서 사건 목록을 가져온다.
export async function importCasesCsvAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!organizationId) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CASE_CSV_ORGANIZATION_MISSING',
      blocked: '조직 정보가 없어 사건 CSV를 등록할 수 없습니다.',
      cause: 'organizationId 값이 비어 있습니다.',
      resolution: '조직을 다시 선택한 뒤 시도해 주세요.'
    }));
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_create',
    errorMessage: '사건 생성 권한이 없습니다.',
  });

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CASE_CSV_FILE_MISSING',
      blocked: 'CSV 파일을 선택해 주세요.',
      cause: '업로드할 CSV 파일이 비어 있거나 선택되지 않았습니다.',
      resolution: 'CSV 파일을 다시 선택한 뒤 시도해 주세요.'
    }));
  }

  const rows = await parseCsvFile(file);
  if (!rows.length) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CASE_CSV_EMPTY',
      blocked: 'CSV에서 읽을 수 있는 행이 없습니다.',
      cause: '헤더를 제외한 유효 데이터 행이 없습니다.',
      resolution: 'CSV 내용을 확인한 뒤 다시 업로드해 주세요.'
    }));
  }

  const supabase = await createSupabaseServerClient();
  const org = auth.memberships.find((m) => m.organization_id === organizationId)?.organization;
  const orgSlug = org?.slug ?? organizationId;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const title = pickCsvValue(row, ['사건명', '제목', 'title']);
    if (!title) { skipped++; continue; }

    const rawType = pickCsvValue(row, ['사건유형', '유형', 'case_type', 'type']);
    const caseType = CASE_TYPE_CSV_MAP[rawType.toLowerCase().replace(/\s/g, '')] ?? 'other';
    const stageTemplateKey = caseType === 'debt_collection' ? 'debt_collection' : caseType === 'civil' ? 'civil' : caseType === 'criminal' ? 'criminal' : 'general';
    const moduleFlags = caseType === 'debt_collection' ? { billing: true, collection: true } : { billing: true };

    const caseNumber = pickCsvValue(row, ['사건번호', '번호', 'case_number']) || null;
    const courtName = pickCsvValue(row, ['법원명', '법원', 'court_name', 'court']) || null;
    const rawAmount = pickCsvValue(row, ['의뢰금액', '금액', '청구금액', 'amount', 'principal_amount']);
    const principalAmount = rawAmount ? Math.max(0, Number(rawAmount.replace(/[^0-9.-]/g, ''))) : 0;
    const openedOn = pickCsvValue(row, ['개시일', '시작일', '접수일', 'opened_on', 'date']) || null;
    const clientName = pickCsvValue(row, ['의뢰인', '의뢰인명', 'client', 'client_name']);
    const opponentName = pickCsvValue(row, ['상대방', '상대방명', 'opponent', 'opponent_name']);
    const summary = pickCsvValue(row, ['요약', '내용', '메모', 'summary', 'memo']);
    const mergedSummary = [summary, clientName ? `의뢰인: ${clientName}` : '', opponentName ? `상대방: ${opponentName}` : ''].filter(Boolean).join('\n') || null;

    const { data: newCase, error } = await supabase
      .from('cases')
      .insert({
        organization_id: organizationId,
        title,
        case_type: caseType,
        case_status: 'intake',
        stage_key: 'intake',
        stage_template_key: stageTemplateKey,
        case_number: caseNumber,
        court_name: courtName,
        principal_amount: isNaN(principalAmount) ? 0 : principalAmount,
        opened_on: openedOn,
        summary: mergedSummary,
        module_flags: moduleFlags,
        slug: `${orgSlug}-${Date.now()}-${i}`,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select('id')
      .single();

    if (error) {
      errors.push(`${rowNum}행: "${title}" — ${error.message}`);
      skipped++;
    } else {
      imported++;
      void supabase.from('audit_logs').insert({
        actor_id: auth.user.id,
        action: 'case.created_via_csv',
        resource_type: 'case',
        resource_id: newCase.id,
        organization_id: organizationId,
        meta: { title, caseType },
      });
    }
  }

  revalidatePath('/cases');
  if (errors.length) {
    throw new Error(`${imported}건 등록 완료, ${skipped}건 실패:\n${errors.slice(0, 5).join('\n')}`);
  }
  redirect(`/cases?imported=${imported}` as Route);
}

// ─── 임시계정 폐기 ───────────────────────────────────────────

export async function revokeStaffTempCredentialAction(formData: FormData) {
  const profileId = `${formData.get('profileId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!profileId || !organizationId) throw new Error('필수 파라미터가 누락되었습니다.');

  const { auth } = await requireOrganizationUserManagementAccess(organizationId, '조직 관리자만 임시 계정을 폐기할 수 있습니다.');

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('organization_staff_temp_credentials')
    .delete()
    .eq('profile_id', profileId)
    .eq('organization_id', organizationId);
  if (error) throw new Error(`임시 계정 폐기에 실패했습니다: ${error.message}`);

  // 핵심 감사 로그: 직원 임시계정 폐기
  const supabase = await createSupabaseServerClient();
  await supabase.from('audit_logs').insert({
    action: 'staff_temp_credential.revoked',
    resource_type: 'organization_staff_temp_credentials',
    resource_id: profileId,
    organization_id: organizationId,
    actor_id: auth.user.id,
    meta: { target_profile_id: profileId }
  });

  revalidatePath('/settings/team');
}

export async function revokeClientTempCredentialAction(formData: FormData) {
  const profileId = `${formData.get('profileId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!profileId || !organizationId) throw new Error('필수 파라미터가 누락되었습니다.');

  const { auth } = await requireOrganizationUserManagementAccess(organizationId, '조직 관리자만 의뢰인 임시 계정을 폐기할 수 있습니다.');

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('client_temp_credentials')
    .delete()
    .eq('profile_id', profileId)
    .eq('organization_id', organizationId);
  if (error) throw new Error(`의뢰인 임시 계정 폐기에 실패했습니다: ${error.message}`);

  // 핵심 감사 로그: 의뢰인 임시계정 폐기
  const supabase = await createSupabaseServerClient();
  await supabase.from('audit_logs').insert({
    action: 'client_temp_credential.revoked',
    resource_type: 'client_temp_credentials',
    resource_id: profileId,
    organization_id: organizationId,
    actor_id: auth.user.id,
    meta: { target_profile_id: profileId }
  });

  revalidatePath('/clients');
}
