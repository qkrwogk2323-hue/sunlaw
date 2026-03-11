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

  const [searchTerm, setSearchTerm] = useState(searchTermFromUrl);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [filteredCases, setFilteredCases] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [casesPerPage, setCasesPerPage] = useState(10);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const [recoveryStats, setRecoveryStats] = useState({
    totalPrincipalAmount: 0,
    totalDebtAmount: 0,
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

  const [monthlyRecoveryStats, setMonthlyRecoveryStats] = useState([]);
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(false);

  const [userData, setUserData] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      setUserData(user);
      fetchCases();
      fetchNotifications();
    }
  }, [user]);

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setSelectedOrg(null);
    updateUrlParams(1, searchTerm, tab);

    if (tab === "personal") {
      setOrganizationCases([]);
      filterAndPaginateCases(personalCases, searchTerm, 1);
    } else {
      const selectedOrgCases = organizations[0]?.cases || [];
      setOrganizationCases(selectedOrgCases);
      setSelectedOrg(organizations[0]?.orgId);
      filterAndPaginateCases(selectedOrgCases, searchTerm, 1);
    }
    setCurrentPage(1);
    setRefetchTrigger((prev) => prev + 1);
  };

  const handleOrgChange = (orgId) => {
    setSelectedOrg(orgId);
    updateUrlParams(1, searchTerm, "organization", orgId);
    const selectedOrgCases = organizations.find((org) => org.orgId === orgId)?.cases || [];
    setOrganizationCases(selectedOrgCases);
    filterAndPaginateCases(selectedOrgCases, searchTerm, 1);
    setCurrentPage(1);
    setRefetchTrigger((prev) => prev + 1);
  };

  const updateUrlParams = (page, search, tab, org = null) => {
    const params = new URLSearchParams();
    if (page !== 1) params.set("page", page.toString());
    if (search) params.set("search", search);
    if (tab !== "personal") params.set("tab", tab);
    if (org) params.set("org", org);

    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.pushState({}, "", newUrl);
  };

  const filterAndPaginateCases = (casesArray, searchTerm, page) => {
    let filtered = casesArray;

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

    const totalPages = Math.max(1, Math.ceil(filtered.length / casesPerPage));
    setTotalPages(totalPages);

    const startIndex = (page - 1) * casesPerPage;
    const paginatedCases = filtered.slice(startIndex, startIndex + casesPerPage);

    setFilteredCases(paginatedCases);
    setCases(paginatedCases);
  };

  const executeSearch = (nextSearchTerm = "") => {
    const normalizedSearchTerm = nextSearchTerm;
    setSearchTerm(normalizedSearchTerm);
    updateUrlParams(1, normalizedSearchTerm, selectedTab, selectedOrg);
    filterAndPaginateCases(
      selectedTab === "personal" ? personalCases : organizationCases,
      normalizedSearchTerm,
      1
    );
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(searchTerm);
    }
  };

  const handleSearchClick = () => {
    executeSearch(searchTerm);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    updateUrlParams(page, searchTerm, selectedTab, selectedOrg);
    filterAndPaginateCases(
      selectedTab === "personal" ? personalCases : organizationCases,
      searchTerm,
      page
    );
  };

  // 당사자 정보 보강 (안전한 분리 쿼리)
  const enrichCasesWithPartyInfo = async (cases) => {
    if (!cases || cases.length === 0) return [];
    const caseIds = cases.map((c) => c.id);

    try {
      const { data: partiesData } = await supabase.from("test_case_parties").select("*").in("case_id", caseIds);
      const { data: recoveryData } = await supabase.from("test_recovery_activities").select("case_id, amount, activity_type").in("case_id", caseIds);
      const { data: interestData } = await supabase.from("test_case_interests").select("case_id, rate, start_date, end_date").in("case_id", caseIds);
      const { data: expenseData } = await supabase.from("test_case_expenses").select("case_id, amount").in("case_id", caseIds);

      const recoveryByCase = {};
      recoveryData?.forEach((recovery) => {
        if (recovery.activity_type === "payment" && recovery.amount) {
          if (!recoveryByCase[recovery.case_id]) recoveryByCase[recovery.case_id] = 0;
          recoveryByCase[recovery.case_id] += parseFloat(recovery.amount || 0);
        }
      });

      const interestByCase = {};
      caseIds.forEach((caseId) => { interestByCase[caseId] = 0; });

      const expenseByCase = {};
      caseIds.forEach((caseId) => { expenseByCase[caseId] = 0; });

      if (expenseData && expenseData.length > 0) {
        expenseData.forEach((expense) => {
          if (expense.case_id && expense.amount) {
            if (!expenseByCase[expense.case_id]) expenseByCase[expense.case_id] = 0;
            expenseByCase[expense.case_id] += parseFloat(expense.amount || 0);
          }
        });
      }

      return cases.map((caseItem) => {
        const caseParties = partiesData ? partiesData.filter((p) => p.case_id === caseItem.id) || [] : [];
        const creditor = caseParties.find((p) => ["creditor", "plaintiff", "applicant"].includes(p.party_type));
        const debtor = caseParties.find((p) => ["debtor", "defendant", "respondent"].includes(p.party_type));

        let creditorName = "미지정";
        let debtorName = "미지정";

        if (creditor) creditorName = creditor.entity_type === "individual" ? creditor.name || "이름 없음" : creditor.company_name || "회사명 없음";
        if (debtor) debtorName = debtor.entity_type === "individual" ? debtor.name || "이름 없음" : debtor.company_name || "회사명 없음";

        const principalAmount = caseItem.principal_amount || 0;
        const interestAmount = interestByCase[caseItem.id] || 0;
        const expenseAmount = expenseByCase[caseItem.id] || 0;
        const debtAmount = principalAmount + interestAmount + expenseAmount;
        const recoveredAmount = recoveryByCase[caseItem.id] || 0;
        const recoveryRate = principalAmount > 0 ? Math.round((recoveredAmount / principalAmount) * 1000) / 10 : 0;

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
          debtor_kcb_checked: debtor ? !!debtor.kcb_checked : false,
          debtor_payment_notification_sent: debtor ? !!debtor.payment_notification_sent : false,
        };
      });
    } catch (err) {
      console.error("사건 정보 보강 실패:", err);
      return cases;
    }
  };

  // 💡 DB 오류 방지: 완전히 분리된 안전한 데이터 로딩 구조 (Join 제거)
  const fetchCases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isExternalStaff = user.employee_type === "external" && user.role === "staff";

      // 1. 개인 사건 아이디만 먼저 추출
      const { data: clientCasesData, error: clientError } = await supabase
        .from("test_case_clients")
        .select("case_id")
        .eq("client_type", "individual")
        .eq("individual_id", user.id);

      if (clientError) throw clientError;

      const personalCaseIds = [...new Set((clientCasesData || []).map((c) => c.case_id).filter(Boolean))];

      let personalCasesList = [];
      if (personalCaseIds.length > 0) {
        // 사건 원본 따로 가져오기
        const { data: pCases, error: pError } = await supabase
          .from("test_cases")
          .select("*")
          .in("id", personalCaseIds);
        
        if (pError) throw pError;
        personalCasesList = await enrichCasesWithPartyInfo(pCases || []);
      }

      // 2. 조직 사건 아이디 안전 추출 (에러 발생해도 무시)
      let orgIds = [];
      try {
        const { data: userOrgsData } = await supabase
          .from("test_organization_members")
          .select("organization_id")
          .eq("user_id", user.id);

        if (userOrgsData) {
          orgIds = [...new Set(userOrgsData.map((o) => o.organization_id).filter(Boolean))];
        }
      } catch (e) {
        console.warn("조직 멤버 데이터가 없습니다.");
      }

      let filteredOrgCasesByOrg = [];
      if (orgIds.length > 0) {
        const { data: orgsInfo } = await supabase.from("test_organizations").select("*").in("id", orgIds);
        const orgsMap = {};
        (orgsInfo || []).forEach(o => orgsMap[o.id] = o);

        const { data: orgClientsData } = await supabase
          .from("test_case_clients")
          .select("case_id, organization_id")
          .eq("client_type", "organization")
          .in("organization_id", orgIds);

        const orgCaseMap = {};
        orgIds.forEach(id => orgCaseMap[id] = []);
        (orgClientsData || []).forEach(c => {
          if (c.case_id && c.organization_id) {
            orgCaseMap[c.organization_id].push(c.case_id);
          }
        });

        for (const orgId of orgIds) {
          const cIds = [...new Set(orgCaseMap[orgId])];
          let casesForOrg = [];
          if (cIds.length > 0) {
            const { data: oCases } = await supabase.from("test_cases").select("*").in("id", cIds);
            casesForOrg = await enrichCasesWithPartyInfo(oCases || []);
          }

          if (casesForOrg.length > 0) {
            filteredOrgCasesByOrg.push({
              orgId: orgId,
              orgName: orgsMap[orgId]?.name || "알 수 없는 조직",
              cases: casesForOrg,
              organization: orgsMap[orgId] || null,
              members: []
            });
          }
        }
      }

      // 3. 외부 직원 필터링
      if (isExternalStaff) {
        let handledCases = [];
        const { data: handlersData } = await supabase.from("test_case_handlers").select("case_id").eq("user_id", user.id);
        const handledCaseIds = [...new Set((handlersData || []).map(h => h.case_id).filter(Boolean))];
        
        if (handledCaseIds.length > 0) {
          const { data: hCases } = await supabase.from("test_cases").select("*").in("id", handledCaseIds);
          handledCases = await enrichCasesWithPartyInfo(hCases || []);
        }
        
        personalCasesList = handledCases;
        filteredOrgCasesByOrg.forEach((org) => { org.cases = []; });
        toast.info("외부 직원은 담당으로 지정된 사건만 볼 수 있습니다");
      }

      const allCases = [...personalCasesList];
      filteredOrgCasesByOrg.forEach((org) => allCases.push(...org.cases));

      const uniqueCasesMap = {};
      allCases.forEach(c => uniqueCasesMap[c.id] = c);
      const uniqueCases = Object.values(uniqueCasesMap);

      const calculatedStats = calculateStats(uniqueCases);
      const calculatedRecoveryStats = calculateRecoveryStats(uniqueCases);

      const debtCategories = { normal: 0, bad: 0, interest: 0, special: 0 };
      uniqueCases.forEach((c) => {
        const category = c.debt_category || "normal";
        if (debtCategories.hasOwnProperty(category)) debtCategories[category]++;
        else debtCategories.normal++;
      });

      const debtCategoriesData = [
        { name: "정상 채권", value: debtCategories.normal, color: "#10b981" },
        { name: "악성 채권", value: debtCategories.bad, color: "#ef4444" },
        { name: "관심 채권", value: debtCategories.interest, color: "#f59e0b" },
        { name: "특수 채권", value: debtCategories.special, color: "#6366f1" },
      ].filter((c) => c.value > 0);

      if (debtCategoriesData.length === 0) {
        debtCategoriesData.push({ name: "정상 채권", value: uniqueCases.length, color: "#10b981" });
      }

      setStats({ ...calculatedStats, debtCategories: debtCategoriesData });
      setRecoveryStats(calculatedRecoveryStats);
      setPersonalCases(personalCasesList);
      setOrganizations(filteredOrgCasesByOrg);

      let initialCases = [];
      if (selectedTab === "personal") {
        initialCases = personalCasesList;
      } else if (filteredOrgCasesByOrg.length > 0) {
        const orgId = selectedOrg || filteredOrgCasesByOrg[0].orgId;
        const selectedOrgCases = filteredOrgCasesByOrg.find((org) => org.orgId === orgId)?.cases || [];
        initialCases = selectedOrgCases;
        setSelectedOrg(orgId);
        setOrganizationCases(selectedOrgCases);
      }

      filterAndPaginateCases(initialCases, searchTerm, currentPage);
      fetchMonthlyRecoveryStats(uniqueCases);

    } catch (error) {
      console.error("데이터 통신 에러:", error);
      toast.error("사건 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (cases) => {
    const totalCases = cases.length;
    const activeCases = cases.filter((c) => c.status === "active" || c.status === "in_progress").length;
    const pendingCases = cases.filter((c) => c.status === "pending").length;
    const closedCases = cases.filter((c) => c.status === "closed" || c.status === "completed").length;

    const caseTypes = {};
    cases.forEach((c) => {
      const type = c.case_type || "기타";
      caseTypes[type] = (caseTypes[type] || 0) + 1;
    });

    const casesByMonth = {};
    cases.forEach((c) => {
      if (c.created_at) {
        const date = new Date(c.created_at);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        casesByMonth[yearMonth] = (casesByMonth[yearMonth] || 0) + 1;
      }
    });

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
    const casesByTypeChart = Object.entries(caseTypes).map(([name, value]) => ({ name, value }));
    const casesByMonthChart = Object.entries(casesByMonth).map(([yearMonth, count]) => ({ yearMonth, count })).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    return { totalCases, activeCases, pendingCases, closedCases, casesByType: casesByTypeChart, casesByMonth: casesByMonthChart, avgProcessingDays };
  };

  const calculateRecoveryStats = (cases) => {
    let totalPrincipalAmount = 0;
    let totalDebtAmount = 0;
    let totalRecoveredAmount = 0;

    cases.forEach((c) => {
      totalPrincipalAmount += parseFloat(c.principal_amount || 0);
      totalDebtAmount += parseFloat(c.debt_amount || 0);
      totalRecoveredAmount += parseFloat(c.recovered_amount || 0);
    });

    const recoveryRate = totalPrincipalAmount > 0 ? Math.round((totalRecoveredAmount / totalPrincipalAmount) * 1000) / 10 : 0;
    return { totalPrincipalAmount, totalDebtAmount, totalRecoveredAmount, recoveryRate };
  };

  const fetchMonthlyRecoveryStats = async (cases) => {
    setMonthlyStatsLoading(true);
    try {
      const caseIds = cases.map((c) => c.id);
      if (caseIds.length === 0) {
        setMonthlyRecoveryStats([]);
        return;
      }

      const { data: recoveryData, error: recoveryError } = await supabase.from("test_recovery_activities").select("*").in("case_id", caseIds);
      if (recoveryError) throw recoveryError;

      const monthlyStats = {};
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyStats[yearMonth] = { yearMonth, year: d.getFullYear(), month: d.getMonth() + 1, 회수금액: 0, 회수건수: 0 };
      }

      if (recoveryData && recoveryData.length > 0) {
        recoveryData.forEach((recovery) => {
          const date = new Date(recovery.created_at);
          const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyStats[yearMonth]) {
            monthlyStats[yearMonth].회수금액 += parseFloat(recovery.amount || 0);
            monthlyStats[yearMonth].회수건수 += 1;
          }
        });
      }

      const sortedStats = Object.values(monthlyStats).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
      setMonthlyRecoveryStats(sortedStats);
    } catch (error) {
      console.error("월별 회수 통계 가져오기 실패:", error);
      setMonthlyRecoveryStats([]);
    } finally {
      setMonthlyStatsLoading(false);
    }
  };

  // 💡 알림 데이터도 안전하게 분리 로딩
  const fetchNotifications = async () => {
    if (!user) return;
    setNotificationsLoading(true);
    try {
      const { data: rawNotifs, error } = await supabase
        .from("test_individual_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rawNotifs || rawNotifs.length === 0) {
        setNotifications([]);
        setFilteredNotifications([]);
        return;
      }

      const caseIds = [...new Set(rawNotifs.map(n => n.case_id).filter(Boolean))];
      const casesMap = {};
      
      if (caseIds.length > 0) {
        const { data: casesData } = await supabase.from("test_cases").select("*").in("id", caseIds);
        (casesData || []).forEach(c => casesMap[c.id] = c);
      }

      let enrichedNotifs = rawNotifs.map(n => ({
        ...n,
        test_cases: n.case_id ? casesMap[n.case_id] : null,
      })).filter(n => n.test_cases);

      if (selectedTab === "organization" && selectedOrg) {
        const { data: orgCaseClients } = await supabase.from("test_case_clients").select("case_id").eq("client_type", "organization").eq("organization_id", selectedOrg);
        const orgCaseIds = (orgCaseClients || []).map(c => c.case_id);
        enrichedNotifs = enrichedNotifs.filter(n => orgCaseIds.includes(n.case_id));
      } else if (selectedTab === "organization") {
        const { data: orgCaseClients } = await supabase.from("test_case_clients").select("case_id").eq("client_type", "organization");
        const orgCaseIds = (orgCaseClients || []).map(c => c.case_id);
        enrichedNotifs = enrichedNotifs.filter(n => orgCaseIds.includes(n.case_id));
      }

      setNotifications(enrichedNotifs);
      setFilteredNotifications(enrichedNotifs);
    } catch (error) {
      console.error("알림 로드 실패:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">내 사건 관리</h1>
          <Tabs value={selectedTab} onValueChange={handleTabChange} defaultValue={selectedTab}>
            <TabsList className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm border-0 rounded-xl p-1">
              <TabsTrigger value="personal" className="rounded-lg py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-white">
                <User className="h-4 w-4 mr-2" />
                개인 사건 {personalCases.length > 0 && `(${personalCases.length})`}
              </TabsTrigger>
              {organizations.length > 0 && (
                <TabsTrigger value="organization" className="rounded-lg py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Building2 className="h-4 w-4 mr-2" />
                  법인/단체 사건 {organizationCases.length > 0 && `(${organizationCases.length})`}
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="personal" className="mt-0"></TabsContent>
            {organizations.length > 0 && <TabsContent value="organization" className="mt-0"></TabsContent>}
          </Tabs>
        </div>

        {selectedTab === "organization" && organizations.length > 0 && (
          <div className="mt-4 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg border-0 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">소속 법인/단체 선택</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-w-[220px] justify-between">
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
                    <DropdownMenuItem key={org.orgId} onClick={() => handleOrgChange(org.orgId)} className="flex items-center gap-2 cursor-pointer py-2">
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1 truncate">{org.orgName}</span>
                      <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{org.cases.length}</Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
          <CardHeader className="pb-0">
            <Tabs defaultValue="cases" className="w-full" key={`stats-tabs-${selectedTab}-${selectedOrg || "none"}`}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg">
                <TabsTrigger value="cases" className="flex items-center rounded-md">
                  <Briefcase className="mr-2 h-4 w-4" />
                  총의뢰 ({selectedTab === "personal" ? personalCases.length : organizationCases.length}건)
                </TabsTrigger>
                <TabsTrigger value="recovery" className="flex items-center rounded-md">
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  채권정보 ({formatCurrency(calculateRecoveryStats(selectedTab === "personal" ? personalCases : organizationCases).totalDebtAmount).replace("₩", "")})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cases" className="pt-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 mb-4">
                  <div>
                    <ClientSummary
                      userData={userData}
                      cases={selectedTab === "personal" ? personalCases : organizationCases}
                      totalDebt={calculateRecoveryStats(selectedTab === "personal" ? personalCases : selectedOrg ? organizations.find((org) => org.orgId === selectedOrg)?.cases || [] : organizationCases).totalDebtAmount}
                      loading={loading}
                      selectedTab={selectedTab}
                      selectedOrg={selectedOrg}
                      organizations={organizations}
                    />
                  </div>
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
                <div className="p-3">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FileBarChart className="h-5 w-5 mr-2 text-primary" /> 채권 회수 현황
                  </h3>
                  <StatisticsCards stats={calculateStats(selectedTab === "personal" ? personalCases : organizationCases)} recoveryStats={calculateRecoveryStats(selectedTab === "personal" ? personalCases : organizationCases)} />
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{selectedTab === "personal" ? "개인 사건 목록" : "조직 사건 목록"}</h2>
        <div className="relative w-full max-w-sm">
          <Input placeholder="사건명, 사건번호, 당사자명 검색..." className="pr-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown} />
          <Button size="sm" variant="ghost" className="absolute right-0 top-0 h-full px-3" onClick={handleSearchClick}>검색</Button>
        </div>
      </div>

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
          filterAndPaginateCases(selectedTab === "personal" ? personalCases : organizationCases, term, 1);
          setCurrentPage(1);
        }}
        totalItems={selectedTab === "personal" ? personalCases.length : organizationCases.length}
        casesPerPage={casesPerPage}
        onRefreshData={() => { fetchCases(); fetchNotifications(); }}
        emptyMessage={searchTerm ? "검색 결과가 없습니다." : selectedTab === "personal" ? "등록된 개인 사건이 없습니다." : "등록된 조직 사건이 없습니다."}
        onRowClick={(caseItem) => router.push(`/cases/${caseItem.id}`)}
      />
    </div>
  );
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
};