"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getStatusById } from "@/utils/constants";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Search,
  Clock,
  CheckCircle2,
  FileText,
  ChevronRight,
  CircleDollarSign,
  BarChart3,
  PieChart,
} from "lucide-react";
import { StaffCasesTable } from "./StaffCasesTable";

// ClientSummary 컴포넌트를 새로운 디자인으로 수정
function ClientSummary({ clientData, clientType, cases, totalDebt, loading }) {
  const isIndividual = clientType === "individual";

  // 금액 포맷
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

        {/* 추가 정보 */}
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

  // URL 파라미터 읽기
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearchTerm = searchParams.get("search") || "";
  const initialTab = searchParams.get("status") || "all";
  const initialKcbFilter = searchParams.get("kcb") || "all";
  const initialNotification = searchParams.get("notification") || "all";
  const queryClientType =
    searchParams.get("client_type") || searchParams.get("type") || "individual";

  // 상태 변수
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

  // 페이지 변경만 감지하는 효과를 분리
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 의뢰인 ID 유효성 상태 추가
  const [isValidClient, setIsValidClient] = useState(true);

  // 유효한 UUID 체크 함수
  const isValidUUID = (uuid) => {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // 초기 로드 시 의뢰인 ID 유효성 검사
  useEffect(() => {
    if (!params || !params.id) {
      console.error("의뢰인 ID가 제공되지 않았습니다");
      setIsValidClient(false);
      toast.error("의뢰인 정보가 유효하지 않습니다");
      router.push("/clients");
      return;
    }

    if (!isValidUUID(params.id)) {
      console.error(`유효하지 않은 의뢰인 ID 형식: ${params.id}`);
      setIsValidClient(false);
      toast.error("유효하지 않은 의뢰인 ID 형식입니다");
      router.push("/clients");
      return;
    }

    setIsValidClient(true);
  }, [params, router]);

  // URL 파라미터 업데이트 함수 (의뢰인 데이터 재조회 없이)
  const updateUrlParams = ({ page, search, status, kcb, notification }) => {
    if (!params || !params.id) {
      console.error("updateUrlParams: 의뢰인 ID가 없습니다");
      return;
    }

    if (!isValidClient) {
      console.error("updateUrlParams: 유효하지 않은 의뢰인 ID입니다");
      return;
    }

    const newParams = new URLSearchParams();
    if (page) newParams.set("page", page);
    if (search) newParams.set("search", search);
    if (status) newParams.set("status", status);
    if (kcb) newParams.set("kcb", kcb);
    if (notification) newParams.set("notification", notification);
    if (clientType) newParams.set("client_type", clientType);

    // URL 업데이트 (의뢰인 ID가 포함된 경로)
    const newUrl = `/clients/${params.id}${newParams.toString() ? `?${newParams.toString()}` : ""}`;

    // 히스토리만 업데이트
    window.history.pushState({}, "", newUrl);
  };

  // 데이터 조회 및 필터링
  useEffect(() => {
    if (user && isValidClient) {
      // 초기 로드인 경우에만 로딩 상태를 true로 설정
      if (isInitialLoad) {
        fetchClientData();
        setIsInitialLoad(false);
      } else {
        // refetchTrigger가 변경된 경우에만 fetchClientData 실행
        if (refetchTrigger > 0) {
          fetchClientData();
        }
      }
    }
  }, [user, params, refetchTrigger, isValidClient]);

  // 검색어나 필터, 페이지가 변경될 때 클라이언트 측에서 데이터 필터링
  useEffect(() => {
    if (allCases.length > 0) {
      // 페이지 변경이 아닌 다른 필터링 요소가 변경된 경우에만 전체 필터링 수행
      if (isInitialLoad) {
        filterAndPaginateData();
      } else if (
        !loading &&
        !(
          searchParams.get("page") !== null &&
          Object.keys(searchParams).length === 1 &&
          Number(searchParams.get("page")) === currentPage
        )
      ) {
        filterAndPaginateData();
      } else {
        // 페이지만 변경된 경우 간소화된 페이지네이션 수행
        const filteredData = getFilteredData();
        paginateData(filteredData);
      }
    }
  }, [allCases, currentPage, searchTerm, activeTab, casesPerPage, kcbFilter, notificationFilter]);

  // 필터링된 데이터 가져오기
  const getFilteredData = () => {
    // 상태 필터 적용
    let filteredByStatus = [...allCases];
    if (activeTab === "active") {
      filteredByStatus = allCases.filter(
        (caseItem) =>
          caseItem.status === "active" ||
          caseItem.status === "in_progress" ||
          caseItem.status === "pending"
      );
    } else if (activeTab === "completed") {
      filteredByStatus = allCases.filter(
        (caseItem) => caseItem.status === "completed" || caseItem.status === "closed"
      );
    }

    // KCB 조회 필터 적용
    let filteredByKcb = filteredByStatus;
    if (kcbFilter === "yes") {
      filteredByKcb = filteredByStatus.filter((caseItem) => caseItem.debtor_kcb_checked);
    } else if (kcbFilter === "no") {
      filteredByKcb = filteredByStatus.filter((caseItem) => !caseItem.debtor_kcb_checked);
    }

    // 납부안내 발송 필터 적용
    let filteredByNotification = filteredByKcb;
    if (notificationFilter === "yes") {
      filteredByNotification = filteredByKcb.filter(
        (caseItem) => caseItem.debtor_payment_notification_sent
      );
    } else if (notificationFilter === "no") {
      filteredByNotification = filteredByKcb.filter(
        (caseItem) => !caseItem.debtor_payment_notification_sent
      );
    }

    // 검색어 필터링 적용
    const filteredBySearch = searchTerm.trim()
      ? filteredByNotification.filter(
          (caseItem) =>
            (caseItem.creditor_name &&
              caseItem.creditor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (caseItem.debtor_name &&
              caseItem.debtor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (caseItem.title && caseItem.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (caseItem.number && caseItem.number.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : filteredByNotification;

    return filteredBySearch;
  };

  // 데이터 페이지네이션 처리
  const paginateData = (filteredData) => {
    // 총 아이템 수 설정
    const totalItemCount = filteredData.length;
    setTotalCases(totalItemCount);

    // 총 페이지 수 계산
    const maxPages = Math.ceil(totalItemCount / casesPerPage) || 1;
    setTotalPages(maxPages);

    console.log("필터링된 사건 수:", totalItemCount, "페이지 수:", maxPages);

    // 현재 페이지가 최대 페이지를 초과하는 경우 조정
    if (currentPage > maxPages && maxPages > 0) {
      console.log("페이지 번호 조정:", currentPage, "->", maxPages);
      setCurrentPage(maxPages);
      updateUrlParams({
        page: maxPages,
        search: searchTerm,
        status: activeTab,
        kcb: kcbFilter,
        notification: notificationFilter,
      });
      return; // 페이지 번호가 변경되었으므로 useEffect에 의해 다시 호출됨
    }

    // 현재 페이지에 필요한 데이터만 추출
    const startIdx = (currentPage - 1) * casesPerPage;
    const endIdx = Math.min(startIdx + casesPerPage, filteredData.length);
    const paginatedCases = filteredData.slice(startIdx, endIdx);

    console.log("현재 페이지 데이터 수:", paginatedCases.length);

    setFilteredCases(paginatedCases);
  };

  // 클라이언트 측에서 데이터 필터링 및 페이지네이션 처리
  const filterAndPaginateData = () => {
    console.log(
      "클라이언트 측 필터링 - 페이지:",
      currentPage,
      "검색어:",
      searchTerm,
      "상태:",
      activeTab,
      "KCB:",
      kcbFilter,
      "납부안내:",
      notificationFilter
    );

    const filteredData = getFilteredData();
    paginateData(filteredData);
  };

  const fetchClientData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 의뢰인 ID 가져오기
      const clientId = params.id;
      console.log("의뢰인 조회 시작:", clientId, "타입:", clientType);

      // 의뢰인 타입 확인 로그
      console.log("사용할 의뢰인 타입:", clientType);

      // 개인 의뢰인 / 조직 의뢰인을 미리 알고 있다면 해당 테이블만 조회하여 효율성 향상
      let individualData = null;
      let organizationData = null;

      // URL에서 타입 정보가 있으면 해당 타입만 조회
      if (clientType === "individual") {
        try {
          // 개인 의뢰인 정보만 조회
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", clientId)
            .single();

          if (error) {
            console.error("개인 의뢰인 조회 실패:", error);

            if (error.code === "PGRST116") {
              toast.error("유효하지 않은 의뢰인입니다", {
                description: "개인 의뢰인 정보를 찾을 수 없습니다.",
              });
              router.push("/clients");
              return;
            }
          } else {
            console.log("개인 의뢰인 조회 성공:", data?.id);
            individualData = data;
          }
        } catch (indError) {
          console.error("개인 의뢰인 조회 중 예외 발생:", indError);
          toast.error("개인 의뢰인 조회 중 오류가 발생했습니다");
          router.push("/clients");
          return;
        }
      } else if (clientType === "organization") {
        try {
          // 조직 의뢰인 정보만 조회
          const { data, error } = await supabase
            .from("test_organizations")
            .select("*")
            .eq("id", clientId)
            .single();

          if (error) {
            console.error("조직 의뢰인 조회 실패:", error);

            if (error.code === "PGRST116") {
              toast.error("유효하지 않은 의뢰인입니다", {
                description: "조직 의뢰인 정보를 찾을 수 없습니다.",
              });
              router.push("/clients");
              return;
            }
          } else if (data) {
            console.log("조직 의뢰인 조회 성공:", data?.id);
            organizationData = data;
          } else {
            console.error("조직 의뢰인 데이터가 없습니다");
            toast.error("조직 의뢰인 데이터가 없습니다");
            router.push("/clients");
            return;
          }
        } catch (orgError) {
          console.error("조직 의뢰인 조회 중 예외 발생:", orgError);
          toast.error("조직 의뢰인 조회 중 오류가 발생했습니다");
          router.push("/clients");
          return;
        }
      } else {
        // 타입 정보가 없거나 유효하지 않은 경우 둘 다 조회 (기존 코드 유지)
        console.log("의뢰인 타입이 명확하지 않아 두 테이블 모두 조회합니다");

        const { data: indData, error: indError } = await supabase
          .from("users")
          .select("*")
          .eq("id", clientId)
          .single();

        if (indError) {
          console.log("개인 의뢰인 조회 실패:", indError.code);
          if (indError.code !== "PGRST116") {
            console.error("개인 의뢰인 조회 중 예상치 못한 오류:", indError);
          }
        } else {
          console.log("개인 의뢰인 조회 성공:", indData?.id);
          individualData = indData;
        }

        const { data: orgData, error: orgError } = await supabase
          .from("test_organizations")
          .select("*")
          .eq("id", clientId)
          .single();

        if (orgError) {
          console.log("조직 의뢰인 조회 실패:", orgError.code);
          if (orgError.code !== "PGRST116") {
            console.error("조직 의뢰인 조회 중 예상치 못한 오류:", orgError);
          }
        } else {
          console.log("조직 의뢰인 조회 성공:", orgData?.id);
          organizationData = orgData;
        }
      }

      // 개인 또는 조직 데이터 설정
      if (individualData) {
        setClientData({
          ...individualData,
          phone: individualData.phone_number, // users 테이블은 phone_number 필드 사용
          type: "individual",
        });
        setClientType("individual");
      } else if (organizationData) {
        try {
          // 안전하게 조직 데이터 설정
          setClientData({
            ...organizationData,
            // 필수 필드가 없는 경우 기본값 설정
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
        } catch (error) {
          console.error("조직 의뢰인 데이터 설정 중 오류:", error);
          toast.error("조직 의뢰인 데이터 처리 중 오류가 발생했습니다");
          router.push("/clients");
          return;
        }
      } else {
        console.error("의뢰인 정보를 찾을 수 없음");
        toast.error("의뢰인 정보를 찾을 수 없습니다", {
          description: "유효하지 않은 의뢰인 ID입니다.",
        });
        router.push("/clients");
        return;
      }

      // 의뢰인의 사건 조회
      let cases = [];
      let totalDebtAmount = 0;

      if (individualData) {
        // 개인 의뢰인의 사건 조회
        const { data: casesData, error: casesError } = await supabase
          .from("test_case_clients")
          .select(
            `
            case_id,
            test_cases (
              id, 
              case_type,
              status, 
              created_at,
              filing_date,
              debt_category,
              principal_amount
            )
          `
          )
          .eq("individual_id", clientId);

        if (casesError) {
          console.error("개인 의뢰인 사건 조회 실패:", casesError);
        } else if (casesData && casesData.length > 0) {
          console.log(`개인 의뢰인 사건 ${casesData.length}개 조회 성공`);

          // 유효한 사건 데이터만 필터링
          const validCases = casesData
            .filter((c) => c.test_cases)
            .map((c) => ({
              id: c.test_cases.id,
              case_type: c.test_cases.case_type,
              status: c.test_cases.status,
              created_at: c.test_cases.created_at,
              filing_date: c.test_cases.filing_date,
              debt_category: c.test_cases.debt_category,
              principal_amount: c.test_cases.principal_amount,
            }));

          // 사건 배열에 추가
          cases = [...cases, ...validCases];

          // 총 채권액 계산
          totalDebtAmount = validCases.reduce(
            (sum, c) => sum + (parseFloat(c.principal_amount) || 0),
            0
          );
        }
      } else if (organizationData) {
        // 조직 의뢰인의 사건 조회
        try {
          if (!clientId || !isValidUUID(clientId)) {
            console.error("조직 의뢰인 사건 조회 실패: 유효하지 않은 의뢰인 ID");
            toast.error("유효하지 않은 의뢰인 ID입니다");
            return;
          }

          console.log("조직 의뢰인의 사건 조회 시작:", clientId);

          // 의뢰인 ID가 제대로 설정되어 있는지 로그 출력
          console.log("조직 의뢰인 ID 확인:", {
            id: clientId,
            isValid: isValidUUID(clientId),
            organizationId: organizationData.id,
          });

          // 조직 의뢰인의 사건 조회 - organization_id 필드를 사용하여 조회
          const { data: casesData, error: casesError } = await supabase
            .from("test_case_clients")
            .select(
              `
              case_id,
              test_cases (
                id, 
                case_type,
                status, 
                created_at,
                filing_date,
                debt_category,
                principal_amount
              )
            `
            )
            .eq("organization_id", clientId);

          if (casesError) {
            console.error("조직 의뢰인 사건 조회 실패:", casesError);
            toast.error("조직 의뢰인의 사건 조회 중 오류가 발생했습니다");
            // 테이블 구조 또는 관계 확인을 위한 로그
            console.log("test_case_clients 테이블 구조 확인 필요:", {
              error: casesError,
              clientId: clientId,
              query: "organization_id",
            });
          } else if (casesData && casesData.length > 0) {
            console.log(`조직 의뢰인 사건 ${casesData.length}개 조회 성공`);

            // 유효한 사건 데이터만 필터링
            const validCases = casesData
              .filter((c) => c && c.test_cases) // null 체크 추가
              .map((c) => ({
                id: c.test_cases.id,
                case_type: c.test_cases.case_type || "기타",
                status: c.test_cases.status || "pending",
                created_at: c.test_cases.created_at || new Date().toISOString(),
                filing_date: c.test_cases.filing_date || null,
                debt_category: c.test_cases.debt_category || "기타",
                principal_amount: c.test_cases.principal_amount || 0, // 값이 없으면 0 기본값 설정
              }));

            // 사건 배열에 추가
            cases = [...cases, ...validCases];

            // 총 채권액 계산
            totalDebtAmount = validCases.reduce(
              (sum, c) => sum + (parseFloat(c.principal_amount) || 0),
              0
            );
          } else {
            console.log("조직 의뢰인의 사건이 없습니다");
          }
        } catch (caseError) {
          console.error("조직 의뢰인 사건 조회 중 예외 발생:", caseError);
          toast.error("조직 의뢰인의 사건 데이터 처리 중 오류가 발생했습니다");
        }
      }

      // 조회된 사건이 있으면 각 사건의 당사자 정보 추가
      if (cases.length > 0) {
        try {
          console.log(`${cases.length}개 사건에 대한 당사자 정보 조회 시작`);
          const caseIds = cases.map((c) => c.id).filter((id) => id); // undefined/null 필터링

          if (caseIds.length === 0) {
            console.warn("유효한 사건 ID가 없습니다");
            setAllCases([]);
            setTotalDebt(totalDebtAmount);
            return;
          }

          // 당사자 정보 조회
          const { data: partiesData, error: partiesError } = await supabase
            .from("test_case_parties")
            .select("*")
            .in("case_id", caseIds);

          if (partiesError) {
            console.error("당사자 정보 조회 실패:", partiesError);
            toast.error("당사자 정보 조회 중 오류가 발생했습니다");
            // 에러 발생해도 기본 사건 정보는 표시
            setAllCases(cases);
            setTotalDebt(totalDebtAmount);
          } else if (partiesData) {
            console.log(`${partiesData.length}개의 당사자 정보 조회 성공`);

            // 각 사건의 당사자 정보 추가
            const casesWithParties = cases
              .map((caseItem) => {
                // caseItem이 null이거나 undefined인 경우 처리
                if (!caseItem || !caseItem.id) {
                  console.warn("유효하지 않은 사건 항목:", caseItem);
                  return null;
                }

                const caseParties = partiesData.filter((p) => p && p.case_id === caseItem.id);
                const creditor = caseParties.find(
                  (p) => p && ["creditor", "plaintiff", "applicant"].includes(p.party_type)
                );
                const debtor = caseParties.find(
                  (p) => p && ["debtor", "defendant", "respondent"].includes(p.party_type)
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

                return {
                  ...caseItem,
                  creditor,
                  debtor,
                  creditor_name: creditorName,
                  debtor_name: debtorName,
                  // KCB 및 납부안내 정보 추가 (null 체크 추가)
                  debtor_kcb_checked: debtor ? !!debtor.kcb_checked : false,
                  debtor_payment_notification_sent: debtor
                    ? !!debtor.payment_notification_sent
                    : false,
                };
              })
              .filter((item) => item !== null); // null 항목 제거

            // 강화된 사건 데이터 설정
            console.log("사건 데이터 설정 완료", casesWithParties.length, "개");
            setAllCases(casesWithParties);
            setTotalDebt(totalDebtAmount);
          }
        } catch (partiesError) {
          console.error("당사자 정보 처리 중 예외 발생:", partiesError);
          toast.error("당사자 정보 처리 중 오류가 발생했습니다");
          // 에러가 발생해도 기본 사건 정보는 표시
          setAllCases(cases);
          setTotalDebt(totalDebtAmount);
        }
      } else {
        // 사건이 없는 경우
        console.log("조회된 사건이 없음");
        setAllCases([]);
        setTotalDebt(0);
      }

      // 초기 필터링 수행
      // filterAndPaginateData();
    } catch (error) {
      console.error("의뢰인 데이터 조회 실패:", error);
      toast.error("데이터 로드 실패", {
        description: "의뢰인 정보를 불러오는 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    updateUrlParams({
      page: 1,
      search: value,
      status: activeTab,
      kcb: kcbFilter,
      notification: notificationFilter,
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // 탭 변경 시 첫 페이지로 이동
    updateUrlParams({
      page: 1,
      search: searchTerm,
      status: tab,
      kcb: kcbFilter,
      notification: notificationFilter,
    });
  };

  const handlePageChange = (page) => {
    console.log("페이지 변경:", page, "현재 페이지:", currentPage);

    if (page !== currentPage) {
      setCurrentPage(page);
      // URL 파라미터 업데이트 (의뢰인 데이터 재조회 없이)
      updateUrlParams({
        page,
        search: searchTerm,
        status: activeTab,
        kcb: kcbFilter,
        notification: notificationFilter,
      });
    }
  };

  // 페이지 크기 변경 핸들러 추가
  const handlePageSizeChange = (size) => {
    setCasesPerPage(Number(size));
    setCurrentPage(1);
    updateUrlParams({
      page: 1,
      search: searchTerm,
      status: activeTab,
      kcb: kcbFilter,
      notification: notificationFilter,
    });
  };

  // 데이터 새로고침 핸들러 (모달에서 사용)
  const handleRefreshData = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  // 금액 포맷
  const formatCurrency = (amount) => {
    if (!amount) return "0원";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // KCB 필터 변경 핸들러 추가
  const handleKcbFilterChange = (value) => {
    setKcbFilter(value);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    updateUrlParams({
      page: 1,
      search: searchTerm,
      status: activeTab,
      kcb: value,
      notification: notificationFilter,
    });
  };

  // 납부안내 필터 변경 핸들러 추가
  const handleNotificationFilterChange = (value) => {
    setNotificationFilter(value);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    updateUrlParams({
      page: 1,
      search: searchTerm,
      status: activeTab,
      kcb: kcbFilter,
      notification: value,
    });
  };

  // 초기 로드 시 로그 추가
  useEffect(() => {
    console.log("초기 의뢰인 타입 설정:", {
      urlType: searchParams.get("client_type") || searchParams.get("type"),
      queryClientType,
      clientType,
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto py-8 max-w-5xl px-4 md:px-6 w-full">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mr-4"
            onClick={() => router.push("/clients")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로
          </Button>
          <Skeleton className="h-10 w-64" />
        </div>

        <Skeleton className="h-48 w-full mb-8" />

        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-8 max-w-5xl px-4 md:px-6 w-full">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로
        </Button>
        <h1 className="text-2xl font-bold">의뢰인 정보</h1>
      </div>

      {/* 프로필 카드 */}
      <div className="mb-8">
        <ClientSummary
          clientData={clientData}
          clientType={clientType}
          cases={filteredCases}
          totalDebt={totalDebt}
          loading={loading}
        />
      </div>

      <StaffCasesTable
        cases={filteredCases}
        personalCases={allCases}
        organizationCases={[]}
        selectedTab="personal"
        statusFilter={activeTab}
        searchTerm={searchTerm}
        onSearchChange={handleSearch}
        onStatusChange={handleTabChange}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCases}
        casesPerPage={casesPerPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        formatCurrency={formatCurrency}
        onRefreshData={handleRefreshData}
        // KCB 및 납부안내 필터 props 추가
        kcbFilter={kcbFilter}
        notificationFilter={notificationFilter}
        onKcbFilterChange={handleKcbFilterChange}
        onNotificationFilterChange={handleNotificationFilterChange}
      />
    </div>
  );
}
