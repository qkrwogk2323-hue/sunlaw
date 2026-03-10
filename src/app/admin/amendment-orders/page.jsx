"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CheckCircle, Clock, AlertCircle, FileText, Eye, Info, Download } from "lucide-react";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import React from "react";

export default function AmendmentOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchAmendmentOrders();
  }, [selectedTab]);

  const fetchAmendmentOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("test_lawsuit_submissions")
        .select(
          `
          id,
          lawsuit_id,
          submission_type,
          document_type,
          submission_date,
          description,
          file_url,
          status,
          created_at,
          lawsuits:lawsuit_id(
            id,
            case_id,
            case_number,
            court_name,
            type,
            cases:case_id(id, status)
          )
        `
        )
        .eq("submission_type", "송달문서")
        .eq("document_type", "보정명령");

      if (selectedTab === "in_progress") {
        query = query.is("status", null);
      } else if (selectedTab === "completed") {
        query = query.eq("status", "completed");
      }

      const { data, error } = await query;

      if (error) {
        console.error("보정명령 조회 실패:", error);
        toast.error("보정명령 조회에 실패했습니다");
        return;
      }

      // 각 항목의 기한과 남은/초과 날짜 계산
      const ordersWithDeadline = data.map((order) => {
        const submissionDate = new Date(order.submission_date);
        const deadline = addDays(submissionDate, 7);
        const today = new Date();
        const daysRemaining = differenceInDays(deadline, today);

        return {
          ...order,
          deadline,
          daysRemaining,
        };
      });

      // 완료된 항목을 맨 뒤로 정렬
      const sortedOrders = ordersWithDeadline.sort((a, b) => {
        if (a.status === "completed" && b.status !== "completed") return 1;
        if (a.status !== "completed" && b.status === "completed") return -1;
        // 동일한 상태인 경우 기한이 임박한 순으로 정렬
        return a.daysRemaining - b.daysRemaining;
      });

      setOrders(sortedOrders);
    } catch (error) {
      console.error("보정명령 조회 중 오류:", error);
      toast.error("보정명령 조회 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      const { error } = await supabase
        .from("test_lawsuit_submissions")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) {
        console.error("보정명령 완료 처리 실패:", error);
        toast.error("보정명령 완료 처리에 실패했습니다");
        return;
      }

      toast.success("보정명령이 완료 처리되었습니다");
      fetchAmendmentOrders();
    } catch (error) {
      console.error("보정명령 완료 처리 중 오류:", error);
      toast.error("보정명령 완료 처리 중 오류가 발생했습니다");
    }
  };

  const viewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  // 상태별 개수 계산
  const inProgressCount = orders.filter((order) => order.status === null).length;
  const completedCount = orders.filter((order) => order.status === "completed").length;

  const downloadFile = async (fileUrl, fileName) => {
    try {
      console.log("다운로드 시도:", fileUrl);
      const response = await fetch(fileUrl);

      if (!response.ok) {
        console.error("파일 접근 오류:", response.status, response.statusText);
        toast.error("파일 다운로드 실패", {
          description: "파일에 접근할 수 없습니다. 관리자에게 문의하세요.",
        });
        return;
      }

      // 파일 blob 획득
      const blob = await response.blob();

      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName;

      // 링크 클릭 이벤트 발생시켜 다운로드
      document.body.appendChild(a);
      a.click();

      // 정리
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("파일 다운로드가 시작되었습니다");
    } catch (error) {
      console.error("파일 다운로드 중 오류 발생:", error);
      toast.error("파일 다운로드 실패", {
        description: "다운로드 중 오류가 발생했습니다. 관리자에게 문의하세요.",
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">보정명령 관리</h1>
      <p className="text-gray-500 dark:text-gray-400">
        보정명령을 관리하고 진행 상황을 추적합니다. 보정명령은 송달일로부터 7일 이내에 처리해야
        합니다.
      </p>

      <Tabs
        defaultValue="all"
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all">
            전체{" "}
            <Badge variant="outline" className="ml-2">
              {orders.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            진행중{" "}
            <Badge variant="outline" className="ml-2">
              {inProgressCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            완료{" "}
            <Badge variant="outline" className="ml-2">
              {completedCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <AmendmentOrdersTable
            orders={orders}
            loading={loading}
            onComplete={handleComplete}
            onViewDetails={viewDetails}
            downloadFile={downloadFile}
          />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-0">
          <AmendmentOrdersTable
            orders={orders.filter((order) => order.status === null)}
            loading={loading}
            onComplete={handleComplete}
            onViewDetails={viewDetails}
            downloadFile={downloadFile}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <AmendmentOrdersTable
            orders={orders.filter((order) => order.status === "completed")}
            loading={loading}
            onViewDetails={viewDetails}
            downloadFile={downloadFile}
          />
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>보정명령 상세 정보</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">사건 정보</h3>
                <p className="text-lg font-medium">
                  {selectedOrder.lawsuits?.court_name || "법원명 없음"} |{" "}
                  {selectedOrder.lawsuits?.case_number || "사건번호 없음"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedOrder.lawsuits?.type || "사건 유형 없음"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  보정명령 일자
                </h3>
                <p>
                  {selectedOrder.submission_date
                    ? format(new Date(selectedOrder.submission_date), "yyyy년 MM월 dd일", {
                        locale: ko,
                      })
                    : "날짜 없음"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">보정기한</h3>
                <p>
                  {selectedOrder.deadline
                    ? format(new Date(selectedOrder.deadline), "yyyy년 MM월 dd일", { locale: ko })
                    : "기한 없음"}
                </p>
                {selectedOrder.status === "completed" ? (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                  >
                    완료됨
                  </Badge>
                ) : (
                  <DeadlineBadge daysRemaining={selectedOrder.daysRemaining} />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">상세 설명</h3>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedOrder.description || "설명 없음"}
                </p>
              </div>

              {selectedOrder.file_url && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    첨부 파일
                  </h3>
                  <div className="flex gap-2">
                    <a
                      href={selectedOrder.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      보기
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const fileName = `보정명령_${
                          selectedOrder.lawsuits?.case_number || "문서"
                        }_${format(new Date(selectedOrder.submission_date), "yyyyMMdd")}.pdf`;
                        downloadFile(selectedOrder.file_url, fileName);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      다운로드
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">상태</h3>
                <StatusBadge status={selectedOrder.status} />
              </div>

              <div className="pt-4 flex justify-between">
                <Link
                  href={`/cases/${selectedOrder.lawsuits?.case_id}`}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Eye className="mr-1 h-4 w-4" />
                  사건 보기
                </Link>

                {selectedOrder.status === null && (
                  <Button
                    onClick={() => {
                      handleComplete(selectedOrder.id);
                      setDetailsOpen(false);
                    }}
                  >
                    완료 처리
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function AmendmentOrdersTable({ orders, loading, onComplete, onViewDetails, downloadFile }) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return <div className="text-center py-4">데이터를 불러오는 중...</div>;
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Info className="h-10 w-10 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            해당 조건의 보정명령이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">상태</TableHead>
            <TableHead className="w-[200px]">법원/사건번호</TableHead>
            <TableHead className="w-[200px]">송달일/보정기한</TableHead>
            <TableHead className="w-[100px]">남은/초과 일수</TableHead>
            <TableHead className="w-[300px]">내용</TableHead>
            <TableHead className="w-[100px]">첨부파일</TableHead>
            <TableHead className="text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <React.Fragment key={order.id}>
              <TableRow>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="font-medium">
                  {order.lawsuits?.court_name || "법원명 없음"}
                  {order.lawsuits?.case_number && <>{order.lawsuits.case_number}</>}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">송달일 :</span>
                      <span>
                        {order.submission_date
                          ? format(new Date(order.submission_date), "yy.MM.dd", { locale: ko })
                          : "없음"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">보정기한 :</span>
                      <span>
                        {order.deadline
                          ? format(new Date(order.deadline), "yy.MM.dd", { locale: ko })
                          : "없음"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {order.status === "completed" ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                    >
                      완료됨
                    </Badge>
                  ) : (
                    <DeadlineBadge daysRemaining={order.daysRemaining} />
                  )}
                </TableCell>
                <TableCell
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRowExpand(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[250px]">
                      {order.description || "설명 없음"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                      {expandedRows[order.id] ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-chevron-up"
                        >
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-chevron-down"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {order.file_url ? (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                        <a href={order.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" />
                          보기
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          const fileName = `보정명령_${
                            order.lawsuits?.case_number || "문서"
                          }_${format(new Date(order.submission_date), "yyyyMMdd")}.pdf`;
                          downloadFile(order.file_url, fileName);
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        다운로드
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">없음</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => onViewDetails(order)}>
                    상세
                  </Button>
                  {order.status === null && (
                    <Button variant="default" size="sm" onClick={() => onComplete(order.id)}>
                      완료
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              {expandedRows[order.id] && (
                <TableRow key={`${order.id}-expanded`}>
                  <TableCell colSpan={7} className="p-0">
                    <div className="bg-muted/50 p-4 whitespace-pre-wrap">
                      {order.description || "설명 내용이 없습니다."}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DeadlineBadge({ daysRemaining }) {
  if (daysRemaining === undefined || daysRemaining === null) {
    return <Badge variant="outline">정보 없음</Badge>;
  }

  if (daysRemaining > 3) {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
      >
        {daysRemaining}일 남음
      </Badge>
    );
  } else if (daysRemaining >= 0) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
      >
        {daysRemaining}일 남음
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
        {Math.abs(daysRemaining)}일 초과
      </Badge>
    );
  }
}

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <div className="flex items-center">
        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
        <span className="text-sm">완료</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center">
        <Clock className="h-4 w-4 text-amber-500 mr-1" />
        <span className="text-sm">진행중</span>
      </div>
    );
  }
}
