"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CasesTable } from "@/components/CasesTable";
import { toast } from "sonner";
import { Search, FileText, CircleDollarSign, User, Building2, Bell, RefreshCw } from "lucide-react";
import ClientSummary from "../my-cases/components/ClientSummary";
import NotificationSummary from "../my-cases/components/NotificationSummary";

export default function AssignedCasesPage() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [handlerCases, setHandlerCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);

  // 페이지네이션을 위한 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [casesPerPage, setCasesPerPage] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 사용자가 staff 역할인지 확인
  useEffect(() => {
    if (user && user.role !== "staff" && user.role !== "admin") {
      toast.error("접근 권한이 없습니다");
      router.push("/");
    } else {
      fetchAssignedCases();
      fetchNotifications();
    }
  }, [user, router, refreshTrigger]);

  // 담당 사건 목록 불러오기
  const fetchAssignedCases = async () => {
    try {
      setLoading(true);

      if (!user || !user.id) {
        setHandlerCases([]);
        setFilteredCases([]);
        return;
      }

      // 담당자가 맡은 사건 ID 불러오기
      const { data: handlerData, error: handlerError } = await supabase
        .from("test_case_handlers")
        .select("case_id")
        .eq("user_id", user.id);

      if (handlerError) throw handlerError;

      if (!handlerData || handlerData.length === 0) {
        setHandlerCases([]);
        setFilteredCases([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }

      // 사건 ID 목록
      const caseIds = handlerData.map((h) => h.case_id);

      // 사건 정보 불러오기
      const { data: casesData, error: casesError } = await supabase
        .from("test_cases")
        .select("*")
        .in("id", caseIds)
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;

      // 각 사건에 당사자 정보 추가
      const casesWithParties = await addPartiesInfoToCases(casesData || []);

      // 총 채권액 계산
      const totalAmount = casesWithParties.reduce(
        (sum, c) => sum + (Number(c.principal_amount) || 0),
        0
      );
      setTotalDebt(totalAmount);

      setHandlerCases(casesWithParties);
      filterAndPaginateCases(casesWithParties, searchTerm, currentPage);
      setTotalItems(casesWithParties.length);
    } catch (error) {
      console.error("담당 사건 목록 불러오기 오류:", error.message);
      toast.error("담당 사건 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 사건 목록에 당사자 정보와 회수 정보 추가하는 함수
  const addPartiesInfoToCases = async (casesData) => {
    try {
      if (!casesData.length) return [];

      // 모든 사건 ID 목록
      const caseIds = casesData.map((c) => c.id);

      // 모든 사건의 당사자 정보를 한번에 가져오기
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("*")
        .in("case_id", caseIds);

      if (partiesError) throw partiesError;

      // 회수 활동 정보 가져오기
      const { data: recoveryData, error: recoveryError } = await supabase
        .from("test_recovery_activities")
        .select("case_id, amount")
        .in("case_id", caseIds)
        .eq("activity_type", "payment");

      if (recoveryError) throw recoveryError;

      // 회수 금액 합계 계산
      const recoveryByCase = {};
      for (const recovery of recoveryData || []) {
        if (!recoveryByCase[recovery.case_id]) {
          recoveryByCase[recovery.case_id] = 0;
        }
        recoveryByCase[recovery.case_id] += Number(recovery.amount) || 0;
      }

      // 각 사건에 당사자 정보 추가
      return casesData.map((caseItem) => {
        const caseParties = partiesData
          ? partiesData.filter((p) => p.case_id === caseItem.id) || []
          : [];

        const creditor = caseParties.find((p) =>
          ["creditor", "plaintiff", "applicant"].includes(p.party_type)
        );

        const debtor = caseParties.find((p) =>
          ["debtor", "defendant", "respondent"].includes(p.party_type)
        );

        // 당사자 이름 설정
        let creditorName = "미지정";
        let debtorName = "미지정";

        if (creditor) {
          creditorName =
            creditor.entity_type === "individual"
              ? creditor.name || "이름 없음"
              : creditor.company_name || "회사명 없음";
        }

        if (debtor) {
          debtorName =
            debtor.entity_type === "individual"
              ? debtor.name || "이름 없음"
              : debtor.company_name || "회사명 없음";
        }

        // 회수 금액 추가
        const recoveredAmount = recoveryByCase[caseItem.id] || 0;

        return {
          ...caseItem,
          creditor,
          debtor,
          creditor_name: creditorName,
          debtor_name: debtorName,
          recovered_amount: recoveredAmount,
          // KCB 및 납부안내 정보 추가
          debtor_kcb_checked: debtor ? !!debtor.kcb_checked : false,
          debtor_payment_notification_sent: debtor ? !!debtor.payment_notification_sent : false,
        };
      });
    } catch (error) {
      console.error("당사자 정보 추가 오류:", error);
      return casesData;
    }
  };

  // 알림 정보 가져오기
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);

      if (!user || !user.id) {
        setNotifications([]);
        return;
      }

      // 사용자의 알림 가져오기 - 단순 쿼리
      const { data: notificationsData, error: notificationsError } = await supabase
        .from("test_individual_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);
    } catch (error) {
      console.error("알림 가져오기 실패:", error);
      toast.error("알림을 불러오는데 실패했습니다.");
    } finally {
      setNotificationsLoading(false);
    }
  };

  // 검색 및 페이지네이션 함수
  const filterAndPaginateCases = (casesArray, term, page) => {
    let filtered = casesArray;

    // 검색어가 있으면 필터링
    if (term && term.trim()) {
      const searchText = term.toLowerCase();
      filtered = casesArray.filter((c) => {
        return (
          c.creditor_name?.toLowerCase().includes(searchText) ||
          c.debtor_name?.toLowerCase().includes(searchText) ||
          (c.principal_amount?.toString() || "").includes(searchText)
        );
      });
    }

    // 총 페이지 수 계산
    const totalPages = Math.max(1, Math.ceil(filtered.length / casesPerPage));
    setTotalPages(totalPages);
    setTotalItems(filtered.length);

    // 현재 페이지에 표시할 사건만 추출
    const startIndex = (page - 1) * casesPerPage;
    const paginatedCases = filtered.slice(startIndex, startIndex + casesPerPage);

    setFilteredCases(paginatedCases);
  };

  // 검색 핸들러
  const handleSearch = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    filterAndPaginateCases(handlerCases, newSearchTerm, 1);
    setCurrentPage(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
    filterAndPaginateCases(handlerCases, searchTerm, page);
  };

  // 데이터 새로고침 핸들러
  const handleRefreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // 통화 형식으로 변환하는 함수
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "-";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 로딩 중 UI
  if (loading && handlerCases.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 상단 헤더 */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">담당 사건 관리</h1>
          <p className="text-muted-foreground">
            {user?.name ? `${user.name} 님이 담당하는 사건 목록` : "담당 사건 목록"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshData} className="self-start">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 프로필 및 알림 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <ClientSummary
            userData={user}
            cases={handlerCases}
            totalDebt={totalDebt}
            loading={loading}
            selectedTab="personal"
          />
        </div>
        <div>
          <NotificationSummary notifications={notifications} loading={notificationsLoading} />
        </div>
      </div>

      {/* 사건 검색 및 테이블 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          담당 사건 목록
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (총 {totalItems}건)
          </span>
        </h2>
        <div className="relative w-full max-w-sm">
          <Input
            placeholder="당사자명, 원금 등으로 검색..."
            className="pr-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(searchTerm);
              }
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => handleSearch(searchTerm)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 사건 테이블 */}
      <CasesTable
        cases={filteredCases}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        formatCurrency={formatCurrency}
        notifications={notifications}
        personalCases={handlerCases}
        organizationCases={[]}
        selectedTab="personal"
        searchTerm={searchTerm}
        onSearchChange={handleSearch}
        totalItems={totalItems}
        casesPerPage={casesPerPage}
        onRefreshData={handleRefreshData}
      />
    </div>
  );
}
