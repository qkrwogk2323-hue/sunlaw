export type SettingValueType = 'string' | 'integer' | 'decimal' | 'boolean' | 'string_array' | 'json';
export type SettingScope = 'platform' | 'organization' | 'both';

export interface SettingCatalogItem {
  key: string;
  domain: string;
  scope: SettingScope;
  valueType: SettingValueType;
  defaultValue: unknown;
  editableByPlatformAdmin: boolean;
  editableByOrgAdmin: boolean;
  isReadOnly?: boolean;
  description: string;
}

export const INITIAL_SETTING_CATALOG: SettingCatalogItem[] = [
  {
    key: 'invitations.staff_ttl_hours',
    domain: 'security',
    scope: 'platform',
    valueType: 'integer',
    defaultValue: 168,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '직원 초대 링크 만료 시간(시간)'
  },
  {
    key: 'invitations.client_ttl_hours',
    domain: 'security',
    scope: 'platform',
    valueType: 'integer',
    defaultValue: 336,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '의뢰인 초대 링크 만료 시간(시간)'
  },
  {
    key: 'onboarding.trial_days',
    domain: 'security',
    scope: 'platform',
    valueType: 'integer',
    defaultValue: 14,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: 'Trial 조직 기본 사용일'
  },
  {
    key: 'uploads.max_file_mb',
    domain: 'infrastructure',
    scope: 'platform',
    valueType: 'integer',
    defaultValue: 50,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '단일 파일 최대 업로드 용량(MB)'
  },
  {
    key: 'uploads.allowed_mime_types',
    domain: 'infrastructure',
    scope: 'platform',
    valueType: 'string_array',
    defaultValue: ['application/pdf', 'image/jpeg', 'image/png'],
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '허용 MIME 타입 목록'
  },
  {
    key: 'exports.max_rows',
    domain: 'infrastructure',
    scope: 'platform',
    valueType: 'integer',
    defaultValue: 10000,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '내보내기 최대 행 수'
  },
  {
    key: 'exports.enabled_formats',
    domain: 'infrastructure',
    scope: 'platform',
    valueType: 'string_array',
    defaultValue: ['xlsx', 'pdf', 'docx'],
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '내보내기 허용 형식'
  },
  {
    key: 'billing.default_due_days',
    domain: 'billing',
    scope: 'both',
    valueType: 'integer',
    defaultValue: 14,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '청구서 기본 납기일(일)'
  },
  {
    key: 'billing.default_currency',
    domain: 'billing',
    scope: 'platform',
    valueType: 'string',
    defaultValue: 'KRW',
    editableByPlatformAdmin: true,
    editableByOrgAdmin: false,
    description: '기본 화폐 코드'
  },
  {
    key: 'collection.default_success_fee_rate',
    domain: 'collection',
    scope: 'both',
    valueType: 'decimal',
    defaultValue: 20,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '추심 성공보수 기본 제안 요율(실제 계약값 아님)'
  },
  {
    key: 'portal.auto_reply_enabled',
    domain: 'portal',
    scope: 'both',
    valueType: 'boolean',
    defaultValue: true,
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '의뢰인 포털 자동응답 활성화 여부'
  },
  {
    key: 'portal.auto_reply_message',
    domain: 'portal',
    scope: 'both',
    valueType: 'string',
    defaultValue: '평일 9시부터 18시 사이에 순차적으로 답변드립니다.',
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '의뢰인 포털 자동응답 문구'
  },
  {
    key: 'labels.case',
    domain: 'labels',
    scope: 'both',
    valueType: 'string',
    defaultValue: '사건',
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '사건 기본 용어'
  },
  {
    key: 'labels.client',
    domain: 'labels',
    scope: 'both',
    valueType: 'string',
    defaultValue: '의뢰인',
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '의뢰인 기본 용어'
  },
  {
    key: 'labels.request',
    domain: 'labels',
    scope: 'both',
    valueType: 'string',
    defaultValue: '요청',
    editableByPlatformAdmin: true,
    editableByOrgAdmin: true,
    description: '요청 기본 용어'
  }
];

export const CONTENT_RESOURCE_SEEDS = [
  { namespace: 'landing', resourceKey: 'hero.title', locale: 'ko-KR', value: '한 사건을 여러 사람이 끊김 없이 함께 풀어가는 협업 시스템' },
  { namespace: 'landing', resourceKey: 'hero.subtitle', locale: 'ko-KR', value: '실무자는 업무 흐름에 맞춰 빠르게 일하고, 의뢰인은 자기 사건의 진행 상황과 필요한 요청을 한눈에 확인할 수 있습니다.' },
  { namespace: 'portal', resourceKey: 'welcome_message', locale: 'ko-KR', value: '내 사건의 진행 현황, 문서, 요청, 일정, 청구를 한 곳에서 확인하세요.' },
  { namespace: 'email', resourceKey: 'invite.client.subject', locale: 'ko-KR', value: '[{{org_name}}] {{case_name}} 진행 상황을 확인해 주세요.' }
];

export const FEATURE_FLAG_SEEDS = [
  { flagKey: 'client_portal.enabled', enabled: true },
  { flagKey: 'collections.enabled', enabled: true },
  { flagKey: 'hwpx_export.enabled', enabled: false },
  { flagKey: 'trial_org_signup.enabled', enabled: true }
];
