import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const resolveSchema = z.object({
  organizationKey: z.string().trim().min(2).max(120),
  loginId: z.string().trim().min(2).max(120)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resolveSchema.parse(body);
    const admin = createSupabaseAdminClient();

    let { data: organization } = await admin
      .from('organizations')
      .select('id, slug')
      .eq('slug', parsed.organizationKey)
      .neq('lifecycle_status', 'soft_deleted')
      .maybeSingle();

    if (!organization?.id) {
      const byId = await admin
        .from('organizations')
        .select('id, slug')
        .eq('id', parsed.organizationKey)
        .neq('lifecycle_status', 'soft_deleted')
        .maybeSingle();
      organization = byId.data ?? null;
    }

    if (!organization?.id) {
      return NextResponse.json({ message: '조직 식별값을 확인해 주세요.' }, { status: 404 });
    }

    const { data: account } = await admin
      .from('organization_staff_temp_credentials')
      .select('login_email')
      .eq('organization_id', organization.id)
      .eq('login_id_normalized', parsed.loginId.toLowerCase())
      .maybeSingle();

    if (!account?.login_email) {
      return NextResponse.json({ message: '임시 아이디 또는 조직 식별값이 맞지 않습니다.' }, { status: 404 });
    }

    return NextResponse.json({ email: account.login_email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: '임시 로그인 정보를 확인하지 못했습니다.' }, { status: 500 });
  }
}
