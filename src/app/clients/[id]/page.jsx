"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
} from "lucide-react";
import { StaffCasesTable } from "./StaffCasesTable";

function ClientSummary({ clientData, clientType, cases, totalDebt, loading }) {
  const isIndividual = clientType === "individual";

  const formatCurrency = (amount) => {
    if (!amount) return "0원";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || !clientData) {
    return (
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md h-full">
        <CardHeader className="py-2 px-4 border-b">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-center">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full mt-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md h-full">
      <CardHeader className="py-2 px-4 border-b">
        <CardTitle className="text-base flex items-center">
          {isIndividual ? (
            <User className="h-4 w-4 mr-2 text-blue-500" />
          ) : (
            <Building2 className="h-4 w-4 mr-2 text-amber-500" />
          )}
          의뢰인 프로필
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex gap-3 items-center mb-4">
          <Avatar className="h-14 w-14">
            {isIndividual ? (
              <AvatarImage
                src={clientData?.profile_image || ""}
                alt={clientData?.name || "의뢰인"}
              />
            ) : (
              <AvatarImage
                src={`https://avatar.vercel.sh/${
                  clientData?.name?.replace(/\s+/g, "") || "organization"
                }.png`}
                alt={clientData?.name || "기업"}
              />
            )}
            <AvatarFallback className={isIndividual ? "bg-blue-100" : "bg-amber-100"}>
              {isIndividual ? (
                <User className="h-6 w-6 text-blue-700" />
              ) : (
                <Building2 className="h-6 w-6 text-amber-700" />
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <h3 className="text-base font-semibold mr-2">{clientData?.name || "이름 없음"}</h3>
              <Badge variant={isIndividual ? "outline" : "secondary"} className="text-xs">
                {isIndividual ? "개인" : "기업"}
              </Badge>
            </div>
            <div className="text-sm mt-1 flex flex-col gap-1">
              {clientData?.phone && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Phone className="h-3.5 w-3.5 mr-1 text-gray-500" />
                  <span className="font-medium">{clientData.phone}</span>
                </div>
              )}
              {clientData?.email && (
                <div className="flex items-center text-gray-700 dark:text-gray-300 text-xs">
                  <Mail className="h-3.5 w-3.5 mr-1 text-gray-500" />
                  <span className="truncate max-w-[160px]">{clientData.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm border-t pt-3">
          {isIndividual && clientData?.birth_date && (
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>생년월일: {clientData.birth_date}</span>
            </div>
          )}
          {clientData?.address && (
            <div className="flex items-center mb-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span>{clientData.address}</span>
            </div>
          )}
          {!isIndividual && clientData?.representative_name && (
            <div className="flex items-center mb-2">
              <User className="h-4 w-4 mr-2 text-gray-500" />
              <span>대표: {clientData.representative_name}</span>
            </div>
          )}
          {!isIndividual && clientData?.business_number && (
            <div className="flex items-center mb-2">
              <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
              <span>법인 번호: {clientData.business_number}</span>
            </div>
          )}
          {clientData?.created_at && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>
                등록일:{" "}
                {format(new Date(clientData.created_at), "yyyy년 MM월 dd일", { locale: ko })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const { user } = useUser();
  const params = useParams();
  const searchParams = useSearchParams();

  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearchTerm = searchParams.get("search") || "";
  const initialTab = searchParams.get("status") || "all";
  const initialKcbFilter = searchParams.get("kcb") || "all";
  const initialNotification = searchParams.get("notification") || "all";
  const queryClientType = searchParams.get("client_type") || searchParams.get("type") || "individual";

  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [clientType, setClientType] = useState(queryClientType);
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [casesPerPage, setCasesPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [kcbFilter, setKcbFilter] = useState(initialKcbFilter);
  const [notificationFilter, setNotificationFilter] = useState(initialNotification);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isValidClient, setIsValidClient] = useState(true);

  const isValidUUID = (uuid) => {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  useEffect(() => {
    if (!params || !params.id) {
      setIsValidClient(false);
      toast.error("의뢰인 정보가 유효하지 않습니다");
      router.push("/clients");
      return;
    }
    if (!isValidUUID(params.id)) {
      setIsValidClient(false);
      toast.error("유효하지 않은 의뢰인 ID 형식입니다");
      router.push("/clients");
      return;
    }
    setIsValidClient(true);
  }, [params, router]);

  const updateUrlParams = ({ page, search, status, kcb, notification }) => {
    if (!params || !params.id || !isValidClient) return;
    const newParams = new URLSearchParams();
    if (page) newParams.set("page", page);
    if (search) newParams.set("search", search);
    if (status) newParams.set("status", status);
    if (kcb) newParams.set("kcb", kcb);
    if (notification) newParams.set("notification", notification);
    if (clientType) newParams.set("client_type", clientType);
    const newUrl = `/clients/${params.id}${newParams.toString() ? `?${newParams.toString()}` : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  useEffect(() => {
    if (user && isValidClient) {
      if (isInitialLoad) {
        fetchClientData();
        setIsInitialLoad(false);
      } else if (refetchTrigger > 0) {
        fetchClientData();
      }
    }
  }, [user, params, refetchTrigger, isValidClient]);

  useEffect(() => {
    if (allCases.length > 0) {
      if (isInitialLoad || (!loading && !(searchParams.get("page") !== null && Object.keys(searchParams).length === 1 && Number(searchParams.get("page")) === currentPage))) {
        filterAndPaginateData();
      } else {
        const filteredData = getFilteredData();
        paginateData(filteredData);
      }
    }
  }, [allCases, currentPage, searchTerm, activeTab, casesPerPage, kcbFilter, notificationFilter]);

  const getFilteredData = () => {
    let filteredByStatus = [...allCases];
    if (activeTab === "active") {
      filteredByStatus = allCases.filter(c => c.status === "active" || c.status === "in_progress" || c.status === "pending");
    } else if (activeTab === "completed") {
      filteredByStatus = allCases.filter(c => c.status === "completed" || c.status === "closed");
    }

    let filteredByKcb = filteredByStatus;
    if (kcbFilter === "yes") filteredByKcb = filteredByStatus.filter(c => c.debtor_kcb_checked);
    else if (kcbFilter === "no") filteredByKcb = filteredByStatus.filter(c => !c.debtor_kcb_checked);

    let filteredByNotification = filteredByKcb;
    if (notificationFilter === "yes") filteredByNotification = filteredByKcb.filter(c => c.debtor_payment_notification_sent);
    else if (notificationFilter === "no") filteredByNotification = filteredByKcb.filter(c => !c.debtor_payment_notification_sent);

    return searchTerm.trim() ? filteredByNotification.filter(c => 
      (c.creditor_name && c.creditor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.debtor_name && c.debtor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.number && c.number.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : filteredByNotification;
  };

  const paginateData = (filteredData) => {
    const totalItemCount = filteredData.length;
    setTotalCases(totalItemCount);
    const maxPages = Math.ceil(totalItemCount / casesPerPage) || 1;
    setTotalPages(maxPages);

    if (currentPage > maxPages && maxPages > 0) {
      setCurrentPage(maxPages);
      updateUrlParams({ page: maxPages, search: searchTerm, status: activeTab, kcb: kcbFilter, notification: notificationFilter });
      return;
    }

    const startIdx = (currentPage - 1) * casesPerPage;
    setFilteredCases(filteredData.slice(startIdx, startIdx + casesPerPage));
  };

  const filterAndPaginateData = () => paginateData(getFilteredData());

  const fetchClientData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const clientId = params.id;
      let individualData = null;
      let organizationData = null;

      if (clientType === "individual") {
        const { data, error } = await supabase.from("users").select("*").eq("id", clientId).single();
        if (error && error.code === "PGRST116") {
          toast.error("유효하지 않은 의뢰인입니다");
          router.push("/clients");
          return;
        }
        individualData = data;
      } else if (clientType === "organization") {
        const { data, error } = await supabase.from("test_organizations").select("*").eq("id", clientId).single();
        if (error && error.code === "PGRST116") {
          toast.error("유효하지 않은 의뢰인입니다");
          router.push("/clients");
          return;
        }
        organizationData = data;
      } else {
        const { data: indData } = await supabase.from("users").select("*").eq("id", clientId).single();
        if (indData) individualData = indData;
        const { data: orgData } = await supabase.from("test_organizations").select("*").eq("id", clientId).single();
        if (orgData) organizationData = orgData;
      }

      if (individualData) {
        setClientData({ ...individualData, phone: individualData.phone_number, type: "individual" });
        setClientType("individual");
      } else if (organizationData) {
        setClientData({
          ...organizationData,
          name: organizationData.name || "이름 없는 기업",
          phone: organizationData.phone || "",
          email: organizationData.email || "",
          address: organizationData.address || "",
          representative_name: organizationData.representative_name || "",
          business_number: organizationData.business_number || "",
          created_at: organizationData.created_at || new Date().toISOString(),
          type: "organization",
        });
        setClientType("organization");
      } else {
        toast.error("의뢰인 정보를 찾을 수 없습니다");
        router.push("/clients");
        return;
      }

      let cases = [];
      let totalDebtAmount = 0;

      if (individualData) {
        const { data: casesData } = await supabase.from("test_case_clients").select(`case_id, test_cases (id, case_type, status, created_at, filing_date, debt_category, principal_amount)`).eq("individual_id", clientId);
        if (casesData && casesData.length > 0) {
          const validCases = casesData.filter(c => c.test_cases).map(c => ({
            id: c.test_cases.id, case_type: c.test_cases.case_type, status: c.test_cases.status, created_at: c.test_cases.created_at,
            filing_date: c.test_cases.filing_date, debt_category: c.test_cases.debt_category, principal_amount: c.test_cases.principal_amount,
          }));
          cases = [...cases, ...validCases];
          totalDebtAmount = validCases.reduce((sum, c) => sum + (parseFloat(c.principal_amount) || 0), 0);
        }
      } else if (organizationData) {
        const { data: casesData } = await supabase.from("test_case_clients").select(`case_id, test_cases (id, case_type, status, created_at, filing_date, debt_category, principal_amount)`).eq("organization_id", clientId);
        if (casesData && casesData.length > 0) {
          const validCases = casesData.filter(c => c && c.test_cases).map(c => ({
            id: c.test_cases.id, case_type: c.test_cases.case_type || "기타", status: c.test_cases.status || "pending",
            created_at: c.test_cases.created_at || new Date().toISOString(), filing_date: c.test_cases.filing_date || null,
            debt_category: c.test_cases.debt_category || "기타", principal_amount: c.test_cases.principal_amount || 0,
          }));
          cases = [...cases, ...validCases];
          totalDebtAmount = validCases.reduce((sum, c) => sum + (parseFloat(c.principal_amount) || 0), 0);
        }
      }

      if (cases.length > 0) {
        const caseIds = cases.map(c => c.id).filter(id => id);
        const { data: partiesData } = await supabase.from("test_case_parties").select("*").in("case_id", caseIds);
        if (partiesData) {
          const casesWithParties = cases.map((caseItem) => {
            if (!caseItem || !caseItem.id) return null;
            const caseParties = partiesData.filter(p => p && p.case_id === caseItem.id);
            const creditor = caseParties.find(p => p && ["creditor", "plaintiff", "applicant"].includes(p.party_type));
            const debtor = caseParties.find(p => p && ["debtor", "defendant", "respondent"].includes(p.party_type));

            return {
              ...caseItem, creditor, debtor,
              creditor_name: creditor ? (creditor.entity_type === "individual" ? creditor.name : creditor.company_name) : "미지정",
              debtor_name: debtor ? (debtor.entity_type === "individual" ? debtor.name : debtor.company_name) : "미지정",
              debtor_kcb_checked: debtor ? !!debtor.kcb_checked : false,
              debtor_payment_notification_sent: debtor ? !!debtor.payment_notification_sent : false,
            };
          }).filter(item => item !== null);
          setAllCases(casesWithParties);
        } else {
          setAllCases(cases);
        }
        setTotalDebt(totalDebtAmount);
      } else {
        setAllCases([]);
        setTotalDebt(0);
      }
    } catch (error) {
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => { setSearchTerm(value); setCurrentPage(1); updateUrlParams({ page: 1, search: value, status: activeTab, kcb: kcbFilter, notification: notificationFilter }); };
  const handleTabChange = (tab) => { setActiveTab(tab); setCurrentPage(1); updateUrlParams({ page: 1, search: searchTerm, status: tab, kcb: kcbFilter, notification: notificationFilter }); };
  const handlePageChange = (page) => { if (page !== currentPage) { setCurrentPage(page); updateUrlParams({ page, search: searchTerm, status: activeTab, kcb: kcbFilter, notification: notificationFilter }); } };
  const handlePageSizeChange = (size) => { setCasesPerPage(Number(size)); setCurrentPage(1); updateUrlParams({ page: 1, search: searchTerm, status: activeTab, kcb: kcbFilter, notification: notificationFilter }); };
  const handleRefreshData = () => { setRefetchTrigger(prev => prev + 1); };
  const handleKcbFilterChange = (value) => { setKcbFilter(value); setCurrentPage(1); updateUrlParams({ page: 1, search: searchTerm, status: activeTab, kcb: value, notification: notificationFilter }); };
  const handleNotificationFilterChange = (value) => { setNotificationFilter(value); setCurrentPage(1); updateUrlParams({ page: 1, search: searchTerm, status: activeTab, kcb: kcbFilter, notification: value }); };

  const formatCurrency = (amount) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount || 0);

  if (loading) {
    return (
      <div className="mx-auto py-8 max-w-5xl px-4 md:px-6 w-full">
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/clients")}><ArrowLeft className="mr-2 h-4 w-4" /> 목록으로</Button>
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-48 w-full mb-8" />
        <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-80 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-8 max-w-5xl px-4 md:px-6 w-full">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/clients")}><ArrowLeft className="mr-2 h-4 w-4" /> 목록으로</Button>
        <h1 className="text-2xl font-bold">의뢰인 정보</h1>
      </div>
      <div className="mb-8">
        <ClientSummary clientData={clientData} clientType={clientType} cases={filteredCases} totalDebt={totalDebt} loading={loading} />
      </div>
      <StaffCasesTable
        cases={filteredCases} personalCases={allCases} organizationCases={[]} selectedTab="personal" statusFilter={activeTab}
        searchTerm={searchTerm} onSearchChange={handleSearch} onStatusChange={handleTabChange} currentPage={currentPage}
        totalPages={totalPages} totalItems={totalCases} casesPerPage={casesPerPage} onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange} formatCurrency={formatCurrency} onRefreshData={handleRefreshData}
        kcbFilter={kcbFilter} notificationFilter={notificationFilter} onKcbFilterChange={handleKcbFilterChange} onNotificationFilterChange={handleNotificationFilterChange}
      />
    </div>
  );
}