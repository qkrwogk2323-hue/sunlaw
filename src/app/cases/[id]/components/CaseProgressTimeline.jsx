"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
  MoreHorizontal,
  CalendarRange,
  Plus,
  RefreshCw,
  SkipForward,
  CalendarIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function CaseProgressTimeline({ caseId, caseType }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState([]);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(caseType || "civil");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLegalProcessStages();
    }
  }, [user, caseId, activeTab]);

  const fetchLegalProcessStages = async () => {
    setLoading(true);
    setError(null);

    try {
      // 법적 프로세스 단계 가져오기
      const { data: stagesData, error: stagesError } = await supabase
        .from("test_legal_process_stages")
        .select("*")
        .eq("process_type", activeTab)
        .order("order_number", { ascending: true });

      if (stagesError) {
        throw stagesError;
      }

      // 현재 사건의 진행 상태 가져오기
      const { data: progressData, error: progressError } = await supabase
        .from("test_case_progress")
        .select("*")
        .eq("case_id", caseId);

      if (progressError) {
        throw progressError;
      }

      // 단계와 진행 상태 결합
      const combinedStages = stagesData.map((stage) => {
        const stageProgress = progressData.find((p) => p.stage_id === stage.id);
        return {
          ...stage,
          progress: stageProgress || null,
          status: stageProgress ? stageProgress.status : "pending",
        };
      });

      setStages(combinedStages);
      setProgress(progressData || []);
    } catch (error) {
      console.error("Error fetching legal process stages:", error);
      setError(error.message);
      toast.error("진행 단계 정보를 불러오는데 실패했습니다", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 단계 상태에 따른 배지 색상
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700">
            <Clock size={12} className="mr-1 text-gray-500" /> 대기중
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800/50">
            <Clock size={12} className="mr-1 text-blue-500" /> 진행중
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/50 border border-green-200 dark:border-green-800/50">
            <CheckCircle size={12} className="mr-1 text-green-500" /> 완료
          </Badge>
        );
      case "skipped":
        return (
          <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-800/50 border border-amber-200 dark:border-amber-800/50">
            <SkipForward size={12} className="mr-1 text-amber-500" /> 생략됨
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700">
            {status}
          </Badge>
        );
    }
  };

  // 표시할 단계 필터링
  const filteredStages = stages.filter((stage) => {
    if (activeTab === "all") return true;
    return stage.process_type === activeTab;
  });

  // 사건 단계 정보를 서버에 업데이트하는 함수
  const handleUpdateStatus = async (stageId, newStatus, note = null) => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 진행 상태를 업데이트할 수 있습니다",
      });
      return;
    }

    try {
      const existingProgress = progress.find((p) => p.stage_id === stageId);
      const now = new Date().toISOString();

      if (existingProgress) {
        // 이미 진행 상태가 있는 경우 업데이트
        const { error } = await supabase
          .from("test_case_progress")
          .update({
            status: newStatus,
            notes: note !== null ? note : existingProgress.notes,
            end_date: newStatus === "completed" ? now : null,
            updated_by: user.id,
            updated_at: now,
          })
          .eq("id", existingProgress.id);

        if (error) throw error;
      } else {
        // 새로운 진행 상태 생성
        const { error } = await supabase.from("test_case_progress").insert({
          case_id: caseId,
          stage_id: stageId,
          status: newStatus,
          notes: note || null,
          start_date: newStatus === "in_progress" ? now : null,
          end_date: newStatus === "completed" ? now : null,
          updated_by: user.id,
        });

        if (error) throw error;
      }

      // 상태 새로고침
      fetchLegalProcessStages();

      toast.success("진행 상태가 업데이트되었습니다", {
        description: `단계 상태가 '${newStatus}'으로 변경되었습니다`,
      });
    } catch (error) {
      console.error("Error updating stage status:", error);
      toast.error("진행 상태 업데이트 실패", {
        description: error.message,
      });
    }
  };

  const openNoteDialog = (stageId, status) => {
    setSelectedStage(stageId);
    setSelectedStatus(status);
    const stageProgress = progress.find((p) => p.stage_id === stageId);
    setNoteText(stageProgress?.notes || "");
    setShowNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    setIsSubmitting(true);
    handleUpdateStatus(selectedStage, selectedStatus, noteText)
      .then(() => {
        setShowNoteDialog(false);
        setSelectedStage(null);
        setSelectedStatus(null);
        setNoteText("");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // 단계 상태에 따른 타임라인 스타일
  const getTimelineStyle = (status, index, isLast) => {
    let lineStyle = "";
    let circleStyle = "";

    switch (status) {
      case "completed":
        circleStyle =
          "bg-green-500 dark:bg-green-400 text-white shadow-md shadow-green-200 dark:shadow-green-900/30 border-4 border-green-100 dark:border-green-900/50";
        lineStyle = !isLast ? "bg-green-500 dark:bg-green-400" : "";
        break;
      case "in_progress":
        circleStyle =
          "bg-blue-500 dark:bg-blue-400 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 border-4 border-blue-100 dark:border-blue-900/50";
        lineStyle = !isLast ? "bg-gray-200 dark:bg-gray-700" : "";
        break;
      case "skipped":
        circleStyle =
          "bg-amber-500 dark:bg-amber-400 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30 border-4 border-amber-100 dark:border-amber-900/50";
        lineStyle = !isLast ? "bg-gray-200 dark:bg-gray-700" : "";
        break;
      default:
        circleStyle =
          "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-4 border-gray-100 dark:border-gray-800";
        lineStyle = !isLast ? "bg-gray-200 dark:bg-gray-700" : "";
    }

    return { lineStyle, circleStyle };
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div className="flex gap-4" key={i}>
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200 dark:border-red-900/50">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600 dark:text-red-400 mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            <h3 className="text-lg font-medium">오류 발생</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Button
            variant="outline"
            onClick={fetchLegalProcessStages}
            className="mt-4 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-blue-400">
            진행 상황
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            사건 진행 상태와 진행되어야 할 단계
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLegalProcessStages}
                  className="bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  <RefreshCw className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>새로고침</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[400px]">
            <TabsList className="grid w-full grid-cols-2 h-9 bg-gray-100/80 dark:bg-gray-800/80 p-0.5 rounded-lg">
              <TabsTrigger
                value="civil"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-blue-400 h-8"
              >
                민사
              </TabsTrigger>
              <TabsTrigger
                value="enforcement"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-blue-400 h-8"
              >
                강제집행
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
        <CardContent className="p-6">
          {filteredStages.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                진행 단계 없음
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {activeTab === "civil"
                  ? "민사 사건 진행 단계가 설정되지 않았습니다."
                  : "강제집행 진행 단계가 설정되지 않았습니다."}
              </p>
            </div>
          ) : (
            <ol className="relative">
              {filteredStages.map((stage, index) => {
                const isLast = index === filteredStages.length - 1;
                const { lineStyle, circleStyle } = getTimelineStyle(stage.status, index, isLast);

                return (
                  <li className="mb-10 last:mb-0" key={stage.id}>
                    <div className="flex items-start">
                      <div className="flex flex-col items-center mr-4">
                        <div
                          className={cn(
                            "z-10 flex items-center justify-center w-10 h-10 rounded-full",
                            circleStyle
                          )}
                        >
                          {stage.status === "completed" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : stage.status === "skipped" ? (
                            <SkipForward className="h-5 w-5" />
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        {!isLast && <div className={cn("w-1 h-full mt-2", lineStyle)}></div>}
                      </div>

                      <div
                        className={cn(
                          "p-4 rounded-lg border transition-all w-full",
                          stage.status === "completed"
                            ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800/30"
                            : stage.status === "in_progress"
                            ? "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30"
                            : stage.status === "skipped"
                            ? "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30"
                            : "bg-gray-50 border-gray-100 dark:bg-gray-800/30 dark:border-gray-700/30"
                        )}
                      >
                        <div className="flex justify-between items-start gap-x-2">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {stage.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {stage.description}
                            </p>
                          </div>
                          <div className="flex gap-1">{getStatusBadge(stage.status)}</div>
                        </div>

                        {stage.progress && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                              {stage.progress.start_date && (
                                <div className="flex items-center">
                                  <CalendarRange className="h-4 w-4 mr-1 text-blue-500 dark:text-blue-400" />
                                  <span>
                                    시작:{" "}
                                    {format(
                                      parseISO(stage.progress.start_date),
                                      "yyyy년 MM월 dd일",
                                      { locale: ko }
                                    )}
                                  </span>
                                </div>
                              )}
                              {stage.progress.end_date && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1 text-green-500 dark:text-green-400" />
                                  <span>
                                    완료:{" "}
                                    {format(parseISO(stage.progress.end_date), "yyyy년 MM월 dd일", {
                                      locale: ko,
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>

                            {stage.progress.notes && (
                              <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-sm">
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                                  <FileText className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                                  메모
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                  {stage.progress.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {user && (user.role === "admin" || user.role === "staff") && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {stage.status === "pending" && (
                              <Button
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm"
                                onClick={() => handleUpdateStatus(stage.id, "in_progress")}
                              >
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                진행중으로 변경
                              </Button>
                            )}

                            {stage.status === "in_progress" && (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm"
                                onClick={() => handleUpdateStatus(stage.id, "completed")}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                완료로 변경
                              </Button>
                            )}

                            {(stage.status === "pending" || stage.status === "in_progress") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white hover:bg-gray-50 text-amber-600 border border-amber-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-amber-800/50 dark:text-amber-400"
                                onClick={() => handleUpdateStatus(stage.id, "skipped")}
                              >
                                <SkipForward className="h-3.5 w-3.5 mr-1" />
                                생략
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white hover:bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                              onClick={() => openNoteDialog(stage.id, stage.status)}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              메모 추가
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>단계 메모 추가</DialogTitle>
            <DialogDescription>이 단계에 대한 메모나 추가 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="메모 내용을 입력하세요..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNoteDialog(false)}
              className="mt-3 sm:mt-0"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleNoteSubmit}
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
