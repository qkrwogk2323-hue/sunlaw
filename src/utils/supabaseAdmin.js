import { createClient } from "@supabase/supabase-js";

// 환경 변수에서 Supabase URL과 서비스 롤 키를 가져옵니다.
// 서비스 롤 키는 서버에서만 사용해야 합니다.
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is required.");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
}

// 관리자 권한의 Supabase 클라이언트 인스턴스 생성
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
