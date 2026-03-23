export type OrganizationKind =
  | 'platform_management'
  | 'law_firm'
  | 'collection_company'
  | 'mixed_practice'
  | 'corporate_legal_team'
  | 'other'
  | null
  | undefined;

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
