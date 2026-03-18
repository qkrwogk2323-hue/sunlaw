import { NextResponse } from 'next/server';
import { getCurrentAuth, hasActivePlatformAdminView } from '@/lib/auth';
import { buildCoordinationPlan } from '@/lib/ai/task-planner';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const organizationId = String(body.organizationId || '');
  const content = String(body.content || '').trim();

  if (!organizationId || !content) {
    return NextResponse.json({ error: 'organizationId and content are required' }, { status: 400 });
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth);
  if (!hasMembership && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, title')
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const preview = await buildCoordinationPlan(content, (cases ?? []) as Array<{ id: string; title: string }>);
  return NextResponse.json({ preview });
}
