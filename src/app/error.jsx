"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, RefreshCcw, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({ error, reset }) {
  useEffect(() => {
    // 에러를 로깅하는 로직을 추가할 수 있습니다
    console.error("애플리케이션 에러:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">문제가 발생했습니다</CardTitle>
          <CardDescription className="text-base mt-2">
            페이지를 로딩하는 중에 오류가 발생했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-2">
          <p className="text-muted-foreground">다시 시도하거나 홈페이지로 이동해 주세요.</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => reset()} className="w-full sm:w-auto">
            <RefreshCcw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full bg-primary hover:bg-primary/90">
              <Home className="mr-2 h-4 w-4" />
              홈으로 가기
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
