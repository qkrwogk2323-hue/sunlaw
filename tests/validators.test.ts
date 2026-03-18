import { describe, expect, it } from 'vitest';
import {
  clientSignupSchema,
  generalSignupSchema,
  invitationCreateSchema,
  lightAccountSignupSchema,
  organizationSignupSchema,
  supportRequestSchema
} from '@/lib/validators';
import { isValidResidentRegistrationNumber } from '@/lib/format';

function createFile(name: string, size: number, type: string) {
  return new File([new Uint8Array(size)], name, { type });
}

describe('organizationSignupSchema', () => {
  it('accepts a valid signup payload with a supported business document', () => {
    const result = organizationSignupSchema.safeParse({
      name: '새온가람법',
      kind: 'law_firm',
      businessNumber: '123-45-67891',
      representativeName: '홍길동',
      representativeTitle: '대표',
      email: 'owner@example.com',
      phone: '02-123-4567',
      addressLine1: '서울시 중구 세종대로 1',
      addressLine2: '',
      postalCode: '04520',
      websiteUrl: 'https://example.com',
      requestedModules: ['billing'],
      businessRegistrationDocument: createFile('registration.pdf', 1024, 'application/pdf'),
      note: '테스트 신청 메모'
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid business number before submission', () => {
    const result = organizationSignupSchema.safeParse({
      name: '새온가람법',
      businessNumber: '123-45-67890',
      businessRegistrationDocument: createFile('registration.pdf', 1024, 'application/pdf')
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.message === '유효한 사업자등록번호를 입력해 주세요.')).toBe(true);
  });

  it('rejects oversized or unsupported signup documents', () => {
    const oversized = organizationSignupSchema.safeParse({
      name: '새온가람법',
      businessNumber: '1234567891',
      businessRegistrationDocument: createFile('registration.exe', 10 * 1024 * 1024 + 1, 'application/octet-stream')
    });

    expect(oversized.success).toBe(false);
    if (oversized.success) return;
    const messages = oversized.error.issues.map((issue) => issue.message);
    expect(messages).toContain('사업자등록증 파일은 10MB 이하만 업로드할 수 있습니다.');
    expect(messages).toContain('사업자등록증은 PDF, PNG, JPG 파일만 업로드할 수 있습니다.');
  });
});

describe('supportRequestSchema', () => {
  it('enforces support access duration bounds', () => {
    expect(() => supportRequestSchema.parse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      targetEmail: 'support@example.com',
      reason: '조직 요청 확인을 위한 테스트 접근입니다.',
      expiresHours: 0
    })).toThrow();

    const parsed = supportRequestSchema.parse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      targetEmail: 'support@example.com',
      reason: '조직 요청 확인을 위한 테스트 접근입니다.',
      expiresHours: 4
    });

    expect(parsed.expiresHours).toBe(4);
  });
});

describe('resident registration validation', () => {
  it('accepts a checksum-valid resident registration number', () => {
    expect(isValidResidentRegistrationNumber('9001011234568')).toBe(true);
  });

  it('rejects mismatched consent or invalid resident data for client signup', () => {
    const result = clientSignupSchema.safeParse({
      legalName: '홍길동',
      residentNumber: '9001011234567',
      phone: '01012345678',
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      privacyConsent: true,
      serviceConsent: false
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain('유효한 주민등록번호를 입력해 주세요.');
    expect(messages).toContain('시스템 이용 동의가 필요합니다.');
  });

  it('accepts a valid general signup payload', () => {
    const result = generalSignupSchema.safeParse({
      email: 'member@example.com',
      password: 'safePass123',
      legalName: '홍길동',
      residentNumber: '9001011234568',
      phone: '01012345678',
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      privacyConsent: true,
      serviceConsent: true
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid lightweight account payload', () => {
    const result = lightAccountSignupSchema.safeParse({
      email: 'member@example.com',
      password: 'safePass123',
      fullName: '홍길동'
    });

    expect(result.success).toBe(true);
  });
});

describe('invitationCreateSchema', () => {
  it('applies staff invitation defaults consistently', () => {
    const parsed = invitationCreateSchema.parse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'staff@example.com',
      kind: 'staff_invite',
      caseId: '',
      membershipTitle: '',
      note: ''
    });

    expect(parsed.expiresHours).toBe(72);
    expect(parsed.actorCategory).toBe('staff');
    expect(parsed.roleTemplateKey).toBe('org_staff');
    expect(parsed.caseScopePolicy).toBe('assigned_cases_only');
  });
});
