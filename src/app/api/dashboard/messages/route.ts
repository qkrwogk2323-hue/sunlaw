import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findMembership, getCurrentAuth, isManagementRole } from '@/lib/auth';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || '');
  const caseId = String(body.caseId || '');
  const content = String(body.content || '').trim();
  const recipientMembershipId = String(body.recipientMembershipId || '');
  const targetType = ['org', 'client', 'partner'].includes(String(body.targetType || '')) ? String(body.targetType) : 'org';
  const isInternal = true;

  if (!organizationId || !caseId || !content) {
    return NextResponse.json({ error: 'organizationId, caseId, content are required' }, { status: 400 });
  }

  if (targetType !== 'org') {
    return NextResponse.json({ error: '대시보드에서는 조직 내부 업무소통만 지원합니다.' }, { status: 400 });
  }

  const membership = findMembership(auth, organizationId);
  if (!membership && auth.profile.platform_role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, organization_id, title')
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (caseError || !caseRow) {
    return NextResponse.json({ error: caseError?.message || '사건을 찾을 수 없습니다.' }, { status: 404 });
  }

  const senderRole = membership && isManagementRole(membership.role) ? 'admin' : 'staff';
  const { error: messageError } = await supabase.from('case_messages').insert({
    organization_id: organizationId,
    case_id: caseId,
    sender_profile_id: auth.user.id,
    sender_role: senderRole,
    body: content,
    is_internal: isInternal
  });

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  if (recipientMembershipId && recipientMembershipId !== 'self') {
    const { data: recipientRow, error: recipientError } = await supabase
      .from('organization_memberships')
      .select('profile_id, profile:profiles(full_name)')
      .eq('id', recipientMembershipId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (recipientError) {
      return NextResponse.json({ error: recipientError.message }, { status: 500 });
    }

    if (recipientRow?.profile_id && recipientRow.profile_id !== auth.user.id) {
      const recipientProfile = Array.isArray(recipientRow.profile) ? recipientRow.profile[0] : recipientRow.profile;
      const admin = createSupabaseAdminClient();
      const { error: notificationError } = await admin.from('notifications').insert({
        organization_id: organizationId,
        case_id: caseId,
        recipient_profile_id: recipientRow.profile_id,
        kind: 'generic',
        title: `조직간 업무소통: ${caseRow.title}`,
        body: content.slice(0, 160),
        action_label: '대시보드 열기',
        action_href: '/dashboard',
        payload: {
          source: 'dashboard_message',
          sender_profile_id: auth.user.id,
          sender_name: auth.profile.full_name,
          recipient_name: recipientProfile?.full_name ?? null
        }
      });

      if (notificationError) {
        return NextResponse.json({ error: notificationError.message }, { status: 500 });
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/inbox');
  revalidatePath(`/cases/${caseId}`);

  return NextResponse.json({ ok: true });
}