"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isSameDay, isBefore, isAfter } from "date-fns";
import { ko } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  FileText,
  Download,
  ArrowDown,
  ArrowUp,
  Calendar,
  Eye,
  Edit,
  List,
  Trash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";

export default function CaseTimeline({
  lawsuit,
  viewOnly = false,
  onSuccess,
  onEdit,
  onScheduleEdit,
  onScheduleAdd,
}) {
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    submission_type: "송달문서",
    document_type: "",
    submission_date: new Date(),
    description: "",
  });
  const [editingSubmissionId, setEditingSubmissionId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // 기일 관련 상태 추가
  const [schedules, setSchedules] = useState([]);
  const [scheduleFormData, setScheduleFormData] = useState({
    title: "",
    event_type: "", // 사용자 입력값으로 변경
    event_date: new Date(),
    location: "",
    description: "",
  });

  // 날짜 포맷 함수
  const formatDate = (date) => {
    return format(date, "yyyy-MM-dd HH:mm");
  };

  // 한국어 날짜 포맷 함수
  const formatDateKorean = (date) => {
    return format(date, "yyyy년 MM월 dd일", { locale: ko });
  };

  // 문서 유형 관련 상수
  const submissionTypes = [
    { value: "송달문서", label: "송달문서", icon: ArrowDown },
    { value: "제출문서", label: "제출문서", icon: ArrowUp },
  ];

  const documentTypes = {
    송달문서: [
      { value: "소장", label: "소장" },
      { value: "준비서면", label: "준비서면" },
      { value: "석명준비명령", label: "석명준비명령" },
      { value: "변론기일통지서", label: "변론기일통지서" },
      { value: "결정문", label: "결정문" },
      { value: "판결문", label: "판결문" },
    ],
    제출문서: [
      { value: "답변서", label: "답변서" },
      { value: "준비서면", label: "준비서면" },
      { value: "증거신청서", label: "증거신청서" },
      { value: "사실조회신청서", label: "사실조회신청서" },
      { value: "항소장", label: "항소장" },
      { value: "상고장", label: "상고장" },
    ],
  };

  useEffect(() => {
    if (user && lawsuit?.id) {
      fetchSubmissions();
      fetchSchedules(); // 기일 데이터 가져오기
    }
  }, [user, lawsuit]);

  // 기일 추가 이벤트 리스너
  useEffect(() => {
    const handleAddScheduleEvent = (e) => {
      // 상위 컴포넌트에 기일 추가 요청
      if (onScheduleAdd) {
        onScheduleAdd();
      }
    };

    const element = document.getElementById("timeline-component");
    if (element) {
      element.addEventListener("add-schedule", handleAddScheduleEvent);

      return () => {
        element.removeEventListener("add-schedule", handleAddScheduleEvent);
      };
    }
  }, [onScheduleAdd]);

  // 타임라인 새로고침 이벤트 리스너
  useEffect(() => {
    const handleRefreshTimeline = () => {
      if (lawsuit?.id) {
        fetchSubmissions();
        fetchSchedules();
      }
    };

    const element = document.getElementById("timeline-component");
    if (element) {
      element.addEventListener("refresh-timeline", handleRefreshTimeline);

      return () => {
        element.removeEventListener("refresh-timeline", handleRefreshTimeline);
      };
    }
  }, [lawsuit]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_lawsuit_submissions")
        .select(
          `
          *,
          created_by_user:created_by(id, name, email)
        `
        )
        .eq("lawsuit_id", lawsuit.id)
        .order("submission_date", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("타임라인 조회 실패:", error);
      toast.error("타임라인 조회 실패", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 기일 데이터 가져오기
  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("test_schedules")
        .select("*")
        .eq("lawsuit_id", lawsuit.id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("기일 조회 실패:", error);
      toast.error("기일 조회 실패", {
        description: error.message,
      });
    }
  };

  // 통합 조회 함수 추가
  const fetchSubmissionsAndSchedules = () => {
    fetchSubmissions();
    fetchSchedules();
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.submission_type) errors.submission_type = "유형을 선택해주세요";
    if (!formData.document_type) errors.document_type = "문서 종류를 선택해주세요";
    if (!formData.submission_date) errors.submission_date = "날짜를 선택해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadFile = async (file) => {
    if (!file) return null;

    // 파일 이름에 타임스탬프 추가하여 중복 방지
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${lawsuit.id}.${fileExt}`;
    const filePath = `cases/${lawsuit.case_id}/submissions/${fileName}`;

    const { data, error } = await supabase.storage.from("case-files").upload(filePath, file);

    if (error) throw error;

    // 파일 URL 생성
    const { data: urlData } = supabase.storage.from("case-files").getPublicUrl(filePath);

    return urlData.publicUrl;
  };

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

  const handleDeleteSubmission = async (submissionId) => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 송달문서를 삭제할 수 있습니다",
      });
      return;
    }

    try {
      // 1. 먼저 관련된 알림 삭제
      console.log("송달문서 관련 알림 삭제 시작:", submissionId);

      // 사건 알림 삭제 (test_case_notifications 테이블)
      const { data: caseNotificationsData, error: caseNotificationsError } = await supabase
        .from("test_case_notifications")
        .delete()
        .match({
          notification_type: "submission",
          related_id: submissionId,
        })
        .select("id");

      if (caseNotificationsError) {
        console.error("사건 알림 삭제 실패:", caseNotificationsError);
        // 알림 삭제 실패 시에도 문서 삭제는 진행
      } else {
        console.log(`${caseNotificationsData?.length || 0}개의 사건 알림이 삭제되었습니다.`);
      }

      // 개인 알림 삭제 (test_individual_notifications 테이블)
      const { data: individualNotificationsData, error: individualNotificationsError } =
        await supabase
          .from("test_individual_notifications")
          .delete()
          .match({
            notification_type: "submission",
            related_id: submissionId,
          })
          .select("id");

      if (individualNotificationsError) {
        console.error("개인 알림 삭제 실패:", individualNotificationsError);
        // 알림 삭제 실패 시에도 문서 삭제는 진행
      } else {
        console.log(`${individualNotificationsData?.length || 0}개의 개인 알림이 삭제되었습니다.`);
      }

      // 해당 문서가 첨부파일을 가지고 있는지 확인
      const { data: submissionData, error: submissionError } = await supabase
        .from("test_lawsuit_submissions")
        .select("file_url")
        .eq("id", submissionId)
        .single();

      if (!submissionError && submissionData && submissionData.file_url) {
        // 첨부파일 경로 추출
        try {
          const fileUrl = submissionData.file_url;
          // URL에서 파일 경로 추출
          const filePathMatch = fileUrl.match(/case-files\/(.+)/);

          if (filePathMatch && filePathMatch[1]) {
            const filePath = filePathMatch[1];
            console.log("첨부파일 삭제 시도:", filePath);

            // 스토리지에서 파일 삭제
            const { error: deleteFileError } = await supabase.storage
              .from("case-files")
              .remove([filePath]);

            if (deleteFileError) {
              console.error("첨부파일 삭제 실패:", deleteFileError);
            } else {
              console.log("첨부파일이 성공적으로 삭제되었습니다.");
            }
          }
        } catch (fileError) {
          console.error("첨부파일 삭제 중 오류 발생:", fileError);
        }
      }

      // 2. 문서 삭제
      const { error } = await supabase
        .from("test_lawsuit_submissions")
        .delete()
        .eq("id", submissionId);

      if (error) throw error;

      toast.success("송달문서가 삭제되었습니다", {
        description: "송달문서와 관련된 알림이 모두 삭제되었습니다.",
      });

      // 업데이트된 목록 가져오기
      fetchSubmissions();
    } catch (error) {
      console.error("송달문서 삭제 실패:", error);
      toast.error("송달문서 삭제 실패", {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      submission_type: "송달문서",
      document_type: "",
      submission_date: new Date(),
      description: "",
    });
    setFileToUpload(null);
    setFormErrors({});
    setEditingSubmissionId(null); // 편집 모드 리셋
  };

  const getFilteredSubmissions = () => {
    if (activeTab === "all") return submissions;
    return submissions.filter((item) => item.submission_type === activeTab);
  };

  const getSubmissionTypeIcon = (type) => {
    if (type === "송달문서") return <ArrowDown className="h-4 w-4" />;
    if (type === "제출문서") return <ArrowUp className="h-4 w-4" />;
    if (type === "기일") return <Calendar className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getSubmissionTypeColor = (type) => {
    if (type === "송달문서") return "bg-blue-100 dark:bg-blue-900/20";
    if (type === "제출문서") return "bg-green-100 dark:bg-green-900/20";
    if (type === "기일") return "bg-amber-100 dark:bg-amber-900/20";
    return "bg-slate-100 dark:bg-slate-800";
  };

  // 필터링된 일정 얻기
  const getFilteredSchedules = () => {
    if (activeTab === "all" || activeTab === "기일") return schedules;
    return [];
  };

  // 타임라인 항목 렌더링
  const renderTimelineItem = (item) => {
    const isSchedule = item.hasOwnProperty("event_type");
    const itemType = isSchedule ? item.event_type : item.submission_type;
    const submissionIcon = getSubmissionTypeIcon(isSchedule ? "기일" : itemType);
    const bgColor = getSubmissionTypeColor(isSchedule ? "기일" : itemType);
    const itemBgClass = getItemBackgroundClass(isSchedule ? "기일" : itemType);

    return (
      <div
        key={isSchedule ? `schedule-${item.id}` : `submission-${item.id}`}
        className={`p-3 my-2 rounded-lg border relative ${itemBgClass}`}
      >
        {/* 타임라인 항목 아이콘 */}
        <div className="absolute -left-[40px] top-4 z-10">
          <div
            className={`h-6 w-6 rounded-full ${bgColor} flex items-center justify-center text-white`}
          >
            {submissionIcon}
          </div>
        </div>

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1 h-6">
                {submissionIcon}
                <span>{isSchedule ? item.event_type : itemType}</span>
              </Badge>

              {isSchedule && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(item.event_date), "HH:mm", { locale: ko })}
                </span>
              )}

              {!isSchedule && item.document_number && (
                <Badge variant="outline" className="text-xs">
                  문서번호: {item.document_number}
                </Badge>
              )}

              {isSchedule && item.location && (
                <span className="text-xs text-muted-foreground">장소: {item.location}</span>
              )}
            </div>

            {!isSchedule && (
              <div className="mt-1 text-sm font-medium">
                {item.document_type || item.document_name || "문서"}
              </div>
            )}

            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
            )}

            {/* 첨부파일이 있는 경우 버튼 표시 - 기일과 문서 모두 적용 */}
            {item.file_url && (
              <div className="flex gap-1 mt-2">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3 w-3 mr-1" />
                    보기
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                  <div
                    onClick={() => {
                      const fileName = `${
                        isSchedule ? "기일문서" : item.document_type || "문서"
                      }_${format(
                        isSchedule ? new Date(item.event_date) : new Date(item.submission_date),
                        "yyyyMMdd"
                      )}.pdf`;
                      downloadFile(item.file_url, fileName);
                    }}
                    className="flex items-center cursor-pointer"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    다운로드
                  </div>
                </Button>
              </div>
            )}
          </div>

          {user && (user.role === "admin" || user.role === "staff") && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => (isSchedule ? handleEditSchedule(item) : handleEditSubmission(item))}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  isSchedule ? handleDeleteSchedule(item.id) : handleDeleteSubmission(item.id)
                }
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 항목 유형에 따른 배경색 클래스 가져오기
  const getItemBackgroundClass = (type) => {
    switch (type) {
      case "송달문서":
        return "bg-blue-50/40 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30";
      case "제출문서":
        return "bg-green-50/40 dark:bg-green-900/10 border-green-100 dark:border-green-800/30";
      case "기일":
        return "bg-amber-50/40 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30";
      default:
        return "bg-gray-50/40 dark:bg-gray-900/10 border-gray-100 dark:border-gray-800/30";
    }
  };

  // 타임라인 렌더링
  const renderTimeline = () => {
    const filteredSchedules = getFilteredSchedules();
    const filteredSubmissions = getFilteredSubmissions();

    if ((filteredSchedules.length === 0 && filteredSubmissions.length === 0) || loading) {
      return (
        <div className="rounded-lg border bg-background/50 p-4 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Calendar className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">등록된 항목이 없습니다</p>
            {(user?.role === "admin" || user?.role === "staff") && (
              <div className="flex gap-2 mt-1">
                <Button
                  onClick={() => {
                    if (!lawsuit || !lawsuit.id) {
                      toast.error("기일 추가 실패", {
                        description: "소송이 선택되지 않았습니다. 먼저 소송을 선택해주세요.",
                      });
                      return;
                    }
                    onScheduleAdd(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  기일 추가
                </Button>
                <Button
                  onClick={() => onSuccess(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  문서 추가
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 일정과 문서 합치고 정렬
    const timelineItems = [...filteredSchedules, ...filteredSubmissions].sort((a, b) => {
      const dateA = a.hasOwnProperty("event_date")
        ? new Date(a.event_date)
        : new Date(a.submission_date);
      const dateB = b.hasOwnProperty("event_date")
        ? new Date(b.event_date)
        : new Date(b.submission_date);
      return dateB - dateA;
    });

    // 날짜별로 그룹화
    const groupedItems = {};
    timelineItems.forEach((item) => {
      const date = item.hasOwnProperty("event_date")
        ? format(new Date(item.event_date), "yyyy-MM-dd")
        : format(new Date(item.submission_date), "yyyy-MM-dd");

      if (!groupedItems[date]) {
        groupedItems[date] = [];
      }
      groupedItems[date].push(item);
    });

    return (
      <div className="space-y-6">
        {Object.keys(groupedItems).map((date) => {
          const formattedDate = formatDateKorean(new Date(date));
          return (
            <div key={date} className="relative pb-2">
              <div className="mb-3 flex items-center">
                <h3 className="text-sm font-semibold bg-background px-2 py-1 rounded-md border shadow-sm">
                  {formattedDate}
                </h3>
              </div>
              <div className="relative pl-12 border-l-2 border-border ml-3 space-y-1">
                {groupedItems[date].map((item) => renderTimelineItem(item))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 기일 폼 유효성 검사
  const validateScheduleForm = () => {
    const errors = {};

    if (!scheduleFormData.title) errors.title = "제목을 입력해주세요";
    if (!scheduleFormData.event_type) errors.event_type = "기일 유형을 입력해주세요";
    if (!scheduleFormData.event_date) errors.event_date = "날짜를 선택해주세요";
    if (!scheduleFormData.location) errors.location = "장소를 입력해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 문서 수정 핸들러
  const handleEditSubmission = (submission) => {
    // 상세 데이터 가져오는 API 호출
    getSubmissionDetail(submission.id).then((detailData) => {
      if (!detailData) {
        console.error("문서 상세 정보를 가져오지 못했습니다.", submission.id);
        toast.error("문서 정보를 가져오지 못했습니다", {
          description: "나중에 다시 시도해주세요.",
        });
        return;
      }

      // 인쇄용 상세 데이터 설정
      onEdit(detailData);
      setEditingSubmissionId(detailData.id);
    });
  };

  // 제출/송달 문서 상세 조회
  const getSubmissionDetail = async (submissionId) => {
    try {
      const { data, error } = await supabase
        .from("test_lawsuit_submissions")
        .select(
          `
          *,
          created_by_user:created_by(id, name, email)
        `
        )
        .eq("id", submissionId)
        .single();

      if (error) {
        console.error("문서 상세 정보 조회 실패:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("문서 상세 정보 조회 중 오류 발생:", error);
      return null;
    }
  };

  // 기일 수정 처리 함수 추가
  const handleEditSchedule = (schedule) => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 기일을 수정할 수 있습니다",
      });
      return;
    }

    if (onScheduleEdit) {
      // 부모 컴포넌트의 수정 함수 호출
      onScheduleEdit(schedule);
    } else {
      console.error("onScheduleEdit 함수가 없습니다");
      // 폴백: 직접 모달 처리
      setScheduleFormData({
        title: schedule.title,
        event_type: schedule.event_type,
        event_date: new Date(schedule.event_date),
        location: schedule.location || "",
        description: schedule.description || "",
      });

      // 편집 모드로 설정하고 모달 열기
      setEditingScheduleId(schedule.id);
      onScheduleAdd(true);
    }
  };

  // 기일 삭제 처리
  const handleDeleteSchedule = async (scheduleId) => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 기일을 삭제할 수 있습니다",
      });
      return;
    }

    try {
      // 1. 먼저 관련된 알림 삭제
      console.log("기일 관련 알림 삭제 시작:", scheduleId);

      // 사건 알림 삭제 (test_case_notifications 테이블)
      const { data: caseNotificationsData, error: caseNotificationsError } = await supabase
        .from("test_case_notifications")
        .delete()
        .match({
          notification_type: "schedule",
          related_id: scheduleId,
        })
        .select("id");

      if (caseNotificationsError) {
        console.error("사건 알림 삭제 실패:", caseNotificationsError);
        // 알림 삭제 실패 시에도 기일 항목은 삭제 진행
      } else {
        console.log(`${caseNotificationsData?.length || 0}개의 사건 알림이 삭제되었습니다.`);
      }

      // 개인 알림 삭제 (test_individual_notifications 테이블)
      const { data: individualNotificationsData, error: individualNotificationsError } =
        await supabase
          .from("test_individual_notifications")
          .delete()
          .match({
            notification_type: "schedule",
            related_id: scheduleId,
          })
          .select("id");

      if (individualNotificationsError) {
        console.error("개인 알림 삭제 실패:", individualNotificationsError);
        // 알림 삭제 실패 시에도 기일 항목은 삭제 진행
      } else {
        console.log(`${individualNotificationsData?.length || 0}개의 개인 알림이 삭제되었습니다.`);
      }

      // 2. 기일 항목 삭제
      const { error } = await supabase.from("test_schedules").delete().eq("id", scheduleId);

      if (error) throw error;

      toast.success("기일이 삭제되었습니다", {
        description: "기일과 관련된 알림이 모두 삭제되었습니다.",
      });

      // 업데이트된 목록 가져오기
      fetchSubmissionsAndSchedules();
    } catch (error) {
      console.error("기일 삭제 실패:", error);
      toast.error("기일 삭제 실패", {
        description: error.message,
      });
    }
  };

  // 소송의 당사자 정보 가져오기
  const getLawsuitParties = async (lawsuitId) => {
    try {
      console.log("당사자 정보 조회 시작: lawsuitId =", lawsuitId);

      // 소송 당사자 관계 조회
      const { data: lawsuitParties, error: lawsuitPartiesError } = await supabase
        .from("test_lawsuit_parties")
        .select("party_id, party_type")
        .eq("lawsuit_id", lawsuitId);

      if (lawsuitPartiesError) throw lawsuitPartiesError;
      if (!lawsuitParties || lawsuitParties.length === 0) {
        console.log("소송 당사자 관계가 없습니다.");
        return { creditor: null, debtor: null };
      }

      console.log("소송 당사자 관계:", lawsuitParties);

      // 당사자 ID 목록 추출
      const partyIds = lawsuitParties.map((p) => p.party_id);
      console.log("당사자 ID 목록:", partyIds);

      // 당사자 상세 정보 조회
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("*")
        .in("id", partyIds);

      if (partiesError) throw partiesError;
      console.log("당사자 상세 정보:", partiesData);

      // 당사자 관계와 상세 정보 결합
      const parties = partiesData.map((party) => {
        const lawsuitParty = lawsuitParties.find((lp) => lp.party_id === party.id);
        return {
          ...party,
          party_type: lawsuitParty?.party_type,
        };
      });

      console.log("결합된 당사자 정보:", parties);

      // 원고/채권자/신청인 및 피고/채무자/피신청인 찾기
      let creditor = null;
      let debtor = null;

      parties.forEach((party) => {
        if (["plaintiff", "creditor", "applicant"].includes(party.party_type)) {
          creditor = party;
        } else if (["defendant", "debtor", "respondent"].includes(party.party_type)) {
          debtor = party;
        }
      });

      console.log("찾은 당사자 정보:", { creditor, debtor });

      return { creditor, debtor };
    } catch (error) {
      console.error("당사자 정보 조회 실패:", error);
      return { creditor: null, debtor: null };
    }
  };

  // 문서 제출/송달 시 알림 생성 함수 추가
  const createNotificationForSubmission = async (submissionData) => {
    if (!lawsuit || !lawsuit.id) {
      console.error("알림 생성: 사건 ID가 없습니다");
      return;
    }

    try {
      // 당사자 정보 가져오기
      const { creditor, debtor } = await getLawsuitParties(lawsuit.id);

      // 채권자와 채무자 정보 설정
      let creditorName = "미지정";
      let debtorName = "미지정";

      if (creditor) {
        creditorName =
          creditor.entity_type === "individual" ? creditor.name : creditor.company_name || "미지정";
      }

      if (debtor) {
        debtorName =
          debtor.entity_type === "individual" ? debtor.name : debtor.company_name || "미지정";
      }

      // 알림 제목 설정 - 송달문서와 제출문서에 따라 다르게 설정
      let title = "";
      if (submissionData.submission_type === "송달문서") {
        title = `${submissionData.document_type}이(가) 송달되었습니다`;
      } else if (submissionData.submission_type === "제출문서") {
        title = `${submissionData.document_type}이(가) 제출되었습니다`;
      } else {
        title = `${submissionData.document_type} 문서가 등록되었습니다`;
      }

      // 알림 내용 설정
      const message = `${lawsuit.case_number}_${creditorName}(${debtorName})`;

      // 모든 의뢰인과 담당자의 ID를 수집하기 위한 Set
      const userIds = new Set();

      console.log("알림 생성 시작 - 사건 ID:", lawsuit.id);
      console.log("소송 정보:", JSON.stringify(lawsuit, null, 2));

      // 사건 담당자 조회 - 전달받은 caseDetails를 사용하거나, 없으면 직접 조회
      if (caseDetails && caseDetails.handlers) {
        // props로 전달된 handlers 배열 사용
        console.log("props로 전달된 담당자 정보 사용:", caseDetails.handlers);
        caseDetails.handlers.forEach((handler) => {
          if (handler.user_id) {
            userIds.add(handler.user_id);
            console.log("담당자 ID 추가:", handler.user_id);
          }
        });
      } else {
        // 직접 API로 조회
        console.log("API로 담당자 정보 조회 시작 - case_id:", lawsuit.id);
        const { data: handlersData, error: handlersError } = await supabase
          .from("test_case_handlers")
          .select("*")
          .eq("case_id", lawsuit.id);

        if (handlersError) {
          console.error("사건 담당자 조회 실패:", handlersError);
        } else if (handlersData) {
          console.log("조회된 담당자 수:", handlersData.length);
          console.log("담당자 데이터:", JSON.stringify(handlersData, null, 2));
          handlersData.forEach((handler) => {
            if (handler.user_id) {
              userIds.add(handler.user_id);
              console.log("담당자 ID 추가:", handler.user_id);
            }
          });
        }
      }

      // 개인 및 법인 의뢰인 처리
      console.log("알림 생성: 의뢰인 정보 조회 시작");
      const { data: clientsData, error: clientsError } = await supabase
        .from("test_case_clients")
        .select(
          `
          id,
          client_type,
          individual_id,
          organization_id
        `
        )
        .eq("case_id", lawsuit.case_id || lawsuit.id);

      if (clientsError) {
        console.error("의뢰인 조회 실패:", clientsError);
      } else if (clientsData && clientsData.length > 0) {
        console.log(`의뢰인 ${clientsData.length}명 발견, 원본 데이터:`, clientsData);

        // 개인 의뢰인 처리
        clientsData.forEach((client) => {
          if (client.client_type === "individual") {
            // individual_id가 객체인 경우 (id 필드 추출)
            if (
              client.individual_id &&
              typeof client.individual_id === "object" &&
              client.individual_id.id
            ) {
              console.log("객체 형태의 individual_id 발견:", client.individual_id);
              userIds.add(client.individual_id.id);
              console.log("개인 의뢰인 ID 추가 (객체에서):", client.individual_id.id);
            }
            // individual_id가 문자열(UUID)인 경우
            else if (client.individual_id && typeof client.individual_id === "string") {
              userIds.add(client.individual_id);
              console.log("개인 의뢰인 ID 추가 (문자열):", client.individual_id);
            }
          }
        });

        // 법인 의뢰인 처리
        const organizationIds = clientsData
          .filter((c) => c.client_type === "organization")
          .map((c) => {
            // organization_id가 객체인 경우
            if (
              c.organization_id &&
              typeof c.organization_id === "object" &&
              c.organization_id.id
            ) {
              return c.organization_id.id;
            }
            // organization_id가 문자열(UUID)인 경우
            else if (c.organization_id && typeof c.organization_id === "string") {
              return c.organization_id;
            }
            return null;
          })
          .filter(Boolean); // null 값 제거

        if (organizationIds.length > 0) {
          console.log("법인 의뢰인 ID:", organizationIds);

          // 법인 구성원 조회
          const { data: membersData, error: membersError } = await supabase
            .from("test_organization_members")
            .select("user_id")
            .in("organization_id", organizationIds);

          if (membersError) {
            console.error("법인 구성원 조회 실패:", membersError);
          } else if (membersData && membersData.length > 0) {
            console.log(`법인 구성원 ${membersData.length}명 발견:`, membersData);
            membersData.forEach((member) => {
              if (member.user_id) {
                userIds.add(member.user_id);
                console.log("법인 구성원 ID 추가:", member.user_id);
              }
            });
          } else {
            console.log("법인 구성원 없음");
          }
        }
      } else {
        console.log("의뢰인 없음");
      }

      // 수집된 사용자 ID 확인
      const uniqueUserIds = Array.from(userIds);
      console.log(`수집된 사용자 ID ${uniqueUserIds.length}개:`, uniqueUserIds);

      // 3. 사용자 ID 검증 (해당 ID의 사용자가 실제로 존재하는지 확인)
      let finalUserIds = [];
      if (uniqueUserIds.length > 0) {
        console.log("알림 생성: 사용자 ID 검증 시작");
        const { data: validUsers, error: usersError } = await supabase
          .from("users")
          .select("id")
          .in("id", uniqueUserIds);

        if (usersError) {
          console.error("사용자 검증 실패:", usersError);
          // 오류가 있더라도 계속 진행
          finalUserIds = uniqueUserIds;
        } else if (validUsers && validUsers.length > 0) {
          // 유효한 사용자 ID만 필터링
          finalUserIds = validUsers.map((user) => user.id);
          console.log(`검증된 사용자 ${finalUserIds.length}명:`, finalUserIds);
        } else {
          console.log("유효한 사용자 없음");
          // 유효한 사용자가 없는 경우 원래 ID 목록 사용
          finalUserIds = uniqueUserIds;
        }
      }

      // 사건 ID 확인 (case_id가 없는 경우 직접 test_cases에서 조회)
      let validCaseId;
      if (lawsuit.case_id) {
        validCaseId = lawsuit.case_id;
      } else {
        // lawsuit.id를 사용하여 test_cases 테이블에서 해당 소송 레코드 조회
        console.log("소송에 case_id가 없어 test_cases 테이블에서 조회합니다:", lawsuit.id);
        const { data: caseData, error: caseError } = await supabase
          .from("test_cases")
          .select("id")
          .eq("id", lawsuit.id)
          .single();

        if (caseError) {
          console.error("사건 조회 실패:", caseError);
          return;
        }
        validCaseId = caseData.id;
      }

      if (!validCaseId) {
        console.error("유효한 사건 ID를 찾을 수 없습니다. lawsuit:", lawsuit);
        return;
      }

      console.log("알림 생성에 사용할 유효한 case_id:", validCaseId);

      // 1. 사건 알림 생성 (test_case_notifications 테이블)
      const caseNotification = {
        case_id: validCaseId,
        title: title,
        message: message,
        notification_type: "submission",
        created_at: new Date().toISOString(),
        related_id: editingSubmission?.id || submissionData.id,
      };

      console.log("알림 생성: 사건 알림 생성 시작", caseNotification);
      try {
        const { data: caseNotificationData, error: caseNotificationError } = await supabase
          .from("test_case_notifications")
          .insert(caseNotification)
          .select();

        if (caseNotificationError) {
          console.error(
            "사건 알림 생성 실패:",
            caseNotificationError,
            "\ncase_id:",
            validCaseId,
            "\nlawsuit_id:",
            lawsuit.id
          );
        } else {
          console.log("사건 알림이 생성되었습니다", caseNotificationData);
        }
      } catch (notificationError) {
        console.error("사건 알림 생성 중 예외 발생:", notificationError);
      }

      // 2. 개인 알림 생성 (test_individual_notifications 테이블)
      if (finalUserIds.length === 0) {
        console.log("알림을 받을 사용자가 없습니다");
        return;
      }

      console.log(`${finalUserIds.length}명의 사용자에게 개인 알림을 생성합니다:`, finalUserIds);

      // 각 사용자에 대한 알림 생성
      const individualNotifications = finalUserIds.map((userId) => ({
        id: uuidv4(),
        user_id: userId,
        case_id: validCaseId,
        title: title,
        message: message,
        notification_type: "submission",
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: editingSubmission?.id || submissionData.id,
      }));

      console.log(
        "알림 생성: 개인 알림 생성 시작",
        JSON.stringify(individualNotifications, null, 2)
      );
      try {
        const { data: notificationsData, error: individualNotificationError } = await supabase
          .from("test_individual_notifications")
          .insert(individualNotifications)
          .select();

        if (individualNotificationError) {
          console.error(
            "개인 알림 생성 실패:",
            individualNotificationError,
            "\n상세 오류:",
            individualNotificationError.details,
            "\n오류 코드:",
            individualNotificationError.code,
            "\n오류 메시지:",
            individualNotificationError.message
          );

          // 각 알림을 개별적으로 삽입 시도 (일괄 삽입에 실패한 경우)
          console.log("개별적으로 알림 삽입 시도...");
          for (const notification of individualNotifications) {
            console.log("개별 알림 삽입 시도:", notification);
            try {
              const { data, error } = await supabase
                .from("test_individual_notifications")
                .insert(notification)
                .select();

              if (error) {
                console.error(
                  `사용자 ID ${notification.user_id}에 대한 알림 생성 실패:`,
                  error,
                  "\n상세 오류:",
                  error.details,
                  "\n오류 코드:",
                  error.code,
                  "\n오류 메시지:",
                  error.message
                );
              } else {
                console.log(`사용자 ID ${notification.user_id}에 대한 알림 생성 성공:`, data);
              }
            } catch (individualError) {
              console.error(
                `사용자 ID ${notification.user_id}에 대한 알림 생성 중 예외 발생:`,
                individualError
              );
            }
          }
        } else {
          console.log(`${finalUserIds.length}개의 개인 알림이 생성되었습니다`, notificationsData);
        }
      } catch (notificationError) {
        console.error(
          "개인 알림 생성 중 예외 발생:",
          notificationError,
          "\n스택 트레이스:",
          notificationError.stack
        );
      }
    } catch (error) {
      console.error("알림 생성 중 오류 발생:", error);
    }
  };

  // 당사자 유형에 따른 레이블 반환
  const getPartyTypeLabel = (partyType) => {
    switch (partyType) {
      case "plaintiff":
        return "원고";
      case "defendant":
        return "피고";
      case "creditor":
        return "채권자";
      case "debtor":
        return "채무자";
      case "applicant":
        return "신청인";
      case "respondent":
        return "피신청인";
      default:
        return partyType;
    }
  };

  if (!lawsuit) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">먼저 소송을 선택해주세요</p>
      </div>
    );
  }

  return (
    <Card
      className="w-full border-0 bg-white/90 dark:bg-slate-900/90 shadow-md rounded-xl overflow-hidden backdrop-blur-sm"
      id="timeline-component"
    >
      <CardContent className="pt-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <TabsTrigger
              value="all"
              className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md"
            >
              <List className="h-3.5 w-3.5" />
              <span className="text-xs">전체</span>
            </TabsTrigger>
            <TabsTrigger
              value="송달문서"
              className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="text-xs">송달문서</span>
            </TabsTrigger>
            <TabsTrigger
              value="제출문서"
              className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span className="text-xs">제출문서</span>
            </TabsTrigger>
            <TabsTrigger
              value="기일"
              className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">기일</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {renderTimeline()}
          </TabsContent>
          <TabsContent value="송달문서" className="mt-4">
            {renderTimeline()}
          </TabsContent>
          <TabsContent value="제출문서" className="mt-4">
            {renderTimeline()}
          </TabsContent>
          <TabsContent value="기일" className="mt-4">
            {renderTimeline()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
