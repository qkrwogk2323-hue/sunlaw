import { z } from 'zod';
import { formatResidentRegistrationNumberMasked, isValidKoreanBusinessNumber, isValidResidentRegistrationNumber, normalizeBusinessNumber, normalizeResidentRegistrationNumber } from '@/lib/format';
import { PERMISSION_KEYS } from '@/lib/permissions';

const caseTypeEnum = z.enum(['civil', 'debt_collection', 'execution', 'injunction', 'criminal', 'advisory', 'other']);
const maxSignupDocumentSize = 10 * 1024 * 1024;
const allowedSignupDocumentMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const allowedSignupDocumentExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg']);

const businessRegistrationDocumentSchema = z.custom<File>((value) => value instanceof File && value.size > 0, {
  message: '사업자등록증 파일을 업로드해 주세요.'
}).superRefine((file, ctx) => {
  if (!(file instanceof File)) return;

  if (file.size > maxSignupDocumentSize) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '사업자등록증 파일은 10MB 이하만 업로드할 수 있습니다.'
    });
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = file.type.toLowerCase();
  if (!allowedSignupDocumentMimeTypes.has(mimeType) && !allowedSignupDocumentExtensions.has(extension)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '사업자등록증은 PDF, PNG, JPG 파일만 업로드할 수 있습니다.'
    });
  }
});

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(2, '조직명은 2자 이상이어야 합니다.'),
  kind: z.enum(['law_firm', 'collection_company', 'mixed_practice', 'corporate_legal_team', 'other']).optional().default('law_firm'),
  businessNumber: z.string().trim().max(20).optional().or(z.literal('')),
  representativeName: z.string().trim().max(50).optional().or(z.literal('')),
  representativeTitle: z.string().trim().max(50).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  addressLine1: z.string().trim().max(120).optional().or(z.literal('')),
  addressLine2: z.string().trim().max(120).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url().optional().or(z.literal('')),
  managerInviteName: z.string().trim().max(80).optional().or(z.literal('')),
  managerInviteEmail: z.string().trim().email().optional().or(z.literal('')),
  requestedModules: z.array(z.string()).optional().default([])
});

export const organizationSignupSchema = organizationCreateSchema.extend({
  businessNumber: z.string().trim().min(1, '사업자등록번호를 입력해 주세요.')
    .refine((value) => normalizeBusinessNumber(value).length === 10, '사업자등록번호는 숫자 10자리여야 합니다.')
    .refine((value) => isValidKoreanBusinessNumber(value), '유효한 사업자등록번호를 입력해 주세요.'),
  businessRegistrationDocument: businessRegistrationDocumentSchema,
  note: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const clientAccessRequestSchema = z.object({
  organizationId: z.string().uuid(),
  organizationKey: z.string().trim().min(2).max(120),
  requestNote: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const clientSignupSchema = z.object({
  legalName: z.string().trim().min(2, '이름을 입력해 주세요.').max(80),
  residentNumber: z.string().trim().min(1, '주민등록번호를 입력해 주세요.')
    .transform((value) => normalizeResidentRegistrationNumber(value))
    .refine((value) => value.length === 13, '주민등록번호 13자리를 입력해 주세요.')
    .refine((value) => formatResidentRegistrationNumberMasked(value) !== '***-******', '유효한 주민등록번호 형식이 아닙니다.')
    .refine((value) => isValidResidentRegistrationNumber(value), '유효한 주민등록번호를 입력해 주세요.'),
  phone: z.string().trim().min(8, '연락처를 입력해 주세요.').max(30),
  addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: '개인정보 처리 동의가 필요합니다.' })
  }),
  serviceConsent: z.literal(true, {
    errorMap: () => ({ message: '시스템 이용 동의가 필요합니다.' })
  })
});

export const generalSignupSchema = z.object({
  email: z.string().trim().email('이메일을 입력해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(72, '비밀번호는 72자 이하로 입력해 주세요.'),
  legalName: z.string().trim().min(2, '이름을 입력해 주세요.').max(80),
  residentNumber: z.string().trim().min(1, '주민등록번호를 입력해 주세요.')
    .transform((value) => normalizeResidentRegistrationNumber(value))
    .refine((value) => value.length === 13, '주민등록번호 13자리를 입력해 주세요.')
    .refine((value) => isValidResidentRegistrationNumber(value), '유효한 주민등록번호를 입력해 주세요.'),
  phone: z.string().trim().min(8, '연락처를 입력해 주세요.').max(30),
  addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: '개인정보 처리 동의가 필요합니다.' })
  }),
  serviceConsent: z.literal(true, {
    errorMap: () => ({ message: '시스템 이용 동의가 필요합니다.' })
  })
});

export const lightAccountSignupSchema = z.object({
  email: z.string().trim().email('이메일을 입력해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(72, '비밀번호는 72자 이하로 입력해 주세요.'),
  fullName: z.string().trim().min(2, '이름을 입력해 주세요.').max(80)
});

export const clientServiceRequestSchema = z.object({
  organizationId: z.string().uuid().optional().or(z.literal('')),
  requestKind: z.enum(['status_help', 'reapproval_help', 'access_issue']).default('status_help'),
  title: z.string().trim().min(4, '문의 제목을 입력해 주세요.').max(120),
  body: z.string().trim().min(10, '문의 내용을 10자 이상 입력해 주세요.').max(2000)
});

export const profileLegalNameSchema = z.object({
  legalName: z.string().trim().min(2, '실명을 입력해 주세요.').max(80)
});

export const clientAccessReviewSchema = z.object({
  requestId: z.string().uuid(),
  organizationId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const clientAccessCaseLinkSchema = z.object({
  requestId: z.string().uuid(),
  organizationId: z.string().uuid(),
  caseId: z.string().uuid(),
  relationLabel: z.string().trim().max(100).optional().or(z.literal('')),
  portalEnabled: z.boolean().default(true)
});

export const caseCreateSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().trim().min(2),
  caseType: caseTypeEnum,
  principalAmount: z.coerce.number().min(0).default(0),
  openedOn: z.string().optional().or(z.literal('')),
  courtName: z.string().trim().max(120).optional().or(z.literal('')),
  caseNumber: z.string().trim().max(120).optional().or(z.literal('')),
  summary: z.string().trim().max(3000).optional().or(z.literal('')),
  billingPlanSummary: z.string().trim().max(1000).optional().or(z.literal('')),
  billingFollowUpDueOn: z.string().optional().or(z.literal(''))
});

export const caseStageUpdateSchema = z.object({
  caseId: z.string().uuid(),
  organizationId: z.string().uuid(),
  stageKey: z.enum(['intake', 'review', 'revision_wait', 'client_reply_wait', 'recheck', 'done']),
  stageNote: z.string().trim().max(300).optional().or(z.literal(''))
});

export const caseOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  role: z.enum(['principal_client_org', 'collection_org', 'legal_counsel_org', 'co_counsel_org', 'partner_org']),
  accessScope: z.enum(['full', 'collection_only', 'legal_only', 'billing_only', 'read_only']).default('read_only'),
  billingScope: z.enum(['none', 'direct_client_billing', 'upstream_settlement', 'internal_settlement_only']).default('none'),
  communicationScope: z.enum(['internal_only', 'cross_org_only', 'client_visible']).default('cross_org_only'),
  isLead: z.boolean().default(false),
  canSubmitLegalRequests: z.boolean().default(false),
  canReceiveLegalRequests: z.boolean().default(false),
  canManageCollection: z.boolean().default(false),
  canViewClientMessages: z.boolean().default(false),
  agreementSummary: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const casePartySchema = z.object({
  partyRole: z.enum(['creditor', 'debtor', 'plaintiff', 'defendant', 'respondent', 'petitioner', 'other']),
  entityType: z.enum(['individual', 'corporation']),
  displayName: z.string().trim().min(2),
  companyName: z.string().trim().max(120).optional().or(z.literal('')),
  registrationNumber: z.string().trim().max(30).optional().or(z.literal('')),
  residentNumber: z.string().trim().max(30).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  addressSummary: z.string().trim().max(500).optional().or(z.literal('')),
  addressDetail: z.string().trim().max(500).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  isPrimary: z.boolean().default(false)
});

export const caseClientLinkSchema = z.object({
  email: z.string().trim().email(),
  relationLabel: z.string().trim().max(100).optional().or(z.literal('')),
  clientName: z.string().trim().max(120).optional().or(z.literal('')),
  portalEnabled: z.boolean().default(true),
  feeAgreementTitle: z.string().trim().max(200).optional().or(z.literal('')),
  feeAgreementType: z.enum(['retainer', 'flat_fee', 'success_fee', 'expense_reimbursement', 'installment_plan', 'internal_settlement']).optional().default('retainer'),
  feeAgreementAmount: z.coerce.number().min(0).optional(),
  billingEntryTitle: z.string().trim().max(200).optional().or(z.literal('')),
  billingEntryAmount: z.coerce.number().min(0).optional(),
  billingEntryDueOn: z.string().optional().or(z.literal(''))
});

export const caseDocumentSchema = z.object({
  title: z.string().trim().min(2),
  documentKind: z.enum(['complaint', 'answer', 'brief', 'evidence', 'contract', 'order', 'notice', 'opinion', 'internal_memo', 'other']),
  clientVisibility: z.enum(['internal_only', 'client_visible']),
  summary: z.string().trim().max(2000).optional().or(z.literal('')),
  contentMarkdown: z.string().trim().max(10000).optional().or(z.literal(''))
});

export const documentReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const scheduleCreateSchema = z.object({
  title: z.string().trim().min(2),
  scheduleKind: z.enum(['hearing', 'deadline', 'meeting', 'reminder', 'collection_visit', 'other']),
  scheduledStart: z.string().min(1),
  scheduledEnd: z.string().optional().or(z.literal('')),
  location: z.string().trim().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  clientVisibility: z.enum(['internal_only', 'client_visible']),
  isImportant: z.boolean().default(false)
});

export const recoveryActivitySchema = z.object({
  activityKind: z.enum(['call', 'letter', 'visit', 'negotiation', 'payment', 'asset_check', 'legal_action', 'other']),
  occurredAt: z.string().min(1),
  amount: z.coerce.number().min(0).optional().default(0),
  outcomeStatus: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  clientVisibility: z.enum(['internal_only', 'client_visible'])
});

export const supportRequestSchema = z.object({
  organizationId: z.string().uuid(),
  targetEmail: z.string().trim().email(),
  reason: z.string().trim().min(10).max(1000),
  expiresHours: z.coerce.number().int().min(1).max(72).default(4)
});

export const invitationCreateSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email(),
  kind: z.enum(['staff_invite', 'client_invite']),
  caseId: z.string().uuid().optional().or(z.literal('')),
  membershipTitle: z.string().trim().max(80).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  expiresHours: z.coerce.number().int().min(1).max(336).default(72),
  actorCategory: z.enum(['admin', 'staff']).optional().default('staff'),
  roleTemplateKey: z.enum(['admin_general', 'lawyer', 'office_manager', 'org_staff', 'collection_agent', 'intern_readonly']).optional().default('org_staff'),
  caseScopePolicy: z.enum(['all_org_cases', 'assigned_cases_only', 'read_only_assigned']).optional().default('assigned_cases_only')
});

export const collaborationRequestCreateSchema = z.object({
  sourceOrganizationId: z.string().uuid(),
  targetOrganizationId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  proposalNote: z.string().trim().max(3000).optional().or(z.literal('')),
  returnPath: z.string().trim().optional().or(z.literal(''))
});

export const collaborationRequestReviewSchema = z.object({
  requestId: z.string().uuid(),
  organizationId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  responseNote: z.string().trim().max(2000).optional().or(z.literal('')),
  returnPath: z.string().trim().optional().or(z.literal(''))
});

export const collaborationHubMessageSchema = z.object({
  hubId: z.string().uuid(),
  organizationId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  caseId: z.string().uuid().optional().or(z.literal('')),
  returnPath: z.string().trim().optional().or(z.literal(''))
});

export const collaborationHubReadSchema = z.object({
  hubId: z.string().uuid(),
  organizationId: z.string().uuid()
});

export const collaborationHubCaseShareSchema = z.object({
  hubId: z.string().uuid(),
  organizationId: z.string().uuid(),
  caseId: z.string().uuid(),
  permissionScope: z.enum(['view', 'reference', 'collaborate']).default('view'),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
  returnPath: z.string().trim().optional().or(z.literal(''))
});

export const caseMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().default(false)
});

export const caseRequestSchema = z.object({
  kind: z.enum(['question', 'document_submission', 'document_request', 'schedule_request', 'call_request', 'meeting_request', 'status_check', 'signature_request', 'other']),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(3000),
  dueAt: z.string().optional().or(z.literal('')),
  clientVisible: z.boolean().default(true)
});

export const feeAgreementSchema = z.object({
  billToPartyKind: z.enum(['case_client', 'case_organization']),
  billToCaseClientId: z.string().uuid().optional().or(z.literal('')),
  billToCaseOrganizationId: z.string().uuid().optional().or(z.literal('')),
  agreementType: z.enum(['retainer', 'flat_fee', 'success_fee', 'expense_reimbursement', 'installment_plan', 'internal_settlement']),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  fixedAmount: z.coerce.number().min(0).optional(),
  rate: z.coerce.number().min(0).max(100).optional(),
  effectiveFrom: z.string().optional().or(z.literal('')),
  effectiveTo: z.string().optional().or(z.literal('')),
  termsJson: z.string().trim().optional().or(z.literal(''))
});

export const billingEntrySchema = z.object({
  billToPartyKind: z.enum(['case_client', 'case_organization']).default('case_client'),
  billToCaseClientId: z.string().uuid().optional().or(z.literal('')),
  billToCaseOrganizationId: z.string().uuid().optional().or(z.literal('')),
  entryType: z.enum(['retainer_fee', 'flat_fee', 'success_fee', 'expense', 'court_fee', 'service_fee', 'discount', 'adjustment', 'internal_settlement']),
  title: z.string().trim().min(2).max(200),
  amount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  dueOn: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal(''))
});

export const paymentRecordSchema = z.object({
  payerPartyKind: z.enum(['case_client', 'case_organization']),
  payerCaseClientId: z.string().uuid().optional().or(z.literal('')),
  payerCaseOrganizationId: z.string().uuid().optional().or(z.literal('')),
  paymentMethod: z.enum(['bank_transfer', 'card', 'cash', 'offset', 'other']).default('bank_transfer'),
  amount: z.coerce.number().min(0),
  receivedAt: z.string().min(1),
  referenceText: z.string().trim().max(200).optional().or(z.literal('')),
  note: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const membershipSetupSchema = z.object({
  actorCategory: z.enum(['admin', 'staff']),
  roleTemplateKey: z.enum(['admin_general', 'lawyer', 'office_manager', 'org_staff', 'collection_agent', 'intern_readonly']),
  caseScopePolicy: z.enum(['all_org_cases', 'assigned_cases_only', 'read_only_assigned']),
  membershipTitle: z.string().trim().max(80).optional().or(z.literal(''))
});

const permissionShape = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, z.boolean().optional()])) as Record<string, z.ZodBoolean | z.ZodOptional<z.ZodBoolean>>;
export const membershipPermissionsSchema = z.object(permissionShape);

export const collectionCompensationPlanSchema = z.object({
  caseId: z.string().uuid(),
  targetKind: z.enum(['membership', 'organization']),
  beneficiaryMembershipId: z.string().uuid().optional().or(z.literal('')),
  beneficiaryCaseOrganizationId: z.string().uuid().optional().or(z.literal('')),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  settlementCycle: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  fixedAmount: z.coerce.number().min(0).optional(),
  rate: z.coerce.number().min(0).max(100).optional(),
  baseMetric: z.string().trim().max(100).optional().or(z.literal('')),
  effectiveFrom: z.string().optional().or(z.literal('')),
  ruleJson: z.string().trim().optional().or(z.literal(''))
});

export const orgSettlementSchema = z.object({
  caseId: z.string().uuid().optional().or(z.literal('')),
  sourceCaseOrganizationId: z.string().uuid(),
  targetCaseOrganizationId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  amount: z.coerce.number().min(0),
  dueOn: z.string().optional().or(z.literal(''))
});
