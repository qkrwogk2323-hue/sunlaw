"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 디버깅용 상태 표시
  useEffect(() => {
    console.log("🔍 LoginPage: 세션 상태 변경됨", status);
    console.log("🔍 LoginPage: 세션 데이터", session);
  }, [session, status]);

  useEffect(() => {
    // 이미 로그인한 사용자는 홈으로 리다이렉트
    if (status === "authenticated" && session) {
      console.log("✅ LoginPage: 인증된 사용자 확인, 홈으로 리다이렉트");
      setIsRedirecting(true);
      router.push("/");
    }

    // URL에서 에러 파라미터 확인
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        setError(errorParam);
        console.error("🔴 LoginPage: 로그인 에러 발생:", errorParam);

        if (errorParam === "AccessDenied") {
          toast.error("카카오 로그인 권한이 거부되었습니다", {
            description: "이메일 정보 제공에 동의해주세요",
          });
        } else if (errorParam === "Callback") {
          toast.error("카카오 로그인 콜백 처리 중 오류가 발생했습니다", {
            description: "관리자에게 문의하세요",
          });
        } else {
          toast.error("로그인 중 오류가 발생했습니다", {
            description: `오류 코드: ${errorParam}`,
          });
        }
      }
    }
  }, [session, status, router]);

  const handleKakaoLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🚀 LoginPage: 카카오 로그인 시도 중...");

      // 직접 홈으로 리다이렉트 설정
      const result = await signIn("kakao", {
        callbackUrl: "/",
        redirect: true,
      });

      // 여기까지 코드가 실행되면 이미 리다이렉트되었음을 의미함
      console.log("LoginPage: 리다이렉트 후 실행 (일반적으로 실행되지 않음)", result);
    } catch (error) {
      console.error("🔴 LoginPage: 카카오 로그인 오류:", error);
      setError(error.message || "알 수 없는 오류");
      toast.error("로그인 중 오류가 발생했습니다", {
        description: "잠시 후 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isRedirecting) {
    return (
      <>
        <div className="container mx-auto py-20 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>리다이렉트 중...</CardTitle>
              <CardDescription>이미 로그인되어 있습니다. 홈으로 이동합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center my-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto py-20">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>소셜 계정으로 간편하게 로그인하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleKakaoLogin}
              className="w-full py-6 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-2"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M9 0.5C4.30371 0.5 0.5 3.32841 0.5 6.8C0.5 8.92548 1.93371 10.7834 4.11514 11.7279C3.91371 12.3868 3.42084 14.3334 3.36108 14.6312C3.28326 15.0239 3.57205 15.0114 3.74461 14.9007C3.87787 14.8126 6.06602 13.3474 6.93783 12.7559C7.59212 12.8455 8.28576 12.9 9 12.9C13.6963 12.9 17.5 10.0716 17.5 6.6C17.5 3.12841 13.6963 0.5 9 0.5Z"
                      fill="black"
                    />
                  </svg>
                  카카오 계정으로 로그인
                </>
              )}
            </Button>

            {error && (
              <div className="text-red-500 text-center text-sm">오류가 발생했습니다: {error}</div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-gray-500">
            <p>
              회원이 아니신가요?{" "}
              <Link href="/register" className="text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
