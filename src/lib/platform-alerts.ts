'use server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';

type PlatformAlertInput = {
  actorId?: string | null;
  organizationId?: string | null;
  title: string;
  body: string;
  actionHref?: string | null;
  actionLabel?: string | null;
  resourceType: string;
  resourceId?: string | null;
  meta?: Record<string, unknown>;
};

async function listPlatformAlertRecipients() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('organization_memberships')
    .select('profile_id, organization_id, role, organization:organizations(id, kind, is_platform_root)')
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager']);

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => isPlatformManagementOrganization(Array.isArray(row.organization) ? row.organization[0] : row.organization))
    .map((row: any) => ({
      profileId: row.profile_id as string,
      organizationId: row.organization_id as string
    }));
}

export async function notifyPlatformBugAlert(input: PlatformAlertInput) {
  const admin = createSupabaseAdminClient();
  const recipients = await listPlatformAlertRecipients();

  if (recipients.length) {
    const { error: notificationError } = await admin.from('notifications').insert(
      recipients.map((recipient) => ({
        organization_id: recipient.organizationId,
        recipient_profile_id: recipient.profileId,
        kind: 'generic',
        notification_type: 'platform_bug_alert',
        priority: 'urgent',
        status: 'active',
        requires_action: true,
        title: input.title,
        body: input.body,
        action_label: input.actionLabel ?? '플랫폼 오류 확인',
        action_href: input.actionHref ?? '/admin/audit',
        destination_type: 'internal_route',
        destination_url: input.actionHref ?? '/admin/audit',
        action_entity_type: input.resourceType,
        action_target_id: input.resourceId ?? null,
        payload: {
          category: 'platform_bug_alert',
          ...input.meta
        }
      }))
    );

    if (notificationError) {
      console.error('[notifyPlatformBugAlert] notification insert failed:', notificationError.message);
    }
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    actor_id: input.actorId ?? null,
    action: 'platform_bug.detected',
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    organization_id: input.organizationId ?? null,
    meta: {
      title: input.title,
      body: input.body,
      ...input.meta
    }
  });

  if (auditError) {
    console.error('[notifyPlatformBugAlert] audit insert failed:', auditError.message);
  }
}
