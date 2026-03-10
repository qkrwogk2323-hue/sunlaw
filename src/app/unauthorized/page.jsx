"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Shield, LogIn } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";

export default function Unauthorized() {
  const router = useRouter();
  const { user, loading } = useUser();

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-10 w-10 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">접근 권한이 없습니다</CardTitle>
          <CardDescription className="text-base mt-2">
            이 페이지를 열람하는데 필요한 권한이 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-2">
          <p className="text-muted-foreground">
            접근 권한이 필요하거나 로그인이 필요한 페이지입니다.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>

          {!loading && !user ? (
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full bg-primary hover:bg-primary/90">
                <LogIn className="mr-2 h-4 w-4" />
                로그인
              </Button>
            </Link>
          ) : (
            <Link href="/" className="w-full sm:w-auto">
              <Button className="w-full bg-primary hover:bg-primary/90">
                <Home className="mr-2 h-4 w-4" />
                홈으로 가기
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
