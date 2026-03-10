"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl">페이지를 찾을 수 없습니다</CardTitle>
          <CardDescription className="text-base mt-2">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-2">
          <p className="text-muted-foreground">
            주소가 올바르게 입력되었는지 확인하시거나, 아래 버튼을 통해 이동해주세요.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>
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
