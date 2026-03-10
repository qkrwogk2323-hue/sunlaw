"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabase";
import { getStatusByValue, getCaseTypeByValue, getDebtCategoryByValue } from "@/utils/constants";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Briefcase,
  ChevronDown,
  Search,
  GanttChartSquare,
  Timer,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Scale,
  CircleDollarSign,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  FileSpreadsheet,
  ListFilter,
  Bell,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// LawsuitManager와 RecoveryActivities 컴포넌트 가져오기
const LawsuitManager = dynamic(() => import("@/app/cases/[id]/components/LawsuitManager"), {
  loading: () => <p>소송 정보를 불러오는 중...</p>,
  ssr: false,
});

const RecoveryActivities = dynamic(() => import("@/app/cases/[id]/components/RecoveryActivities"), {
  loading: () => <p>채권 정보를 불러오는 중...</p>,
  ssr: false,
});

export function CasesTable({
  cases = [],
  personalCases = [],
  organizationCases = [],
  selectedTab = "personal",
  searchTerm = "",
  onSearchChange,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  casesPerPage = 10,
  onPageChange,
  onPageSizeChange,
  formatCurrency,
  notifications = [],
  onRefreshData,
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredCases, setFilteredCases] = useState(cases);
  const [modalRefreshNeeded, setModalRefreshNeeded] = useState(false);
  const [inputSearchTerm, setInputSearchTerm] = useState(searchTerm);

  // 알림 관련 상태 추가
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedCaseNotifications, setSelectedCaseNotifications] = useState([]);
  const [selectedCaseForNotification, setSelectedCaseForNotification] = useState(null);
  const [updatingNotification, setUpdatingNotification] = useState(false);

  // 디버깅: 전달된 props 확인
  useEffect(() => {
    console.log("CasesTable props:", {
      casesLength: cases.length,
      personalCasesLength: personalCases.length,
      organizationCasesLength: organizationCases.length,
      searchTerm,
      currentPage,
      totalPages,
      totalItems,
      onPageChange: !!onPageChange,
      casesPerPage,
      statusFilter,
    });
  }, [
    cases,
    personalCases,
    organizationCases,
    searchTerm,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    casesPerPage,
    statusFilter,
  ]);

  // cases 배열이 변경되면 바로 적용
  useEffect(() => {
    // 각 렌더링마다 cases에 따라 상태 필터 적용
    let filtered = [...cases]; // 현재 페이지 데이터 복사

    // 상태 필터가 all이 아닌 경우에만 필터링 (검색 결과에서도 적용)
    if (statusFilter !== "all") {
      filtered = filtered.filter((caseItem) => {
        if (statusFilter === "active") {
          return (
            caseItem.status === "active" ||
            caseItem.status === "in_progress" ||
            caseItem.status === "pending"
          );
        } else if (statusFilter === "completed") {
          return caseItem.status === "completed" || caseItem.status === "closed";
        }
        return true;
      });
    }

    setFilteredCases(filtered);
  }, [cases, statusFilter]);

  // 입력 값이 변경될 때마다 로컬 상태만 업데이트
  useEffect(() => {
    setInputSearchTerm(searchTerm);
  }, [searchTerm]);

  // 상태에 따른 배지 색상
  const getCaseStatusBadge = (status) => {
    // 상태값이 없는 경우 기본값 처리
    if (!status) {
      return (
        <Badge className="border bg-gray-100 text-gray-700 border-gray-200 text-xs whitespace-nowrap min-w-[65px] flex justify-center py-1">
          <AlertCircle className="mr-1 h-3 w-3" />알 수 없음
        </Badge>
      );
    }
    // 상태 정보 가져오기
    const statusInfo = getStatusByValue(status);

    // 아이콘 컴포넌트 설정
    let IconComponent = null;
    switch (statusInfo.icon) {
      case "Timer":
        IconComponent = Timer;
        break;
      case "Hourglass":
        IconComponent = Hourglass;
        break;
      case "CheckCircle2":
        IconComponent = CheckCircle2;
        break;
      case "AlertCircle":
      default:
        IconComponent = AlertCircle;
        break;
    }

    return (
      <Badge
        className={cn(
          "text-xs whitespace-nowrap min-w-[65px] flex justify-center py-1 border",
          statusInfo.className
        )}
      >
        <IconComponent className="mr-1 h-3 w-3" />
        {statusInfo.name}
      </Badge>
    );
  };

  const [showLawsuitModal, setShowLawsuitModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedCaseTitle, setSelectedCaseTitle] = useState("");

  // 메뉴 버튼 클릭 핸들러 함수
  const handleMenuAction = (action, caseItem, e) => {
    e.stopPropagation(); // 이벤트 버블링 방지

    switch (action) {
      case "detail":
        router.push(`/cases/${caseItem.id}`);
        break;
      case "lawsuit":
        setSelectedCaseId(caseItem.id);
        setSelectedCaseTitle(`${caseItem.creditor_name} vs ${caseItem.debtor_name}`);
        setShowLawsuitModal(true);
        break;
      case "recovery":
        setSelectedCaseId(caseItem.id);
        setSelectedCaseTitle(`${caseItem.creditor_name} vs ${caseItem.debtor_name}`);
        setShowRecoveryModal(true);
        break;
      default:
        break;
    }
  };

  // 활성 상태, 완료된 사건, 전체 사건 갯수 계산
  const allCases = selectedTab === "personal" ? personalCases : organizationCases;

  const activeCasesCount = allCases.filter(
    (c) => c.status === "active" || c.status === "in_progress" || c.status === "pending"
  ).length;

  const completedCasesCount = allCases.filter(
    (c) => c.status === "completed" || c.status === "closed"
  ).length;

  // 알림 버튼 클릭 핸들러 함수 추가
  const handleNotificationClick = (e, caseItem) => {
    e.stopPropagation(); // 이벤트 버블링 방지

    // 해당 사건의 알림만 필터링
    const caseNotifications = notifications.filter(
      (notification) => notification.case_id === caseItem.id
    );

    setSelectedCaseForNotification(caseItem);
    setSelectedCaseNotifications(caseNotifications);
    setShowNotificationModal(true);
  };

  // 사건별 읽지 않은 알림 개수 계산 함수
  const getUnreadNotificationCount = (caseId) => {
    return notifications.filter(
      (notification) => notification.case_id === caseId && !notification.is_read
    ).length;
  };

  // 알림 유형에 따른 아이콘 반환
  const getNotificationIcon = (type) => {
    switch (type) {
      case "lawsuit":
      case "lawsuit_update":
        return <Scale className="h-4 w-4 text-purple-500" />;
      case "recovery_activity":
        return <CircleDollarSign className="h-4 w-4 text-green-500" />;
      case "deadline":
        return <Timer className="h-4 w-4 text-red-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // 알림 읽음 표시 함수
  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation();
    setUpdatingNotification(true);

    try {
      // 알림 읽음 상태 업데이트
      const { error } = await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setSelectedCaseNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif))
      );

      console.log("알림이 읽음으로 표시되었습니다:", notificationId);
    } catch (error) {
      console.error("알림 상태 업데이트 실패:", error);
    } finally {
      setUpdatingNotification(false);
    }
  };

  // 모든 알림 읽음 표시 함수
  const handleMarkAllAsRead = async () => {
    if (!selectedCaseForNotification) return;
    setUpdatingNotification(true);

    try {
      // 알림 ID 목록 생성
      const notificationIds = selectedCaseNotifications.filter((n) => !n.is_read).map((n) => n.id);

      if (notificationIds.length === 0) return;

      // 모든 알림 읽음 상태 업데이트
      const { error } = await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .in("id", notificationIds);

      if (error) throw error;

      // 로컬 상태 업데이트
      setSelectedCaseNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));

      console.log("모든 알림이 읽음으로 표시되었습니다");
    } catch (error) {
      console.error("알림 상태 업데이트 실패:", error);
    } finally {
      setUpdatingNotification(false);
    }
  };

  // 모달 닫힐 때 데이터 새로고침 처리
  const handleModalClose = (refreshNeeded = false) => {
    if (refreshNeeded || modalRefreshNeeded) {
      onRefreshData && onRefreshData();
      setModalRefreshNeeded(false);
    }
  };

  // 데이터 변경 감지
  const handleDataChange = () => {
    setModalRefreshNeeded(true);
  };

  // 검색 핸들러 - 엔터 키를 누르거나 검색 버튼을 클릭할 때 호출
  const handleSearch = () => {
    if (onSearchChange) {
      onSearchChange(inputSearchTerm);
    }
  };

  // 엔터 키를 누를 때 검색 실행
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-primary" /> 사건 목록
                </CardTitle>
                <CardDescription>
                  총 {totalItems}건 중{" "}
                  {statusFilter !== "all" ? filteredCases.length : cases.length}건 표시
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-auto flex items-center">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <Input
                  placeholder="당사자 이름으로 검색"
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 w-full sm:w-[200px]"
                />
                <Button variant="default" size="sm" onClick={handleSearch} className="ml-2">
                  검색
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="flex items-center gap-1 h-8 px-2 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <ListFilter className="h-4 w-4 sm:mr-1 hidden sm:inline" />
                전체
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className="flex items-center gap-1 h-8 px-2 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Timer className="h-4 w-4 sm:mr-1 hidden sm:inline" />
                진행중
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
                className="flex items-center gap-1 h-8 px-2 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <CheckCircle2 className="h-4 w-4 sm:mr-1 hidden sm:inline" />
                완료
              </Button>

              {/* 검색어 표시 및 취소 배지 추가 */}
              {searchTerm && (
                <div className="flex-1 sm:flex-none flex justify-end">
                  <Badge
                    variant="secondary"
                    className="ml-auto flex items-center gap-1 px-2 py-1 h-8"
                  >
                    <span>검색: {searchTerm}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 ml-1 hover:bg-gray-200 rounded-full"
                      onClick={() => {
                        setInputSearchTerm("");
                        onSearchChange && onSearchChange("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col items-center">
          <div className="overflow-x-auto w-full max-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-center">회수율</TableHead>
                  <TableHead className="text-center">채권자</TableHead>
                  <TableHead className="text-center">채무자</TableHead>
                  <TableHead className="text-center">원금</TableHead>
                  <TableHead className="text-center">회수금</TableHead>
                  <TableHead className="text-center">알림</TableHead>
                  <TableHead className="text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? (
                        <div className="flex flex-col items-center">
                          <Search className="h-8 w-8 mb-2 text-gray-300 dark:text-gray-600" />
                          <p>검색 결과가 없습니다.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Briefcase className="h-8 w-8 mb-2 text-gray-300 dark:text-gray-600" />
                          <p>등록된 사건이 없습니다.</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((caseItem) => (
                    <TableRow
                      key={caseItem.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/cases/${caseItem.id}`)}
                    >
                      <TableCell className="flex justify-center items-center my-3">
                        {getCaseStatusBadge(caseItem.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const recoveryRate =
                            caseItem.principal_amount && caseItem.recovered_amount
                              ? Math.round(
                                  (caseItem.recovered_amount / caseItem.principal_amount) * 100
                                )
                              : 0;

                          // 회수율에 따른 배지 색상 결정
                          let badgeClassName =
                            "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
                          let progressColor = "bg-gray-200 dark:bg-gray-700";

                          if (recoveryRate > 0) {
                            badgeClassName =
                              "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
                            progressColor = "bg-blue-500 dark:bg-blue-600";
                          }
                          if (recoveryRate >= 50) {
                            badgeClassName =
                              "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
                            progressColor = "bg-amber-500 dark:bg-amber-600";
                          }
                          if (recoveryRate >= 80) {
                            badgeClassName =
                              "bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
                            progressColor = "bg-green-500 dark:bg-green-600";
                          }

                          return (
                            <div className="flex flex-col items-center">
                              <Badge
                                className={`${badgeClassName} text-xs min-w-[55px] flex justify-center mx-auto py-1 mb-1`}
                              >
                                {recoveryRate}%
                              </Badge>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${progressColor}`}
                                  style={{ width: `${recoveryRate}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <div className="flex items-center">
                            <CircleDollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">
                              {caseItem.creditor_name || "미지정"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <div className="flex items-center">
                            <Scale className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">{caseItem.debtor_name || "미지정"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            {caseItem.debtor_kcb_checked ? (
                              <>
                                <span className="text-indigo-600 font-medium">KCB조회</span>
                                {caseItem.debtor?.kcb_checked_date && (
                                  <span className="text-xs ml-1">
                                    (
                                    {format(new Date(caseItem.debtor.kcb_checked_date), "yy.MM.dd")}
                                    )
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-amber-600">KCB미조회</span>
                              </>
                            )}{" "}
                            ·{" "}
                            {caseItem.debtor_payment_notification_sent ? (
                              <>
                                <span className="text-emerald-600 font-medium">변제통보</span>
                                {caseItem.debtor?.payment_notification_date && (
                                  <span className="text-xs ml-1">
                                    (
                                    {format(
                                      new Date(caseItem.debtor.payment_notification_date),
                                      "yy.MM.dd"
                                    )}
                                    )
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-gray-500">변제통보 미발송</span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-2 items-center justify-center">
                          <div className="flex items-center">
                            <GanttChartSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span>{formatCurrency(caseItem.principal_amount)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-2 items-center justify-center">
                          <div className="flex items-center">
                            <CircleDollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {formatCurrency(caseItem.recovered_amount)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {getUnreadNotificationCount(caseItem.id) > 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleNotificationClick(e, caseItem)}
                            className="h-7 w-7 rounded-full bg-amber-100 hover:bg-amber-200 relative border border-amber-300 animate-pulse"
                          >
                            <Bell className="h-4 w-4 text-amber-600" />
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-[10px] text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                              {getUnreadNotificationCount(caseItem.id)}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleNotificationClick(e, caseItem)}
                            className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                            title="알림 보기"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3 pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                              title="더 보기"
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => handleMenuAction("detail", caseItem, e)}
                              className="cursor-pointer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2 text-blue-500" />
                              <span>상세페이지 이동</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleMenuAction("lawsuit", caseItem, e)}
                              className="cursor-pointer"
                            >
                              <Scale className="h-4 w-4 mr-2 text-indigo-500" />
                              <span>소송정보 보기</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleMenuAction("recovery", caseItem, e)}
                              className="cursor-pointer"
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />
                              <span>회수내역 보기</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* 페이지네이션 영역 수정 */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 w-full max-w-[1200px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                총 {totalItems}개 중{" "}
                {totalItems > 0 ? Math.min((currentPage - 1) * casesPerPage + 1, totalItems) : 0}-
                {Math.min(currentPage * casesPerPage, totalItems)}개 표시 (페이지: {currentPage}/
                {totalPages})
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex justify-center flex-1 sm:flex-none">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => {
                        const newPage = currentPage - 1;
                        console.log("이전 페이지로 이동:", newPage);
                        if (onPageChange) {
                          onPageChange(newPage);
                        }
                      }}
                    >
                      이전
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = 0;
                      if (totalPages <= 5) {
                        // 총 페이지가 5 이하면 그대로 표시
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        // 현재 페이지가 앞쪽에 있을 때
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        // 현재 페이지가 뒤쪽에 있을 때
                        pageNum = totalPages - 4 + i;
                      } else {
                        // 현재 페이지가 중간에 있을 때
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            console.log("페이지 변경:", pageNum);
                            if (onPageChange) {
                              onPageChange(pageNum);
                            }
                          }}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => {
                        const newPage = currentPage + 1;
                        console.log("다음 페이지로 이동:", newPage);
                        if (onPageChange) {
                          onPageChange(newPage);
                        }
                      }}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 소송 정보 모달 */}
      <Dialog
        open={showLawsuitModal}
        onOpenChange={(isOpen) => {
          setShowLawsuitModal(isOpen);
          if (!isOpen) handleModalClose();
        }}
      >
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] h-[800px] p-6 overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Scale className="h-5 w-5 text-indigo-500" />
              <span>소송 정보: {selectedCaseTitle}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(800px - 100px)" }}>
            {selectedCaseId && <LawsuitManager caseId={selectedCaseId} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* 채권 정보 모달 */}
      <Dialog
        open={showRecoveryModal}
        onOpenChange={(isOpen) => {
          setShowRecoveryModal(isOpen);
          if (!isOpen) handleModalClose();
        }}
      >
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] h-[800px] p-6 overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              <span>채권 정보: {selectedCaseTitle}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(800px - 100px)" }}>
            {selectedCaseId && <RecoveryActivities caseId={selectedCaseId} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* 알림 정보 모달 */}
      <Dialog
        open={showNotificationModal}
        onOpenChange={(isOpen) => {
          setShowNotificationModal(isOpen);
          if (!isOpen && modalRefreshNeeded) {
            handleModalClose(true);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] w-[600px] max-h-[90vh] h-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Bell className="h-5 w-5 text-amber-500" />
              <span>
                알림 정보: {selectedCaseForNotification?.creditor_name} vs{" "}
                {selectedCaseForNotification?.debtor_name}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(90vh - 150px)" }}>
            {selectedCaseNotifications && selectedCaseNotifications.length > 0 ? (
              <div className="space-y-3">
                {selectedCaseNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border rounded-md transition-colors",
                      notification.is_read
                        ? "bg-white dark:bg-gray-900"
                        : "bg-blue-50 dark:bg-blue-900/10"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4
                            className={cn(
                              "font-medium text-sm",
                              !notification.is_read && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          {notification.message}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {new Date(notification.created_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <div className="flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={(e) => handleMarkAsRead(e, notification.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 읽음
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setShowNotificationModal(false);
                                router.push(`/cases/${notification.case_id}`);
                              }}
                            >
                              <ChevronRight className="h-3.5 w-3.5 mr-1" /> 보기
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>이 사건에 대한 알림이 없습니다.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            {selectedCaseNotifications && selectedCaseNotifications.some((n) => !n.is_read) && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> 모두 읽음 표시
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setShowNotificationModal(false);
                router.push(`/cases/${selectedCaseForNotification?.id}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> 사건 페이지로 이동
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
