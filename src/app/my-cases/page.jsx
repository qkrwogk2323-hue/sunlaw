"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import {
  Check,
  // ... 기존 import는 유지 ...
} from "lucide-react";
import { Suspense } from "react";
import MyCasesContent from "./components/MyCasesContent";

// ... 기존 import는 유지 ...

// 컴포넌트 import
import NotificationSummary from "./components/NotificationSummary";
import StatisticsCards from "./components/StatisticsCards";
import ClientSummary from "./components/ClientSummary";

// NotificationSummary 컴포넌트 제거 (줄 71-193 삭제)

// ... 기존 코드 유지 ...

// ClientSummary 컴포넌트 제거
// 여기서 ClientSummary 컴포넌트가 있던 코드를 삭제

// 로딩 컴포넌트
function PageLoading() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-6 w-1/2" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>

        <Skeleton className="h-64 w-full mb-8" />

        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MyCasesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MyCasesContent />
    </Suspense>
  );
}

// ... 이하 코드 유지 ...
