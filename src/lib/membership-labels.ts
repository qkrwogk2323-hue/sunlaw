import type { ActorCategory, MembershipRole } from '@/lib/types';

export function membershipRoleLabel(role: MembershipRole | string | null | undefined) {
  if (role === 'org_owner') return '조직 관리자';
  if (role === 'org_manager') return '조직 관리자';
  if (role === 'org_staff') return '조직원';
  return role ?? '-';
}

export function actorCategoryLabel(category: ActorCategory | string | null | undefined) {
  if (category === 'admin') return '조직관리자';
  if (category === 'staff') return '조직원';
  return category ?? '-';
}

export function caseScopePolicyLabel(policy: string | null | undefined) {
  if (policy === 'all_org_cases') return '조직 전체 사건';
  if (policy === 'assigned_cases_only') return '배정 사건만';
  if (policy === 'read_only_assigned') return '배정 사건 읽기전용';
  return policy ?? '-';
}
