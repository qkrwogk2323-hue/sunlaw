"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building,
  Calendar,
  CircleDollarSign,
  FileText,
  GanttChart,
  MailCheck,
  User,
  Users,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import CaseProgressTimeline from "./components/CaseProgressTimeline";
import RecoveryActivities from "./components/RecoveryActivities";
import CaseNotifications from "./components/CaseNotifications";
import DocumentManager from "./components/DocumentManager";

// useSearchParams를 사용하는 컴포넌트
function CaseDetailContent({ id }) {
  const router = useRouter();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "details";

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [parties, setParties] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeTab, setActiveTab] = useState(tab);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCaseDetails();
    }
  }, [user, id]);

  useEffect(() => {
    // URL 쿼리 파라미터의 탭 변경 감지
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // 사건 정보 가져오기
      const { data: caseData, error: caseError } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (caseError) {
        throw caseError;
      }

      // 사건 당사자 정보 가져오기
      const { data: partyData, error: partyError } = await supabase
        .from("test_case_parties")
        .select("*")
        .eq("case_id", id);

      if (partyError) {
        throw partyError;
      }

      // 사건 의뢰인 정보 가져오기
      const { data: clientData, error: clientError } = await supabase
        .from("test_case_clients")
        .select("*")
        .eq("case_id", id);

      if (clientError) {
        throw clientError;
      }

      setCaseData(caseData);
      setParties(partyData || []);
      setClients(clientData || []);
    } catch (error) {
      console.error("Error fetching case details:", error);
      setError(error.message);
      toast.error("사건 정보를 불러오는데 실패했습니다", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 당사자 유형 변환
  const getPartyTypeLabel = (type) => {
    switch (type) {
      case "plaintiff":
        return "원고";
      case "defendant":
        return "피고";
      case "appellant":
        return "항소인";
      case "appellee":
        return "피항소인";
      default:
        return type;
    }
  };

  // 당사자 정보 표시
  const getPartyEntityInfo = (party) => {
    if (party.entity_type === "individual") {
      return (
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{party.name}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <Building className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{party.name}</span>
          {party.representative && (
            <span className="text-sm text-muted-foreground ml-2">
              (대표: {party.representative})
            </span>
          )}
        </div>
      );
    }
  };

  // 사건 유형에 따른 배지 색상
  const getCaseTypeBadgeColor = (type) => {
    switch (type) {
      case "civil":
        return "outline";
      case "payment_order":
        return "secondary";
      case "execution":
        return "default";
      default:
        return "outline";
    }
  };

  // 금액 포맷팅
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">오류 발생</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>사건 정보를 불러올 수 없습니다</CardTitle>
            <CardDescription>다음 오류가 발생했습니다: {error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/cases")}>사건 목록으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">사건을 찾을 수 없음</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>요청한 사건을 찾을 수 없습니다</CardTitle>
            <CardDescription>사건이 삭제되었거나 접근 권한이 없을 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/cases")}>사건 목록으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/cases")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{caseData.case_info || "제목 없음"}</h1>
          <p className="text-muted-foreground">
            사건번호: {caseData.case_number || "-"} | 법원: {caseData.court_name || "-"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="progress">
            <GanttChart className="h-4 w-4 mr-2" />
            진행상황
          </TabsTrigger>
          <TabsTrigger value="activities">
            <CircleDollarSign className="h-4 w-4 mr-2" />
            회수활동
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            문서
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <MailCheck className="h-4 w-4 mr-2" />
            알림
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>사건 개요</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">사건 유형</h3>
                  <Badge variant={getCaseTypeBadgeColor(caseData.case_type)}>
                    {caseData.case_type === "civil"
                      ? "민사"
                      : caseData.case_type === "payment_order"
                      ? "지급명령"
                      : caseData.case_type === "execution"
                      ? "강제집행"
                      : caseData.case_type || "-"}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">상태</h3>
                  <Badge
                    variant={
                      caseData.status === "pending"
                        ? "outline"
                        : caseData.status === "in_progress"
                        ? "secondary"
                        : caseData.status === "completed"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {caseData.status === "pending"
                      ? "대기중"
                      : caseData.status === "in_progress"
                      ? "진행중"
                      : caseData.status === "completed"
                      ? "완료"
                      : caseData.status === "on_hold"
                      ? "보류"
                      : caseData.status || "-"}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">청구금액</h3>
                  <p className="text-lg font-semibold">
                    {caseData.principal_amount ? formatCurrency(caseData.principal_amount) : "-"}
                  </p>
                </div>
                {caseData.case_info && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">사건 정보</h3>
                    <p className="text-sm whitespace-pre-line">{caseData.case_info}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">주요 날짜</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">접수일:</span>
                      <span>
                        {caseData.filing_date
                          ? format(parseISO(caseData.filing_date), "yyyy년 MM월 dd일", {
                              locale: ko,
                            })
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">등록일:</span>
                      <span>
                        {caseData.created_at
                          ? format(parseISO(caseData.created_at), "yyyy년 MM월 dd일", {
                              locale: ko,
                            })
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>당사자 정보</CardTitle>
            </CardHeader>
            <CardContent>
              {parties.length > 0 ? (
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">
                      <Users className="h-4 w-4 inline mr-2" />
                      당사자 목록
                    </h3>
                    <div className="space-y-2">
                      {parties.map((party) => (
                        <div key={party.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center mb-1">
                                <Badge variant="outline" className="mr-2">
                                  {getPartyTypeLabel(party.party_type)}
                                </Badge>
                                {getPartyEntityInfo(party)}
                              </div>
                              {party.phone && (
                                <p className="text-sm text-muted-foreground">
                                  연락처: {party.phone}
                                </p>
                              )}
                              {party.address && (
                                <p className="text-sm text-muted-foreground">
                                  주소: {party.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {clients.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">의뢰인 특이사항</h3>
                        <div className="space-y-2">
                          {clients.map((client) => (
                            <div key={client.id} className="border rounded-md p-3">
                              <div className="mb-2 font-medium">
                                {parties.find((p) => p.id === client.party_id)?.name || "이름 없음"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  등록된 당사자 정보가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <RecoveryActivities caseId={id} parties={parties} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentManager caseId={id} />
        </TabsContent>

        <TabsContent value="notifications">
          <CaseNotifications caseId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Suspense로 감싸서 사용하는 메인 컴포넌트
export default function CaseDetailClient({ id }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin">
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">사건 정보 로딩 중...</p>
          </div>
        </div>
      }
    >
      <CaseDetailContent id={id} />
    </Suspense>
  );
}
