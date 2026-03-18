import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const resolveSchema = z.object({
  loginId: z.string().trim().min(2).max(120)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resolveSchema.parse(body);
    const admin = createSupabaseAdminClient();

    const { data: account } = await admin
      .from('client_temp_credentials')
      .select('login_email')
      .eq('login_id_normalized', parsed.loginId.toLowerCase())
      .maybeSingle();

    if (!account?.login_email) {
      return NextResponse.json({ message: '의뢰인 임시 아이디를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ email: account.login_email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: '의뢰인 임시 로그인 정보를 확인하지 못했습니다.' }, { status: 500 });
  }
}
