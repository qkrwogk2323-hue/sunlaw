"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CasesTable } from "@/components/CasesTable";
import {
  Bell,
  Building2,
  Briefcase,
  CircleDollarSign,
  ChevronDown,
  User,
  FileBarChart,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 컴포넌트 import
import NotificationSummary from "./NotificationSummary";
import StatisticsCards from "./StatisticsCards";
import ClientSummary from "./ClientSummary";
import { useUser } from "@/contexts/UserContext";

export default function MyCasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 현재 페이지, 검색어, 탭 정보 가져오기
  const pageFromUrl = Number(searchParams.get("page")) || 1;
  const searchTermFromUrl = searchParams.get("search") || "";
  const selectedTabFromUrl = searchParams.get("tab") || "personal";
  const selectedOrgFromUrl = searchParams.get("org") || null;

  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [personalCases, setPersonalCases] = useState([]);
  const [organizationCases, setOrganizationCases] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedTab, setSelectedTab] = useState(selectedTabFromUrl);
  const [selectedOrg, setSelectedOrg] = useState(selectedOrgFromUrl);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // 검색 및 페이지네이션을 위한 상태 추가
  const [searchTerm, setSearchTerm] = useState(searchTermFromUrl);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [filteredCases, setFilteredCases] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [casesPerPage, setCasesPerPage] = useState(10);
  const [refetchTrigger, setRefetchTrigger] = useState(0); // 데이터 리프래시를 위한 트리거

  // 회수 정보를 위한 상태 추가
  const [recoveryStats, setRecoveryStats] = useState({
    totalPrincipalAmount: 0,
    totalDebtAmount: 0, // 원금 + 이자 + 비용 (총 채권액)
    totalRecoveredAmount: 0,
    recoveryRate: 0,
  });

  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    pendingCases: 0,
    closedCases: 0,
    casesByType: [],
    casesByMonth: [],
    debtCategories: [],
  });

  // 월별 회수 통계를 위한 상태 추가
  const [monthlyRecoveryStats, setMonthlyRecoveryStats] = useState([]);
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(false);

  // 유저 데이터 상태
  const [userData, setUserData] = useState(null);
  const { user } = useUser();

  // 데이터 로드 및 초기화 로직 구현 필요
  useEffect(() => {
    if (user) {
      setUserData(user);
      fetchCases();
      fetchNotifications();
      setLoading(false); // 데이터 로드 완료 후 로딩 상태 해제
    }
  }, [user]);

  // 탭 전환 핸들러
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setSelectedOrg(null);
    updateUrlParams(1, searchTerm, tab);

    // 탭이 변경될 때 필터링된 케이스 업데이트
    if (tab === "personal") {
      setOrganizationCases([]);
      filterAndPaginateCases(personalCases, searchTerm, 1);
    } else {
      // 조직 케이스를 설정
      const selectedOrgCases = organizations[0]?.cases || [];
      setOrganizationCases(selectedOrgCases);
      setSelectedOrg(organizations[0]?.orgId);
      filterAndPaginateCases(selectedOrgCases, searchTerm, 1);
    }

    setCurrentPage(1);

    // 통계 데이터 업데이트를 위한 강제 리렌더링 트리거
    setRefetchTrigger((prev) => prev + 1);
  };

  // 조직 전환 핸들러
  const handleOrgChange = (orgId) => {
    setSelectedOrg(orgId);
    updateUrlParams(1, searchTerm, "organization", orgId);

    // 선택된 조직의 케이스를 필터링
    const selectedOrgCases = organizations.find((org) => org.orgId === orgId)?.cases || [];
    setOrganizationCases(selectedOrgCases);
    filterAndPaginateCases(selectedOrgCases, searchTerm, 1);
    setCurrentPage(1);

    // 통계 데이터 업데이트를 위한 강제 리렌더링 트리거
    setRefetchTrigger((prev) => prev + 1);
  };

  // URL 파라미터 업데이트 함수
  const updateUrlParams = (page, search, tab, org = null) => {
    const params = new URLSearchParams();
    if (page !== 1) params.set("page", page.toString());
    if (search) params.set("search", search);
    if (tab !== "personal") params.set("tab", tab);
    if (org) params.set("org", org);

    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.pushState({}, "", newUrl);
  };

  // 케이스 필터링 및 페이지네이션 함수
  const filterAndPaginateCases = (casesArray, searchTerm, page) => {
    let filtered = casesArray;

    // 검색어가 있으면 필터링
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = casesArray.filter((c) => {
        return (
          c.title?.toLowerCase().includes(term) ||
          c.case_number?.toLowerCase().includes(term) ||
          c.creditor_name?.toLowerCase().includes(term) ||
          c.debtor_name?.toLowerCase().includes(term)
        );
      });
    }

    // 총 페이지 수 계산
    const totalPages = Math.max(1, Math.ceil(filtered.length / casesPerPage));
    setTotalPages(totalPages);

    // 페이지에 맞는 케이스만 추출
    const startIndex = (page - 1) * casesPerPage;
    const paginatedCases = filtered.slice(startIndex, startIndex + casesPerPage);

    setFilteredCases(paginatedCases);
    setCases(paginatedCases);
  };

  // 검색 핸들러
  const handleSearch = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      const newSearchTerm = e.target.value || "";
      setSearchTerm(newSearchTerm);
      updateUrlParams(1, newSearchTerm, selectedTab, selectedOrg);
      filterAndPaginateCases(
        selectedTab === "personal" ? personalCases : organizationCases,
        newSearchTerm,
        1
      );
      setCurrentPage(1);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
    updateUrlParams(page, searchTerm, selectedTab, selectedOrg);
    filterAndPaginateCases(
      selectedTab === "personal" ? personalCases : organizationCases,
      searchTerm,
      page
    );
  };

  // 사건 정보에 당사자 정보 추가
  const enrichCasesWithPartyInfo = async (cases) => {
    if (!cases || cases.length === 0) return [];

    const caseIds = cases.map((c) => c.id);

    try {
      // 각 사건의 당사자 정보 가져오기
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("*")
        .in("case_id", caseIds);

      if (partiesError) throw partiesError;

      // 회수 활동 정보 가져오기
      const { data: recoveryData, error: recoveryError } = await supabase
        .from("test_recovery_activities")
        .select("case_id, amount, activity_type")
        .in("case_id", caseIds);

      if (recoveryError) throw recoveryError;

      // 이자 정보 가져오기
      const { data: interestData, error: interestError } = await supabase
        .from("test_case_interests")
        .select("case_id, rate, start_date, end_date")
        .in("case_id", caseIds);

      if (interestError) {
        console.error("이자 정보 가져오기 실패:", interestError);
      }

      // 비용 정보 가져오기
      const { data: expenseData, error: expenseError } = await supabase
        .from("test_case_expenses")
        .select("case_id, amount")
        .in("case_id", caseIds);

      if (expenseError) {
        console.error("비용 정보 가져오기 실패:", expenseError);
      }

      // 회수 금액 계산
      const recoveryByCase = {};
      recoveryData?.forEach((recovery) => {
        if (recovery.activity_type === "payment" && recovery.amount) {
          if (!recoveryByCase[recovery.case_id]) {
            recoveryByCase[recovery.case_id] = 0;
          }
          recoveryByCase[recovery.case_id] += parseFloat(recovery.amount || 0);
        }
      });

      // 이자 금액 계산 - 간소화를 위해 이자는 0으로 처리
      const interestByCase = {};
      caseIds.forEach((caseId) => {
        interestByCase[caseId] = 0;
      });

      // 비용 금액 계산
      const expenseByCase = {};
      caseIds.forEach((caseId) => {
        expenseByCase[caseId] = 0;
      });

      // 비용 정보가 있는 경우만 처리
      if (expenseData && expenseData.length > 0) {
        expenseData.forEach((expense) => {
          if (expense.case_id && expense.amount) {
            if (!expenseByCase[expense.case_id]) {
              expenseByCase[expense.case_id] = 0;
            }
            expenseByCase[expense.case_id] += parseFloat(expense.amount || 0);
          }
        });
      }

      // 당사자 정보로 사건 정보 보강
      return cases.map((caseItem) => {
        const caseParties = partiesData
          ? partiesData.filter((p) => p.case_id === caseItem.id) || []
          : [];

        const creditor = caseParties.find((p) =>
          ["creditor", "plaintiff", "applicant"].includes(p.party_type)
        );

        const debtor = caseParties.find((p) =>
          ["debtor", "defendant", "respondent"].includes(p.party_type)
        );

        // 당사자 이름 설정 (null 체크 강화)
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

        // 원금 (수임금액)
        const principalAmount = caseItem.principal_amount || 0;

        // 이자 금액
        const interestAmount = interestByCase[caseItem.id] || 0;

        // 비용 금액
        const expenseAmount = expenseByCase[caseItem.id] || 0;

        // 총 채권액 (원금 + 이자 + 비용) = 원리금
        const debtAmount = principalAmount + interestAmount + expenseAmount;

        // 회수 금액
        const recoveredAmount = recoveryByCase[caseItem.id] || 0;

        // 회수율 (회수금액 / 원금)
        const recoveryRate =
          principalAmount > 0 ? Math.round((recoveredAmount / principalAmount) * 1000) / 10 : 0;

        return {
          ...caseItem,
          creditor,
          debtor,
          creditor_name: creditorName,
          debtor_name: debtorName,
          interest_amount: interestAmount,
          expense_amount: expenseAmount,
          debt_amount: debtAmount,
          recovered_amount: recoveredAmount,
          recovery_rate: recoveryRate,
          // KCB 및 납부안내 정보 추가 (null 체크 추가)
          debtor_kcb_checked: debtor ? !!debtor.kcb_checked : false,
          debtor_payment_notification_sent: debtor ? !!debtor.payment_notification_sent : false,
        };
      });
    } catch (err) {
      console.error("사건 정보 보강 실패:", err);
      return cases;
    }
  };

  // 사건 데이터 가져오기 함수
  const fetchCases = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 외부 직원인지 확인
      const isExternalStaff = user.employee_type === "external" && user.role === "staff";

      // 1. 사용자가 개인 의뢰인으로 등록된 사건 가져오기
      const { data: clientCases, error: clientError } = await supabase
        .from("test_case_clients")
        .select(
          `
          *,
          case:case_id(
            *
          )
        `
        )
        .eq("client_type", "individual")
        .eq("individual_id", user.id);

      if (clientError) throw clientError;

      // 2. 사용자가 속한 조직 가져오기
      const { data: userOrgs, error: orgError } = await supabase
        .from("test_organization_members")
        .select(
          `
          *,
          organization:organization_id(*)
        `
        )
        .eq("user_id", user.id);

      if (orgError) throw orgError;

      // 3. 각 조직이 의뢰인으로 등록된 사건 가져오기
      const orgIds = userOrgs.map((org) => org.organization_id);
      let orgCases = [];

      if (orgIds.length > 0) {
        const { data: orgClientCases, error: orgClientError } = await supabase
          .from("test_case_clients")
          .select(
            `
            *,
            case:case_id(
              *
            ),
            organization:organization_id(*)
          `
          )
          .eq("client_type", "organization")
          .in("organization_id", orgIds);

        if (orgClientError) throw orgClientError;
        orgCases = orgClientCases || [];
      }

      // 4. 외부 직원인 경우 담당자로 지정된 사건만 가져오기
      let handledCases = [];

      if (isExternalStaff) {
        // 담당자 테이블에서 사용자가 담당하는 사건 ID 목록 가져오기
        const { data: userHandlers, error: handlersError } = await supabase
          .from("test_case_handlers")
          .select("case_id")
          .eq("user_id", user.id);

        if (handlersError) throw handlersError;

        const handledCaseIds = userHandlers.map((h) => h.case_id);

        if (handledCaseIds.length > 0) {
          const { data: handledCasesData, error: handledCasesError } = await supabase
            .from("test_cases")
            .select("*")
            .in("id", handledCaseIds);

          if (handledCasesError) throw handledCasesError;
          handledCases = handledCasesData || [];
        }
      }

      // 개인 의뢰와 조직 의뢰 정리
      let personalCasesList = await enrichCasesWithPartyInfo(
        clientCases
          .filter((client) => client.case && !client.case.deleted_at)
          .map((client) => client.case)
      );

      const orgList = userOrgs.map((org) => org.organization);
      const orgCasesByOrg = await Promise.all(
        orgIds.map(async (orgId) => {
          const orgName = orgList.find((org) => org.id === orgId)?.name || "알 수 없는 조직";
          const cases = await enrichCasesWithPartyInfo(
            orgCases
              .filter((c) => c.organization_id === orgId && c.case && !c.case.deleted_at)
              .map((c) => c.case)
          );

          // 조직 멤버 정보 가져오기
          const { data: orgMembers, error: orgMembersError } = await supabase
            .from("test_organization_members")
            .select("*")
            .eq("organization_id", orgId);

          if (orgMembersError) {
            console.error("조직 멤버 정보 가져오기 실패:", orgMembersError);
          }

          return {
            orgId,
            orgName,
            cases,
            organization: orgList.find((org) => org.id === orgId),
            members: orgMembers || [],
          };
        })
      );

      const filteredOrgCasesByOrg = orgCasesByOrg.filter((org) => org.cases.length > 0);

      // 외부 직원 처리 - 담당하는 사건만 표시
      if (isExternalStaff) {
        // 담당 사건 ID 목록
        const handledCaseIds = handledCases.map((c) => c.id);

        // 각 목록에서 담당 사건만 필터링
        personalCasesList = await enrichCasesWithPartyInfo(handledCases);

        // 조직 사건에는 접근 권한 없음 (필요하다면 여기서 필터링 로직 추가)
        for (let i = 0; i < filteredOrgCasesByOrg.length; i++) {
          filteredOrgCasesByOrg[i].cases = []; // 외부 직원은 조직 사건 비우기
        }

        // 사용자에게 안내 메시지 표시
        toast.info("외부 직원은 담당으로 지정된 사건만 볼 수 있습니다", {
          duration: 5000,
          position: "top-center",
        });
      }

      // 모든 의뢰를 합쳐서 통계 계산
      const allCases = [...personalCasesList];
      filteredOrgCasesByOrg.forEach((org) => {
        allCases.push(...org.cases);
      });

      // 중복 제거
      const uniqueCases = Array.from(new Set(allCases.map((c) => c.id))).map((id) =>
        allCases.find((c) => c.id === id)
      );

      // 통계 계산
      const calculatedStats = calculateStats(uniqueCases);

      // 채권 분류별 통계 계산
      const debtCategories = {
        normal: 0, // 정상 채권
        bad: 0, // 악성 채권
        interest: 0, // 관심 채권
        special: 0, // 특수 채권
      };

      // 실제 DB에서 채권 분류 데이터 사용
      uniqueCases.forEach((c) => {
        // debt_category 필드는 text 타입이므로 직접 사용
        // DB에 값이 없으면 기본값 'normal' 사용
        const category = c.debt_category || "normal";

        // 유효한 카테고리인지 확인
        if (debtCategories.hasOwnProperty(category)) {
          debtCategories[category]++;
        } else {
          // 알 수 없는 카테고리는 'normal'로 처리
          debtCategories.normal++;
        }
      });

      // 채권 분류 카테고리 표시 이름 수정
      const debtCategoriesData = [
        { name: "정상 채권", value: debtCategories.normal, color: "#10b981" },
        { name: "악성 채권", value: debtCategories.bad, color: "#ef4444" },
        { name: "관심 채권", value: debtCategories.interest, color: "#f59e0b" },
        { name: "특수 채권", value: debtCategories.special, color: "#6366f1" },
      ].filter((category) => category.value > 0); // 값이 0인 카테고리는 제외

      // 데이터가 하나도 없을 경우 기본 데이터 제공
      if (debtCategoriesData.length === 0) {
        debtCategoriesData.push({ name: "정상 채권", value: uniqueCases.length, color: "#10b981" });
      }

      // 회수 통계 계산
      const calculatedRecoveryStats = calculateRecoveryStats(uniqueCases);

      setStats({
        ...calculatedStats,
        debtCategories: debtCategoriesData,
      });
      setRecoveryStats(calculatedRecoveryStats);
      setPersonalCases(personalCasesList);
      setOrganizations(filteredOrgCasesByOrg);

      // 초기 사건 목록 설정
      let initialCases = [];
      if (selectedTab === "personal") {
        initialCases = personalCasesList;
      } else if (filteredOrgCasesByOrg.length > 0) {
        const orgId = selectedOrg || filteredOrgCasesByOrg[0].orgId;
        const selectedOrgCases =
          filteredOrgCasesByOrg.find((org) => org.orgId === orgId)?.cases || [];
        initialCases = selectedOrgCases;
        setSelectedOrg(orgId);
        setOrganizationCases(selectedOrgCases);
      }

      // 필터링 및 페이지네이션 적용
      filterAndPaginateCases(initialCases, searchTerm, currentPage);

      // 월별 회수 통계 가져오기
      fetchMonthlyRecoveryStats(uniqueCases);
    } catch (error) {
      console.error("사건 가져오기 실패:", error);
      toast.error("사건 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 통계 계산
  const calculateStats = (cases) => {
    const totalCases = cases.length;
    const activeCases = cases.filter(
      (c) => c.status === "active" || c.status === "in_progress"
    ).length;
    const pendingCases = cases.filter((c) => c.status === "pending").length;
    const closedCases = cases.filter(
      (c) => c.status === "closed" || c.status === "completed"
    ).length;

    // 사건 종류별 통계
    const caseTypes = {};
    cases.forEach((c) => {
      const type = c.case_type || "기타";
      caseTypes[type] = (caseTypes[type] || 0) + 1;
    });

    // 월별 사건 통계
    const casesByMonth = {};
    cases.forEach((c) => {
      if (c.created_at) {
        const date = new Date(c.created_at);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        casesByMonth[yearMonth] = (casesByMonth[yearMonth] || 0) + 1;
      }
    });

    // 평균 처리일 계산 (종료된 사건만)
    let totalDays = 0;
    let completedCount = 0;

    cases.forEach((c) => {
      if ((c.status === "closed" || c.status === "completed") && c.created_at && c.updated_at) {
        const startDate = new Date(c.created_at);
        const endDate = new Date(c.updated_at);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        totalDays += diffDays;
        completedCount++;
      }
    });

    const avgProcessingDays = completedCount > 0 ? Math.round(totalDays / completedCount) : 0;

    // 사건 종류별 차트 데이터
    const casesByTypeChart = Object.entries(caseTypes).map(([name, value]) => ({
      name,
      value,
    }));

    // 월별 사건 차트 데이터
    const casesByMonthChart = Object.entries(casesByMonth)
      .map(([yearMonth, count]) => ({
        yearMonth,
        count,
      }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    return {
      totalCases,
      activeCases,
      pendingCases,
      closedCases,
      casesByType: casesByTypeChart,
      casesByMonth: casesByMonthChart,
      avgProcessingDays,
    };
  };

  // 회수 통계 계산
  const calculateRecoveryStats = (cases) => {
    let totalPrincipalAmount = 0;
    let totalDebtAmount = 0;
    let totalRecoveredAmount = 0;

    cases.forEach((c) => {
      totalPrincipalAmount += parseFloat(c.principal_amount || 0);
      totalDebtAmount += parseFloat(c.debt_amount || 0);
      totalRecoveredAmount += parseFloat(c.recovered_amount || 0);
    });

    const recoveryRate =
      totalPrincipalAmount > 0
        ? Math.round((totalRecoveredAmount / totalPrincipalAmount) * 1000) / 10
        : 0;

    return {
      totalPrincipalAmount,
      totalDebtAmount,
      totalRecoveredAmount,
      recoveryRate,
    };
  };

  // 월별 회수 통계 가져오기
  const fetchMonthlyRecoveryStats = async (cases) => {
    setMonthlyStatsLoading(true);
    try {
      const caseIds = cases.map((c) => c.id);

      if (caseIds.length === 0) {
        setMonthlyRecoveryStats([]);
        return;
      }

      // 회수 활동 가져오기
      const { data: recoveryData, error: recoveryError } = await supabase
        .from("test_recovery_activities")
        .select("*")
        .in("case_id", caseIds);

      if (recoveryError) throw recoveryError;

      // 월별 통계 준비
      const monthlyStats = {};

      // 지난 12개월의 월별 통계 초기화
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyStats[yearMonth] = {
          yearMonth,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          회수금액: 0,
          회수건수: 0,
        };
      }

      if (recoveryData && recoveryData.length > 0) {
        // 월별로 데이터 집계
        recoveryData.forEach((recovery) => {
          const date = new Date(recovery.created_at);
          const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

          if (monthlyStats[yearMonth]) {
            monthlyStats[yearMonth].회수금액 += parseFloat(recovery.amount || 0);
            monthlyStats[yearMonth].회수건수 += 1;
          }
        });
      }

      // 월별 배열로 변환하고 정렬
      const sortedStats = Object.values(monthlyStats).sort((a, b) =>
        a.yearMonth.localeCompare(b.yearMonth)
      );

      setMonthlyRecoveryStats(sortedStats);
    } catch (error) {
      console.error("월별 회수 통계 가져오기 실패:", error);
      setMonthlyRecoveryStats([]);
    } finally {
      setMonthlyStatsLoading(false);
    }
  };

  // 알림 데이터 가져오기 함수
  const fetchNotifications = async () => {
    if (!user) return;

    setNotificationsLoading(true);
    try {
      let notificationsData = [];

      if (selectedTab === "personal") {
        // 개인 탭인 경우 개인 관련 알림만 가져오기
        const { data, error } = await supabase
          .from("test_individual_notifications")
          .select("*, test_cases:case_id(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // 개인 관련 알림만 필터링
        notificationsData = data.filter((notification) => {
          // 사건 정보에서 사건 유형 확인 (개인 또는 법인)
          if (notification.test_cases) {
            return true; // 일단 모든 알림을 가져오고 아래에서 필터링
          }
          return true;
        });
      } else if (selectedTab === "organization" && selectedOrg) {
        // 법인 탭이고 선택된 법인이 있는 경우 - RPC 대신 일반 쿼리 사용
        // 1. 기본 알림 가져오기
        const { data, error } = await supabase
          .from("test_individual_notifications")
          .select("*, test_cases:case_id(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // 2. 선택된 법인과 관련된 사건 ID 가져오기
        const { data: orgCaseClients, error: orgError } = await supabase
          .from("test_case_clients")
          .select("case_id")
          .eq("client_type", "organization")
          .eq("organization_id", selectedOrg);

        if (orgError) throw orgError;

        // 3. 법인 관련 사건 ID 목록 추출
        const orgCaseIds = orgCaseClients.map((client) => client.case_id);

        // 4. 법인 관련 알림만 필터링
        notificationsData = data.filter(
          (notification) => notification.case_id && orgCaseIds.includes(notification.case_id)
        );

        console.log("법인 필터링된 알림:", notificationsData.length);
      } else {
        // 법인 탭이지만 선택된 법인이 없는 경우 (또는 기타 경우)
        const { data, error } = await supabase
          .from("test_individual_notifications")
          .select("*, test_cases:case_id(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // 법인 관련 알림만 필터링 (선택된 법인 없음)
        notificationsData = await Promise.all(
          data.map(async (notification) => {
            // 알림에 entity_type 추가
            let entityType = "individual"; // 기본값

            if (notification.case_id) {
              try {
                // 사건의 의뢰인 정보 확인
                const { data: clientsData, error: clientsError } = await supabase
                  .from("test_case_clients")
                  .select("client_type, organization_id")
                  .eq("case_id", notification.case_id);

                if (!clientsError && clientsData && clientsData.length > 0) {
                  // 법인 의뢰인이 있는지 확인
                  const orgClient = clientsData.find(
                    (client) => client.client_type === "organization"
                  );

                  if (orgClient) {
                    entityType = "organization";
                  }
                }
              } catch (err) {
                console.error("의뢰인 정보 확인 실패:", err);
              }
            }

            return {
              ...notification,
              entity_type: entityType,
            };
          })
        );

        // 법인 탭이면 법인 관련 알림만 필터링
        if (selectedTab === "organization") {
          notificationsData = notificationsData.filter((n) => n.entity_type === "organization");
        }
      }

      setNotifications(notificationsData);
      setFilteredNotifications(notificationsData);
    } catch (error) {
      console.error("알림 가져오기 실패:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // 탭이나 선택된 법인이 변경되면 알림 다시 불러오기
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, selectedTab, selectedOrg]);

  // 로딩 중 UI
  if (loading) {
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 상단 헤더 */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">내 사건 관리</h1>
          <Tabs value={selectedTab} onValueChange={handleTabChange} defaultValue={selectedTab}>
            <TabsList className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm border-0 rounded-xl p-1">
              <TabsTrigger
                value="personal"
                className="rounded-lg py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                개인 사건 {personalCases.length > 0 && `(${personalCases.length})`}
              </TabsTrigger>
              {organizations.length > 0 && (
                <TabsTrigger
                  value="organization"
                  className="rounded-lg py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  법인/단체 사건 {organizationCases.length > 0 && `(${organizationCases.length})`}
                </TabsTrigger>
              )}
            </TabsList>

            {/* 여기에 빈 TabsContent를 넣어 구조를 완성합니다 */}
            <TabsContent value="personal" className="mt-0"></TabsContent>
            {organizations.length > 0 && (
              <TabsContent value="organization" className="mt-0"></TabsContent>
            )}
          </Tabs>
        </div>

        {selectedTab === "organization" && organizations.length > 0 && (
          <div className="mt-4 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg border-0 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">소속 법인/단체 선택</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 min-w-[220px] justify-between"
                  >
                    <span className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-primary" />
                      {organizations.find((o) => o.orgId === selectedOrg)?.orgName || "조직 선택"}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {organizations.find((o) => o.orgId === selectedOrg)?.cases.length || 0} 건
                    </Badge>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px]">
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.orgId}
                      onClick={() => handleOrgChange(org.orgId)}
                      className="flex items-center gap-2 cursor-pointer py-2"
                    >
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1 truncate">{org.orgName}</span>
                      <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {org.cases.length}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {/* 통계 대시보드 (탭 형식으로 변경) */}
      <div className="mb-8">
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
          <CardHeader className="pb-0">
            <Tabs
              defaultValue="cases"
              className="w-full"
              key={`stats-tabs-${selectedTab}-${selectedOrg || "none"}`}
            >
              <TabsList className="grid w-full grid-cols-2 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg">
                <TabsTrigger value="cases" className="flex items-center rounded-md">
                  <Briefcase className="mr-2 h-4 w-4" />
                  총의뢰 (
                  {selectedTab === "personal" ? personalCases.length : organizationCases.length}건)
                </TabsTrigger>
                <TabsTrigger value="recovery" className="flex items-center rounded-md">
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  채권정보 (
                  {formatCurrency(
                    calculateRecoveryStats(
                      selectedTab === "personal" ? personalCases : organizationCases
                    ).totalDebtAmount
                  ).replace("₩", "")}
                  )
                </TabsTrigger>
              </TabsList>

              {/* 총의뢰 탭 내용의 카드 스타일 수정 */}
              <TabsContent value="cases" className="pt-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 mb-4">
                  {/* 좌측 - 프로필 카드 */}
                  <div>
                    <ClientSummary
                      userData={userData}
                      cases={selectedTab === "personal" ? personalCases : organizationCases}
                      totalDebt={
                        calculateRecoveryStats(
                          selectedTab === "personal"
                            ? personalCases
                            : selectedOrg
                            ? organizations.find((org) => org.orgId === selectedOrg)?.cases || []
                            : organizationCases
                        ).totalDebtAmount
                      }
                      loading={loading}
                      selectedTab={selectedTab}
                      selectedOrg={selectedOrg}
                      organizations={organizations}
                    />
                  </div>

                  {/* 우측 - 알림 */}
                  <div>
                    <NotificationSummary
                      notifications={notifications}
                      loading={notificationsLoading}
                      selectedTab={selectedTab === "personal" ? "individual" : "organization"}
                      selectedOrg={selectedOrg}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="recovery" className="pt-3">
                {/* 채권 통계 컴포넌트 추가 예정 */}
                <div className="p-3">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FileBarChart className="h-5 w-5 mr-2 text-primary" /> 채권 회수 현황
                  </h3>
                  <StatisticsCards
                    stats={calculateStats(
                      selectedTab === "personal" ? personalCases : organizationCases
                    )}
                    recoveryStats={calculateRecoveryStats(
                      selectedTab === "personal" ? personalCases : organizationCases
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>

      {/* 사건 검색 및 테이블 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {selectedTab === "personal" ? "개인 사건 목록" : "조직 사건 목록"}
        </h2>
        <div className="relative w-full max-w-sm">
          <Input
            placeholder="사건명, 사건번호, 당사자명 검색..."
            className="pr-8"
            defaultValue={searchTerm}
            onKeyDown={handleSearch}
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-0 top-0 h-full px-3"
            onClick={handleSearch}
          >
            검색
          </Button>
        </div>
      </div>

      {/* 사건 테이블 */}
      <CasesTable
        cases={cases}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        loading={loading}
        formatCurrency={formatCurrency}
        notifications={notifications}
        personalCases={personalCases}
        organizationCases={organizationCases}
        selectedTab={selectedTab}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          updateUrlParams(1, term, selectedTab, selectedOrg);
          filterAndPaginateCases(
            selectedTab === "personal" ? personalCases : organizationCases,
            term,
            1
          );
          setCurrentPage(1);
        }}
        totalItems={selectedTab === "personal" ? personalCases.length : organizationCases.length}
        casesPerPage={casesPerPage}
        onRefreshData={() => {
          fetchCases();
          fetchNotifications();
        }}
        emptyMessage={
          searchTerm
            ? "검색 결과가 없습니다."
            : selectedTab === "personal"
            ? "등록된 개인 사건이 없습니다."
            : "등록된 조직 사건이 없습니다."
        }
        onRowClick={(caseItem) => router.push(`/cases/${caseItem.id}`)}
      />
    </div>
  );
}

// 통화 형식으로 변환하는 함수
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
};
