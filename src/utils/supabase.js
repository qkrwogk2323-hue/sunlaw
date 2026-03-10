import { createClient } from "@supabase/supabase-js";

// 환경 변수에서 Supabase URL과 API 키를 가져옴
// 환경 변수는 .env.local 파일에 설정해야 함
// NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 디버깅 로그 추가
console.log("🔌 Supabase URL 설정됨:", !!supabaseUrl);
console.log("🔑 Supabase Anon Key 설정됨:", !!supabaseAnonKey);

// Supabase 클라이언트 인스턴스 생성 (세션 관련 옵션 추가)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // URL에서 세션 감지 활성화
  },
  db: {
    schema: "public",
  },
});
