"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, RefreshCw, Trash2, Edit, Download, Calendar, File, Link, Link2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CASE_TYPES, STATUS_TYPES, getCaseTypeByValue, getStatusByValue } from "@/utils/constants";

// 모달 컴포넌트 가져오기
import AddSubmissionModal from "./modals/AddSubmissionModal";
import AddLawsuitModal from "./modals/AddLawsuitModal";
import ScheduleFormModal from "./modals/ScheduleFormModal";
import AddRelatedLawsuitModal from "./modals/AddRelatedLawsuitModal";
// CaseTimeline 컴포넌트 가져오기
import CaseTimeline from "./LawsuitSubmissions";

// 기본 클래스명 정의
const defaultClassName =
  "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

// STATUS_TYPES를 소송 상태 매핑에 활용
const LAWSUIT_STATUS = {
  pending: {
    label: STATUS_TYPES.pending.name,
    className: STATUS_TYPES.pending.className,
  },
  in_progress: {
    label: STATUS_TYPES.in_progress.name,
    className: STATUS_TYPES.in_progress.className,
  },
  completed: {
    label: STATUS_TYPES.completed.name,
    className: STATUS_TYPES.completed.className,
  },
};

// CASE_TYPES를 소송 유형 매핑에 활용
const LAWSUIT_TYPES = {
  civil: {
    label: CASE_TYPES.civil.name,
    className: CASE_TYPES.civil.className,
  },
  bankruptcy: {
    label: CASE_TYPES.bankruptcy.name,
    className: CASE_TYPES.bankruptcy.className,
  },
  payment_order: {
    label: CASE_TYPES.payment_order.name,
    className: CASE_TYPES.payment_order.className,
  },
  execution: {
    label: CASE_TYPES.execution.name,
    className: CASE_TYPES.execution.className,
  },
};

const PARTY_ORDER = {
  plaintiff: 1, // 원고
  creditor: 2, // 채권자
  applicant: 3, // 신청인
  defendant: 4, // 피고
  debtor: 5, // 채무자
  respondent: 6, // 피신청인
};

export default function LawsuitManager({ caseId, onDataChange, caseData, parties, clients }) {
  const { user } = useUser();
  const [lawsuits, setLawsuits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [localParties, setLocalParties] = useState(parties || []);
  const [relatedLawsuits, setRelatedLawsuits] = useState([]);
  const [loadingRelatedLawsuits, setLoadingRelatedLawsuits] = useState(false);

  // 모달 상태
  const [showAddSubmissionModal, setShowAddSubmissionModal] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [showAddLawsuitModal, setShowAddLawsuitModal] = useState(false);
  const [editingLawsuit, setEditingLawsuit] = useState(null);
  // 기일 모달 관련 상태 추가
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  // 관련 소송 모달 관련 상태 추가
  const [showAddRelatedLawsuitModal, setShowAddRelatedLawsuitModal] = useState(false);
  const [editingRelatedLawsuit, setEditingRelatedLawsuit] = useState(null);

  // 스토리지 버킷 이름 정의
  const BUCKET_NAME = "case-files";

  useEffect(() => {
    if (caseId) {
      fetchLawsuits();
      // parties props가 전달되지 않은 경우에만 fetchParties 호출
      if (!parties) {
        fetchParties();
      } else {
        setLocalParties(parties);
      }
    }
  }, [caseId, parties]);

  // parties props가 업데이트되면 localParties 업데이트
  useEffect(() => {
    if (parties) {
      setLocalParties(parties);
    }
  }, [parties]);

  useEffect(() => {
    if (activeTab) {
      fetchSubmissions(activeTab);
      fetchRelatedLawsuits(activeTab);
    }
  }, [activeTab]);

  const fetchLawsuits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_case_lawsuits")
        .select(
          `
          *,
          test_lawsuit_parties(
            id,
            party_id,
            party_type,
            party:party_id(
              id,
              name,
              company_name,
              entity_type
            )
          )
        `
        )
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setLawsuits(data || []);

      // 첫 번째 소송을 기본 선택
      if (data && data.length > 0 && !activeTab) {
        setActiveTab(data[0].id);
      }
    } catch (error) {
      console.error("소송 조회 실패:", error);
      toast.error("소송 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const { data, error } = await supabase
        .from("test_case_parties")
        .select("*")
        .eq("case_id", caseId);

      if (error) throw error;
      setLocalParties(data || []);
    } catch (error) {
      console.error("당사자 조회 실패:", error);
      toast.error("당사자 목록을 불러오는데 실패했습니다");
    }
  };

  const fetchSubmissions = async (lawsuitId) => {
    setLoadingSubmissions(true);
    try {
      // test_lawsuit_submissions 테이블이 아직 생성되지 않았거나 쿼리 문제가 있을 수 있음
      const { data, error } = await supabase
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
          created_at,
          created_by,
          created_by_user:created_by(id, name, email)
        `
        )
        .eq("lawsuit_id", lawsuitId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("송달/제출 내역 조회 실패:", error);
        toast.error("송달/제출 내역을 불러오는데 실패했습니다");
        setSubmissions([]);
        return;
      }

      console.log("송달/제출 내역 조회 결과:", data);
      setSubmissions(data || []);
    } catch (error) {
      console.error("송달/제출 내역 조회 중 예외 발생:", error);
      toast.error("송달/제출 내역을 불러오는데 실패했습니다");
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchRelatedLawsuits = async (lawsuitId) => {
    setLoadingRelatedLawsuits(true);
    try {
      const { data, error } = await supabase
        .from("test_related_lawsuits")
        .select("*")
        .eq("lawsuit_id", lawsuitId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("관련 소송 조회 실패:", error);
        toast.error("관련 소송 목록을 불러오는데 실패했습니다");
        setRelatedLawsuits([]);
        return;
      }

      console.log("관련 소송 조회 결과:", data);
      setRelatedLawsuits(data || []);
    } catch (error) {
      console.error("관련 소송 조회 중 예외 발생:", error);
      toast.error("관련 소송 목록을 불러오는데 실패했습니다");
      setRelatedLawsuits([]);
    } finally {
      setLoadingRelatedLawsuits(false);
    }
  };

  const handleAddSubmission = () => {
    setEditingSubmission(null);
    setShowAddSubmissionModal(true);
  };

  const handleEditSubmission = (submission) => {
    setEditingSubmission(submission);
    setShowAddSubmissionModal(true);
  };

  // 기일 추가 핸들러
  const handleAddSchedule = () => {
    if (!activeTab) {
      toast.error("기일 추가 실패", {
        description: "소송이 선택되지 않았습니다. 먼저 소송을 선택해주세요.",
      });
      return;
    }

    const selectedLawsuit = lawsuits.find((l) => l.id === activeTab);
    if (!selectedLawsuit) {
      toast.error("기일 추가 실패", {
        description: "선택된 소송 정보를 찾을 수 없습니다.",
      });
      return;
    }

    setEditingSchedule(null);
    setShowAddScheduleModal(true);
  };

  // 기일 편집 핸들러
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setShowAddScheduleModal(true);
  };

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
        return "기타";
    }
  };

  const handleAddLawsuit = () => {
    setEditingLawsuit(null);
    setShowAddLawsuitModal(true);
  };

  const handleEditLawsuit = (lawsuit) => {
    setEditingLawsuit(lawsuit);
    setShowAddLawsuitModal(true);
  };

  const handleDeleteLawsuit = async (lawsuitId) => {
    try {
      console.log("소송 삭제 시작:", lawsuitId);

      // 0. 삭제 전 테이블과 소송 데이터 확인
      try {
        const { data, error } = await supabase
          .from("test_case_lawsuits")
          .select("*")
          .eq("id", lawsuitId)
          .single();

        if (error) {
          console.error("소송 데이터 확인 실패:", error);
        } else {
          console.log("삭제할 소송 데이터:", data);
        }
      } catch (checkError) {
        console.error("소송 데이터 확인 중 오류:", checkError);
      }

      // 1. 해당 소송에 속한 모든 제출 삭제
      try {
        console.log("제출 서류 삭제 시작");
        const { data: submissionsData, error: submissionsCheckError } = await supabase
          .from("test_lawsuit_submissions")
          .select("count")
          .eq("lawsuit_id", lawsuitId);

        if (submissionsCheckError) {
          console.error("제출 서류 조회 실패:", submissionsCheckError);
        } else {
          console.log("삭제할 제출 서류 수:", submissionsData);
        }

        const { error: submissionsError } = await supabase
          .from("test_lawsuit_submissions")
          .delete()
          .eq("lawsuit_id", lawsuitId);

        if (submissionsError) {
          console.error("제출 서류 삭제 실패:", submissionsError);
        } else {
          console.log("제출 서류 삭제 완료");
        }
      } catch (submissionsDeleteError) {
        console.error("제출 서류 삭제 중 오류:", submissionsDeleteError);
        // 오류가 발생해도 계속 진행
      }

      // 2. 해당 소송에 속한 기일 정보 삭제
      try {
        console.log("기일 정보 삭제 시작");
        const { data: schedulesData, error: schedulesCheckError } = await supabase
          .from("test_schedules")
          .select("id") // count 대신 id만 조회
          .eq("lawsuit_id", lawsuitId);

        if (schedulesCheckError) {
          console.error("기일 정보 조회 실패:", schedulesCheckError);
        } else {
          console.log(`삭제할 기일 정보 수: ${schedulesData ? schedulesData.length : 0}개`);
        }

        const { error: schedulesError } = await supabase
          .from("test_schedules")
          .delete()
          .eq("lawsuit_id", lawsuitId);

        if (schedulesError) {
          console.error("기일 정보 삭제 실패:", schedulesError);
        } else {
          console.log("기일 정보 삭제 완료");
        }
      } catch (schedulesDeleteError) {
        console.error("기일 정보 삭제 중 오류:", schedulesDeleteError);
        // 오류가 발생해도 계속 진행
      }

      // 3. 해당 소송에 속한 당사자 관계 삭제
      try {
        console.log("소송 당사자 관계 삭제 시작");
        const { data: partiesData, error: partiesCheckError } = await supabase
          .from("test_lawsuit_parties")
          .select("count")
          .eq("lawsuit_id", lawsuitId);

        if (partiesCheckError) {
          console.error("소송 당사자 관계 조회 실패:", partiesCheckError);
        } else {
          console.log("삭제할 소송 당사자 관계 수:", partiesData);
        }

        const { error: partiesError } = await supabase
          .from("test_lawsuit_parties")
          .delete()
          .eq("lawsuit_id", lawsuitId);

        if (partiesError) {
          console.error("소송 당사자 관계 삭제 실패:", partiesError);
        } else {
          console.log("소송 당사자 관계 삭제 완료");
        }
      } catch (partiesDeleteError) {
        console.error("소송 당사자 관계 삭제 중 오류:", partiesDeleteError);
        // 오류가 발생해도 계속 진행
      }

      // 4. 마지막으로 소송 자체 삭제
      try {
        console.log("소송 삭제 시작");
        const { error } = await supabase.from("test_case_lawsuits").delete().eq("id", lawsuitId);

        if (error) {
          console.error("소송 삭제 실패:", error);
          throw error; // 소송 삭제 실패는 중요하므로 예외 발생
        } else {
          console.log("소송 삭제 완료");
        }
      } catch (lawsuitDeleteError) {
        console.error("소송 삭제 중 오류:", lawsuitDeleteError);
        throw lawsuitDeleteError; // 소송 삭제 실패는 중요하므로 예외 발생
      }

      console.log("소송 삭제 성공");
      toast.success("소송 정보가 삭제되었습니다");

      // 소송 목록 새로고침
      fetchLawsuits();

      // 활성 탭 초기화
      setActiveTab(null);
      setSubmissions([]);

      // 데이터 변경 알림
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("소송 삭제 실패:", error.message || error);
      toast.error("소송 삭제에 실패했습니다");
    }
  };

  const handleSubmissionSuccess = (data) => {
    setEditingSubmission(null);
    setShowAddSubmissionModal(false);
    toast.success("제출 정보가 저장되었습니다");
    // 제출 정보 다시 불러오기
    fetchSubmissions(activeTab);
    // 데이터 변경 알림
    if (onDataChange) onDataChange();
  };

  const handleLawsuitSuccess = (addedLawsuit) => {
    setEditingLawsuit(null);
    setShowAddLawsuitModal(false);
    fetchLawsuits();
    // 데이터 변경 알림
    if (onDataChange) onDataChange();
  };

  // 관련 소송 추가 핸들러
  const handleAddRelatedLawsuit = () => {
    if (!activeTab) {
      toast.error("관련 소송 추가 실패", {
        description: "소송이 선택되지 않았습니다. 먼저 소송을 선택해주세요.",
      });
      return;
    }

    setEditingRelatedLawsuit(null);
    setShowAddRelatedLawsuitModal(true);
  };

  // 관련 소송 편집 핸들러
  const handleEditRelatedLawsuit = (relatedLawsuit) => {
    setEditingRelatedLawsuit(relatedLawsuit);
    setShowAddRelatedLawsuitModal(true);
  };

  // 관련 소송 삭제 핸들러
  const handleDeleteRelatedLawsuit = async (relatedLawsuitId) => {
    try {
      const { error } = await supabase
        .from("test_related_lawsuits")
        .delete()
        .eq("id", relatedLawsuitId);

      if (error) {
        console.error("관련 소송 삭제 실패:", error);
        toast.error("관련 소송 삭제에 실패했습니다");
        return;
      }

      toast.success("관련 소송이 삭제되었습니다");
      fetchRelatedLawsuits(activeTab);
    } catch (error) {
      console.error("관련 소송 삭제 중 오류 발생:", error);
      toast.error("관련 소송 삭제에 실패했습니다");
    }
  };

  // 관련 소송 성공 핸들러
  const handleRelatedLawsuitSuccess = (data) => {
    setEditingRelatedLawsuit(null);
    setShowAddRelatedLawsuitModal(false);
    toast.success("관련 소송 정보가 저장되었습니다");
    // 관련 소송 정보 다시 불러오기
    fetchRelatedLawsuits(activeTab);
    // 데이터 변경 알림
    if (onDataChange) onDataChange();
  };

  const renderLawsuitInfo = (lawsuit) => {
    if (!lawsuit) return null;

    const getLawsuitType = (type) => {
      return LAWSUIT_TYPES[type] || { label: type, className: defaultClassName };
    };

    const getStatusBadge = (status) => {
      const statusInfo = LAWSUIT_STATUS[status] || { label: status, className: defaultClassName };
      return (
        <Badge className={`ml-2 ${statusInfo.className || defaultClassName}`}>
          {statusInfo.label}
        </Badge>
      );
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return "미지정";
      return format(new Date(dateStr), "yyyy년 MM월 dd일", { locale: ko });
    };

    const { label: typeLabel } = getLawsuitType(lawsuit.lawsuit_type);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="whitespace-pre-line text-gray-400">{`${lawsuit.court_name} ${
              lawsuit.case_number
            } ${lawsuit.type || ""}`}</p>
            {lawsuit.test_lawsuit_parties && lawsuit.test_lawsuit_parties.length > 0 ? (
              (() => {
                // lawsuit 내부에서 실시간으로 데이터 그룹화
                const groupedParties = lawsuit.test_lawsuit_parties.reduce((acc, partyRel) => {
                  // party 정보가 partyRel.party에 있는 경우 (조인된 경우)
                  const party =
                    partyRel.party || localParties.find((p) => p.id === partyRel.party_id);
                  if (!party) return acc;

                  const label = getPartyTypeLabel(partyRel.party_type);
                  if (!acc[label]) acc[label] = [];

                  // entity_type에 따라 이름 표시 방법 결정
                  const partyName =
                    party.entity_type === "individual"
                      ? party.name
                      : party.company_name || "이름 정보 없음";

                  acc[label].push(partyName);
                  return acc;
                }, {});

                // 원고(원고/신청인/채권자)가 항상 위에 오도록 정렬
                const orderedPartyTypes = Object.keys(groupedParties).sort((a, b) => {
                  // 원고/신청인/채권자 관련 유형
                  const creditorTypes = ["원고", "신청인", "채권자"];
                  // 피고/채무자 관련 유형
                  const debtorTypes = ["피고", "피신청인", "채무자"];

                  // 원고 유형은 항상 위로
                  if (creditorTypes.includes(a) && !creditorTypes.includes(b)) {
                    return -1;
                  }
                  // 피고 유형은 항상 아래로
                  if (!creditorTypes.includes(a) && creditorTypes.includes(b)) {
                    return 1;
                  }
                  // 원고 유형 내에서는 원고, 신청인, 채권자 순으로
                  if (creditorTypes.includes(a) && creditorTypes.includes(b)) {
                    return creditorTypes.indexOf(a) - creditorTypes.indexOf(b);
                  }
                  // 피고 유형 내에서는 피고, 피신청인, 채무자 순으로
                  if (debtorTypes.includes(a) && debtorTypes.includes(b)) {
                    return debtorTypes.indexOf(a) - debtorTypes.indexOf(b);
                  }

                  // 그 외 경우는 기존 PARTY_ORDER 사용
                  return (PARTY_ORDER[a] || 99) - (PARTY_ORDER[b] || 99);
                });

                return (
                  <div className="space-y-2">
                    {orderedPartyTypes.map((partyType) => (
                      <p key={partyType} className="text-sm">
                        <span className="font-medium">{partyType}:</span>{" "}
                        {groupedParties[partyType].join(", ")}
                      </p>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">등록된 당사자가 없습니다.</p>
            )}
          </div>

          {user && (user.role === "admin" || user.role === "staff") && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEditLawsuit(lawsuit)}>
                <Edit className="h-4 w-4 mr-1" />
                수정
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-500">
                    <Trash2 className="h-4 w-4 mr-1" />
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>소송 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 소송을 정말로 삭제하시겠습니까? 관련된 모든 송달/제출 내역도 함께
                      삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteLawsuit(lawsuit.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* 관련 소송 섹션 */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">관련 소송</h3>
            {user && (user.role === "admin" || user.role === "staff") && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddRelatedLawsuit}
                disabled={!activeTab}
              >
                <Link2 className="h-4 w-4 mr-1" />
                추가
              </Button>
            )}
          </div>

          {loadingRelatedLawsuits ? (
            <div className="space-y-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : relatedLawsuits.length === 0 ? (
            <div className="text-center py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-muted-foreground">
              등록된 관련 소송이 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {relatedLawsuits.map((relatedLawsuit) => (
                <div
                  key={relatedLawsuit.id}
                  className="flex justify-between items-center py-1 text-sm"
                >
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-1">
                      <Badge
                        className={`px-2 py-0.5 ${
                          LAWSUIT_TYPES[relatedLawsuit.lawsuit_type]?.className || defaultClassName
                        }`}
                      >
                        {LAWSUIT_TYPES[relatedLawsuit.lawsuit_type]?.label ||
                          relatedLawsuit.lawsuit_type ||
                          "기타"}
                      </Badge>
                      <span className="font-medium truncate">
                        {relatedLawsuit.court_name} {relatedLawsuit.case_number}{" "}
                        {relatedLawsuit.type}
                      </span>
                    </div>
                    {relatedLawsuit.description && (
                      <p className="text-muted-foreground truncate">{relatedLawsuit.description}</p>
                    )}
                  </div>
                  {user && (user.role === "admin" || user.role === "staff") && (
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditRelatedLawsuit(relatedLawsuit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>관련 소송 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 관련 소송을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRelatedLawsuit(relatedLawsuit.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CaseTimeline 컴포넌트 사용 - AddSubmissionModal과 연결 */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg ">소송 진행 타임라인</h3>
            {user && (user.role === "admin" || user.role === "staff") && (
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleAddSchedule} disabled={!activeTab}>
                  <Calendar className="h-4 w-4 mr-1" />
                  기일 추가
                </Button>
                <Button size="sm" onClick={handleAddSubmission} disabled={!activeTab}>
                  문서 추가
                </Button>
              </div>
            )}
          </div>
          <CaseTimeline
            id="timeline-component"
            lawsuit={lawsuits.find((l) => l.id === activeTab)}
            viewOnly={!(user && (user.role === "admin" || user.role === "staff"))}
            onSuccess={() => {
              toast.success("타임라인이 업데이트되었습니다");
            }}
            onEdit={handleEditSubmission}
            onScheduleEdit={handleEditSchedule}
            onScheduleAdd={handleAddSchedule}
          />
        </div>
      </div>
    );
  };

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-[300px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // 소송이 없는 경우
  if (lawsuits.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md bg-white/90 dark:bg-slate-900/90 shadow-md backdrop-blur-sm">
        <File className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="mb-4 text-muted-foreground">등록된 소송이 없습니다</p>
        {user && (user.role === "admin" || user.role === "staff") && (
          <Button
            variant="outline"
            onClick={handleAddLawsuit}
            className="bg-white/90 hover:bg-gray-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-gray-200 dark:border-gray-700"
          >
            <Plus className="mr-2 h-4 w-4" /> 소송 등록하기
          </Button>
        )}
        {showAddLawsuitModal && (
          <AddLawsuitModal
            open={showAddLawsuitModal}
            onOpenChange={setShowAddLawsuitModal}
            onSuccess={handleLawsuitSuccess}
            caseId={caseId}
            parties={localParties}
            editingLawsuit={editingLawsuit}
            caseDetails={caseData}
            clients={clients}
          />
        )}
      </div>
    );
  }

  return (
    <Card className="space-y-6 border-0 bg-white/90 dark:bg-slate-900/90 shadow-md rounded-xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">소송 관리</CardTitle>
          <div className="flex gap-2">
            {user && (user.role === "admin" || user.role === "staff") && (
              <Button size="sm" onClick={handleAddLawsuit}>
                <Plus className="mr-1 h-4 w-4" />
                소송 등록
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full flex flex-wrap h-auto bg-gray-50 dark:bg-gray-900/50 border rounded-lg overflow-hidden">
            {loading ? (
              <div className="w-full p-2">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : lawsuits.length === 0 ? (
              <div className="text-center py-10 border rounded-md bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-sm">
                <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2 text-foreground">등록된 소송이 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  소송 정보를 추가하면 이 곳에 표시됩니다.
                </p>
                {user && (user.role === "admin" || user.role === "staff") && (
                  <Button
                    onClick={handleAddLawsuit}
                    className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    소송 등록하기
                  </Button>
                )}
              </div>
            ) : (
              lawsuits.map((lawsuit) => {
                const type = LAWSUIT_TYPES[lawsuit.lawsuit_type] || {
                  label: lawsuit.lawsuit_type || "기타",
                  className: defaultClassName,
                };
                const status = LAWSUIT_STATUS[lawsuit.status] || {
                  label: lawsuit.status || "상태미정",
                  className: defaultClassName,
                };

                return (
                  <TabsTrigger
                    key={lawsuit.id}
                    value={lawsuit.id}
                    className="flex-none h-auto py-2 px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 border-b-2 border-transparent data-[state=active]:border-blue-500"
                  >
                    <div className="flex flex-col items-start space-y-1 w-full">
                      <div className="flex flex-wrap gap-1 w-full">
                        <Badge className={`text-xs ${status.className || ""}`}>
                          {status.label}
                        </Badge>
                        <Badge className={`text-xs ${type.className || ""}`}>{type.label}</Badge>
                      </div>
                      <div className="text-xs text-left">
                        <span>{lawsuit.court_name}</span> <span>{lawsuit.case_number}</span>
                        {lawsuit.type && <span> {lawsuit.type}</span>}
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })
            )}
          </TabsList>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </div>
          ) : lawsuits.length === 0 ? (
            <div className="text-center py-10 border rounded-md bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-sm">
              <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">등록된 소송이 없습니다</h3>
              <p className="text-muted-foreground mb-4">소송 정보를 추가하면 이 곳에 표시됩니다.</p>
              {user && (user.role === "admin" || user.role === "staff") && (
                <Button
                  onClick={handleAddLawsuit}
                  className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  소송 등록하기
                </Button>
              )}
            </div>
          ) : (
            lawsuits.map((lawsuit) => (
              <TabsContent key={lawsuit.id} value={lawsuit.id}>
                <div className="space-y-6">{renderLawsuitInfo(lawsuit)}</div>
              </TabsContent>
            ))
          )}
        </Tabs>
      </CardContent>

      {/* 송달/제출 내역 추가/수정 모달 */}
      {showAddSubmissionModal && (
        <AddSubmissionModal
          open={showAddSubmissionModal}
          onOpenChange={setShowAddSubmissionModal}
          onSuccess={handleSubmissionSuccess}
          caseId={caseId}
          lawsuitId={activeTab}
          lawsuitType={lawsuits.find((l) => l.id === activeTab)?.lawsuit_type}
          parties={localParties}
          editingSubmission={editingSubmission}
          caseDetails={caseData}
          clients={clients}
        />
      )}

      {/* 소송 추가/수정 모달 */}
      {showAddLawsuitModal && (
        <AddLawsuitModal
          open={showAddLawsuitModal}
          onOpenChange={setShowAddLawsuitModal}
          onSuccess={handleLawsuitSuccess}
          caseId={caseId}
          parties={localParties}
          editingLawsuit={editingLawsuit}
          caseDetails={caseData}
          clients={clients}
        />
      )}

      {/* 기일 추가/수정 모달 */}
      {showAddScheduleModal && activeTab && (
        <ScheduleFormModal
          open={showAddScheduleModal}
          onOpenChange={setShowAddScheduleModal}
          onSuccess={handleSubmissionSuccess}
          lawsuit={lawsuits.find((l) => l.id === activeTab)}
          editingSchedule={editingSchedule}
          caseDetails={caseData}
          clients={clients}
        />
      )}

      {/* 관련 소송 추가/수정 모달 */}
      {showAddRelatedLawsuitModal && activeTab && (
        <AddRelatedLawsuitModal
          open={showAddRelatedLawsuitModal}
          onOpenChange={setShowAddRelatedLawsuitModal}
          onSuccess={handleRelatedLawsuitSuccess}
          lawsuitId={activeTab}
          editingRelatedLawsuit={editingRelatedLawsuit}
          caseId={caseId}
        />
      )}
    </Card>
  );
}
