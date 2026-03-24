export type OrganizationKind =
  | 'platform_management'
  | 'law_firm'
  | 'collection_company'
  | 'mixed_practice'
  | 'corporate_legal_team'
  | 'other'
  | null
  | undefined;

/**
 * 제품 수직(Product Vertical) — 메뉴·라우트·알림 분기의 최상위 기준
 *
 * - 'law'       : 법률/법무 조직 (law_firm, corporate_legal_team, mixed_practice)
 * - 'collection': 신용정보/추심 조직 (collection_company)
 * - 'general'   : 일반 협업 조직 (other)
 * - 'platform'  : 내부 운영 콘솔 (platform_management) — 일반 제품군과 분리
 */
export type ProductVertical = 'law' | 'collection' | 'general' | 'platform';

export function getProductVertical(kind: OrganizationKind): ProductVertical {
  if (kind === 'platform_management') return 'platform';
  if (kind === 'law_firm' || kind === 'corporate_legal_team' || kind === 'mixed_practice') return 'law';
  if (kind === 'collection_company') return 'collection';
  return 'general';
}

export function getOrganizationAdminMode(kind: OrganizationKind) {
  if (kind === 'law_firm' || kind === 'corporate_legal_team' || kind === 'mixed_practice') return 'law_admin';
  if (kind === 'collection_company') return 'collection_admin';
  return 'other_admin';
}

export function getDefaultMode(organizationKind?: OrganizationKind, isManager = false) {
  if (isManager) return getOrganizationAdminMode(organizationKind);
  return 'organization_staff';
}

export function getCurrentMode(organizationKind?: OrganizationKind, isManager = false) {
  return getDefaultMode(organizationKind, isManager);
}
