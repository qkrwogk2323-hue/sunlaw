import { createClient } from "@supabase/supabase-js";

// 환경 변수에서 Supabase URL과 서비스 롤 키를 가져옴
// 서비스 롤 키는 백엔드에서만 사용되어야 합니다!
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(supabaseUrl, supabaseServiceRoleKey);

// 관리자 권한의 Supabase 클라이언트 인스턴스 생성
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
