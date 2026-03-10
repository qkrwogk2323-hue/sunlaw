"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileCheck, Upload, X, Calendar, ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import FileUploadDropzone from "@/components/ui/file-upload-dropzone";
import { v4 as uuidv4 } from "uuid";
import { Switch } from "@/components/ui/switch";

// 스토리지 버킷 이름을 정의합니다
const BUCKET_NAME = "case-files";

// 문서 유형 예시
const DOCUMENT_TYPE_EXAMPLES = {
  송달문서: ["소장", "준비서면", "석명준비명령", "변론기일통지서", "결정문", "판결문"],
  제출문서: ["답변서", "준비서면", "증거신청서", "사실조회신청서", "항소장", "상고장"],
};

export default function AddSubmissionModal({
  open,
  onOpenChange,
  onSuccess,
  caseId,
  lawsuitId,
  parties = [],
  lawsuitType,
  editingSubmission = null,
  caseDetails = null,
  clients = null,
}) {
  const { user } = useUser();
  const isEditMode = !!editingSubmission;
  const [formData, setFormData] = useState({
    submission_type: editingSubmission?.submission_type || "송달문서",
    document_type: editingSubmission?.document_type || "",
    submission_date: editingSubmission?.submission_date
      ? new Date(editingSubmission.submission_date)
      : new Date(),
    description: editingSubmission?.description || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [lawsuitDetails, setLawsuitDetails] = useState(null);
  const [isAmendmentOrder, setIsAmendmentOrder] = useState(
    editingSubmission?.document_type === "보정명령" || false
  );
  const [partiesInfoText, setPartiesInfoText] = useState("");

  // 송달/제출 유형 상수
  const submissionTypes = [
    { value: "송달문서", label: "송달문서", icon: ArrowDown },
    { value: "제출문서", label: "제출문서", icon: ArrowUp },
  ];

  // 모달이 열릴 때 폼 데이터 초기화 및 사건/소송 정보 가져오기
  useEffect(() => {
    if (open) {
      if (isEditMode && editingSubmission) {
        // 수정 모드인 경우 기존 데이터로 초기화
        setFormData({
          submission_type: editingSubmission.submission_type || "송달문서",
          document_type: editingSubmission.document_type || "",
          submission_date: editingSubmission.submission_date
            ? new Date(editingSubmission.submission_date)
            : new Date(),
          description: editingSubmission.description || "",
        });
        setFileToUpload(null);
        setFormErrors({});
      } else {
        // 추가 모드인 경우 기본값으로 초기화
        setFormData({
          submission_type: "송달문서",
          document_type: "",
          submission_date: new Date(),
          description: "",
        });
        setFileToUpload(null);
        setFormErrors({});
      }

      // 사건 및 소송 정보 로드 - props로 전달된 정보가 있으면 API 호출 건너뛰기
      if (caseDetails && lawsuitId && lawsuitType) {
        // props로 전달된 정보가 있는 경우 - API 호출 없이 데이터 설정
        console.log("props로 전달된 사건/소송 정보 사용");
        setLawsuitDetails({
          id: lawsuitId,
          lawsuit_type: lawsuitType,
        });
      } else {
        // props로 충분한 정보가 없는 경우 - API 호출
        fetchCaseAndLawsuitDetails();
      }
    }
  }, [open, isEditMode, editingSubmission, caseDetails, lawsuitId, lawsuitType]);

  // isAmendmentOrder 상태 변경을 처리하는 별도의 useEffect 추가
  useEffect(() => {
    if (isAmendmentOrder) {
      // 보정명령 스위치가 켜진 경우 문서 유형 강제 설정
      setFormData((prev) => ({
        ...prev,
        submission_type: "송달문서",
        document_type: "보정명령",
      }));

      // 당사자 정보 텍스트 생성
      let partiesText = "";
      if (parties && parties.length > 0) {
        const creditor = parties.find((p) =>
          ["plaintiff", "creditor", "applicant"].includes(p.party_type)
        );
        const debtor = parties.find((p) =>
          ["defendant", "debtor", "respondent"].includes(p.party_type)
        );

        if (creditor) {
          const creditorName =
            creditor.entity_type === "individual"
              ? creditor.name
              : creditor.company_name || "미지정";
          partiesText += `채권자: ${creditorName}`;
        }

        if (debtor) {
          const debtorName =
            debtor.entity_type === "individual" ? debtor.name : debtor.company_name || "미지정";
          partiesText += partiesText ? `, 채무자: ${debtorName}` : `채무자: ${debtorName}`;
        }
      }
      setPartiesInfoText(partiesText || "당사자 정보 없음");
    }
  }, [isAmendmentOrder, parties]);

  // 소송과 사건 정보를 불러오는 함수
  const fetchCaseAndLawsuitDetails = async () => {
    try {
      if (!caseId) {
        console.error("사건 ID가 없습니다.");
        return;
      }

      console.log("사건 정보 로드 시작 - 사건 ID:", caseId);

      // props로 사건 정보가 전달된 경우 API 호출 건너뛰기
      let caseData = caseDetails;

      // 사건 정보가 없는 경우에만 API 호출
      if (!caseData) {
        const { data, error } = await supabase
          .from("test_cases")
          .select("*")
          .eq("id", caseId)
          .single();

        if (error) {
          console.error("사건 정보 조회 실패:", error);
          return;
        }

        caseData = data;
        console.log("사건 정보 로드 성공:", caseData);
      }

      // 소송 정보 조회 (lawsuitId가 있는 경우)
      if (lawsuitId) {
        console.log("소송 정보 로드 시작 - 소송 ID:", lawsuitId);

        // 이미 소송 유형이 전달된 경우 API 호출 건너뛰기
        if (lawsuitType) {
          const lawsuitData = {
            id: lawsuitId,
            lawsuit_type: lawsuitType,
          };
          setLawsuitDetails(lawsuitData);
          return {
            caseDetails: caseData,
            lawsuitDetails: lawsuitData,
          };
        }

        // 소송 정보가 없는 경우 API 호출
        const { data: lawsuitData, error: lawsuitError } = await supabase
          .from("test_case_lawsuits")
          .select("*")
          .eq("id", lawsuitId)
          .single();

        if (lawsuitError) {
          console.error("소송 정보 조회 실패:", lawsuitError);
        } else {
          console.log("소송 정보 로드 성공:", lawsuitData);
          setLawsuitDetails(lawsuitData);
          return {
            caseDetails: caseData,
            lawsuitDetails: lawsuitData,
          };
        }
      }

      return {
        caseDetails: caseData,
        lawsuitDetails: null,
      };
    } catch (error) {
      console.error("사건/소송 정보 로드 실패:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: null,
      });
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;

    // 파일 사이즈 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기 초과", {
        description: "10MB 이하의 파일만 업로드할 수 있습니다.",
      });
      return;
    }

    setFileToUpload(file);
  };

  const resetFileUpload = () => {
    setFileToUpload(null);
    const fileInput = document.getElementById("submission-file");
    if (fileInput) fileInput.value = "";
  };

  const validateForm = () => {
    const errors = {};

    // 필수 필드 검증
    if (!formData.submission_type) {
      errors.submission_type = "제출 유형을 선택해주세요";
    }

    if (!formData.document_type) {
      errors.document_type = "문서 유형을 선택해주세요";
    }

    if (!formData.submission_date) {
      errors.submission_date = "제출 날짜를 선택해주세요";
    }

    // 파일 검증 (수정 모드에서는 파일이 없어도 됨)
    if (!isEditMode && !fileToUpload && !formData.description) {
      errors.file = "파일을 업로드하거나 설명을 입력해주세요";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createNotification = async (submissionData) => {
    try {
      // 모든 의뢰인과 담당자의 ID를 수집하기 위한 Set
      const userIds = new Set();

      console.log("알림 생성: 사건 ID =", caseId);
      console.log("알림 생성: 제출 정보 =", submissionData);

      // 1. 사건 담당자 조회
      console.log("알림 생성: 담당자 조회 시작");
      const { data: handlersData, error: handlersError } = await supabase
        .from("test_case_handlers")
        .select("user_id")
        .eq("case_id", caseId);

      if (handlersError) {
        console.error("사건 담당자 조회 실패:", handlersError);
      } else if (handlersData && handlersData.length > 0) {
        console.log(`담당자 ${handlersData.length}명 발견:`, handlersData);
        handlersData.forEach((handler) => {
          if (handler.user_id) {
            userIds.add(handler.user_id);
            console.log("담당자 ID 추가:", handler.user_id);
          }
        });
      } else {
        console.log("담당자 없음");
      }

      // 2. 의뢰인 조회
      console.log("알림 생성: 의뢰인 조회 시작");
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
        .eq("case_id", caseId);

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

      // 알림 제목과 내용 설정
      let title = "";

      // 알림 제목 설정 - 문서 유형에 따라 다르게 설정
      if (submissionData.submission_type === "송달문서") {
        title = `${submissionData.document_type}이(가) 송달되었습니다`;
      } else if (submissionData.submission_type === "제출문서") {
        title = `${submissionData.document_type}이(가) 제출되었습니다`;
      } else {
        title = `${submissionData.document_type} 문서가 등록되었습니다`;
      }

      // 소송 번호와 채권자/채무자 정보 조회
      let caseNumber = "";
      let creditorName = "미지정";
      let debtorName = "미지정";

      // 소송 번호 가져오기
      if (caseDetails && caseDetails.case_number) {
        caseNumber = caseDetails.case_number;
      } else {
        // 소송 번호 조회
        const { data: lawsuitData, error: lawsuitError } = await supabase
          .from("test_case_lawsuits")
          .select("case_number")
          .eq("id", lawsuitId)
          .single();

        if (!lawsuitError && lawsuitData) {
          caseNumber = lawsuitData.case_number || "";
        }
      }

      try {
        // 소송 당사자 정보 가져오기
        const { data: lawsuitParties, error: partiesError } = await supabase
          .from("test_lawsuit_parties")
          .select("party_id, party_type")
          .eq("lawsuit_id", lawsuitId);

        if (!partiesError && lawsuitParties && lawsuitParties.length > 0) {
          const partyIds = lawsuitParties.map((p) => p.party_id);

          // 당사자 상세 정보 조회
          const { data: partiesData, error: partiesDataError } = await supabase
            .from("test_case_parties")
            .select("*")
            .in("id", partyIds);

          if (!partiesDataError && partiesData) {
            // 당사자 관계와 상세 정보 결합
            const parties = partiesData.map((party) => {
              const lawsuitParty = lawsuitParties.find((lp) => lp.party_id === party.id);
              return {
                ...party,
                party_type: lawsuitParty?.party_type,
              };
            });

            // 원고/채권자/신청인 및 피고/채무자/피신청인 찾기
            parties.forEach((party) => {
              if (["plaintiff", "creditor", "applicant"].includes(party.party_type)) {
                creditorName =
                  party.entity_type === "individual" ? party.name : party.company_name || "미지정";
              } else if (["defendant", "debtor", "respondent"].includes(party.party_type)) {
                debtorName =
                  party.entity_type === "individual" ? party.name : party.company_name || "미지정";
              }
            });
          }
        }
      } catch (err) {
        console.error("당사자 정보 조회 실패:", err);
      }

      // 알림 내용 설정 - 사건번호_채권자(채무자) 형식
      const message = `${caseNumber}_${creditorName}(${debtorName})`;

      // caseId 확인 (실제 사건 테이블에 존재하는지 확인)
      const { data: caseData, error: caseError } = await supabase
        .from("test_cases")
        .select("id")
        .eq("id", caseId)
        .single();

      if (caseError) {
        console.error("사건 조회 실패:", caseError);
        return;
      }

      // 실제 사용할 case_id
      const validCaseId = caseData.id;

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
          console.error("사건 알림 생성 실패:", caseNotificationError, "\ncase_id:", validCaseId);
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // 기존 파일 URL 유지 또는 null로 설정
      let fileUrl = isEditMode ? editingSubmission.file_url || null : null;

      // 파일 업로드 처리
      if (fileToUpload) {
        // 파일 이름에 타임스탬프 추가하여 중복 방지
        const fileExt = fileToUpload.name.split(".").pop();
        const fileName = `${caseId}/${lawsuitId}/${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const filePath = `lawsuit-submissions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error("파일 업로드 오류:", uploadError);
          throw uploadError;
        }

        // 파일 URL 생성
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      // 현재 사용자 ID 가져오기
      const currentUser = user?.id;

      // 설명 필드에 당사자 정보 추가 (보정명령인 경우에만)
      let descriptionText = formData.description;
      if (isAmendmentOrder && partiesInfoText) {
        descriptionText = `${partiesInfoText}\n${descriptionText}`;
      }

      // 데이터 준비
      const submissionData = {
        lawsuit_id: lawsuitId,
        submission_type: formData.submission_type,
        document_type: formData.document_type,
        submission_date: formData.submission_date.toISOString().split("T")[0],
        description: descriptionText,
        file_url: fileUrl,
      };

      // 수정 모드인지 신규 추가인지 확인
      if (isEditMode && editingSubmission) {
        // 기존 데이터와 비교하여 변경점 확인
        const originalSubmission = editingSubmission;
        const typeChanged =
          originalSubmission.submission_type !== submissionData.submission_type ||
          originalSubmission.document_type !== submissionData.document_type;

        // 파일 URL이 변경되지 않았다면 업데이트 데이터에서 제외
        if (fileUrl === originalSubmission.file_url) {
          delete submissionData.file_url;
        }

        // 문서 업데이트
        const { data: updatedSubmission, error } = await supabase
          .from("test_lawsuit_submissions")
          .update(submissionData)
          .eq("id", editingSubmission.id)
          .select()
          .single();

        if (error) {
          console.error("문서 업데이트 실패:", error);
          throw error;
        }

        // 문서 유형이 변경된 경우에만 알림 생성
        if (typeChanged) {
          await createNotification(submissionData);
        }

        toast.success("문서가 수정되었습니다");

        if (onSuccess) onSuccess(updatedSubmission);
      } else {
        // 작성자 정보 추가
        submissionData.created_by = currentUser;

        // 새 문서 추가
        const { data: newSubmission, error } = await supabase
          .from("test_lawsuit_submissions")
          .insert(submissionData)
          .select()
          .single();

        if (error) {
          console.error("문서 추가 실패:", error);
          throw error;
        }

        // 새 문서에 대한 알림 생성
        await createNotification(submissionData);

        toast.success("문서가 추가되었습니다");

        if (onSuccess) onSuccess(newSubmission);
      }

      // 모달 닫기 및 상태 초기화
      onOpenChange(false);
    } catch (error) {
      console.error("문서 저장 실패:", error);
      toast.error(isEditMode ? "문서 수정 실패" : "문서 추가 실패", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 현재 타입에 따른 문서 유형 예시 가져오기
  const getDocumentTypeExamples = () => {
    return DOCUMENT_TYPE_EXAMPLES[formData.submission_type] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "타임라인 항목 수정" : "타임라인 항목 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="amendment-switch" className="font-medium">
                보정명령 문서 생성
              </Label>
              <Switch
                id="amendment-switch"
                checked={isAmendmentOrder}
                onCheckedChange={(checked) => {
                  setIsAmendmentOrder(checked);
                  if (checked) {
                    // 스위치를 켰을 때 즉시 폼 데이터 업데이트
                    setFormData((prev) => ({
                      ...prev,
                      submission_type: "송달문서",
                      document_type: "보정명령",
                    }));
                    setFormErrors((prev) => ({
                      ...prev,
                      submission_type: null,
                      document_type: null,
                    }));
                  }
                }}
              />
            </div>
            {isAmendmentOrder && (
              <p className="text-xs text-muted-foreground">
                보정명령 문서가 선택되었습니다. 문서 유형은 '송달문서'와 '보정명령'으로 자동
                설정됩니다.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>문서 유형</Label>
            <div className="flex gap-2">
              {submissionTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.submission_type === type.value ? "default" : "outline"}
                    className={cn("flex items-center gap-1 flex-1")}
                    onClick={() => handleInputChange("submission_type", type.value)}
                    disabled={isAmendmentOrder}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </Button>
                );
              })}
            </div>
            {formErrors.submission_type && (
              <p className="text-xs text-red-500">{formErrors.submission_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">문서 종류</Label>
            <Input
              id="document_type"
              value={formData.document_type}
              onChange={(e) => handleInputChange("document_type", e.target.value)}
              placeholder="문서 종류를 입력하세요"
              className={formErrors.document_type ? "border-red-500" : ""}
              disabled={isAmendmentOrder}
            />
            {formErrors.document_type && (
              <p className="text-xs text-red-500">{formErrors.document_type}</p>
            )}
            {!isAmendmentOrder && getDocumentTypeExamples().length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {getDocumentTypeExamples().map((example) => (
                  <Button
                    key={example}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto"
                    onClick={() => handleInputChange("document_type", example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {isAmendmentOrder && (
            <div className="space-y-2">
              <Label htmlFor="parties_info">당사자 정보</Label>
              <Input id="parties_info" value={partiesInfoText} disabled className="bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="submission_date">송달/제출일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="submission_date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.submission_date && "text-muted-foreground",
                    formErrors.submission_date && "border-red-500"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.submission_date ? (
                    format(formData.submission_date, "yyyy년 MM월 dd일", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={formData.submission_date}
                  onSelect={(date) => handleInputChange("submission_date", date)}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            {formErrors.submission_date && (
              <p className="text-xs text-red-500">{formErrors.submission_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="문서에 대한 설명을 입력하세요"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">첨부파일</Label>
            <div className="flex flex-col gap-2">
              <FileUploadDropzone
                onFileSelect={handleFileChange}
                onFileRemove={resetFileUpload}
                selectedFile={fileToUpload}
                existingFileUrl={editingSubmission?.file_url || null}
                fileUrlLabel="기존 파일이 있습니다"
                uploadLabel="파일을 이곳에 끌어서 놓거나 클릭하여 업로드"
                replaceLabel="파일을 이곳에 끌어서 놓거나 클릭하여 교체"
                id="submission-file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                maxSizeMB={10}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="ml-2">
            {isSubmitting ? "저장 중..." : isEditMode ? "수정" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
