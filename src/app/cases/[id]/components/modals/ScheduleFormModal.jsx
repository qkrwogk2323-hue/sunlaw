"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import FileUploadDropzone from "@/components/ui/file-upload-dropzone";

// 스토리지 버킷 이름 정의
const BUCKET_NAME = "case-files";

export default function ScheduleFormModal({
  open,
  onOpenChange,
  lawsuit,
  onSuccess,
  editingSchedule,
  caseDetails = null,
  clients = null,
}) {
  const { user } = useUser();
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    title: "",
    event_type: "",
    event_date: new Date(),
    location: "",
    description: "",
  });
  const [fileToUpload, setFileToUpload] = useState(null);

  const isEditMode = !!editingSchedule;

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      if (editingSchedule && editingSchedule.id) {
        // 수정 모드일 경우 기존 데이터로 폼 초기화
        setScheduleFormData({
          title: editingSchedule.title || "",
          event_type: editingSchedule.event_type || "",
          event_date: editingSchedule.event_date
            ? new Date(editingSchedule.event_date)
            : new Date(),
          location: editingSchedule.location || "",
          description: editingSchedule.description || "",
        });
        setFileToUpload(null);
      } else {
        // 추가 모드일 경우 기본값으로 폼 초기화
        resetScheduleForm();

        // 소송 정보가 있을 때 당사자 정보를 가져와서 설명에 미리 채워넣기
        if (lawsuit && lawsuit.id) {
          (async () => {
            try {
              // 당사자 정보 가져오기
              const { creditor, debtor } = await getLawsuitParties(lawsuit.id);

              // 채권자와 채무자 찾기
              let creditorName = "미지정";
              let debtorName = "미지정";

              if (creditor) {
                creditorName =
                  creditor.entity_type === "individual"
                    ? creditor.name
                    : creditor.company_name || "미지정";
              }
              if (debtor) {
                debtorName =
                  debtor.entity_type === "individual"
                    ? debtor.name
                    : debtor.company_name || "미지정";
              }

              // 당사자 정보 문자열 생성
              let partyInfoText = "";
              if (creditor || debtor) {
                const parts = [];

                if (creditor) {
                  const creditorLabel = getPartyTypeLabel(creditor.party_type);
                  parts.push(`${creditorLabel}: ${creditorName}`);
                }

                if (debtor) {
                  const debtorLabel = getPartyTypeLabel(debtor.party_type);
                  parts.push(`${debtorLabel}: ${debtorName}`);
                }

                if (parts.length > 0) {
                  partyInfoText = `당사자: ${parts.join(", ")}`;

                  // 설명란에 당사자 정보 미리 채우기
                  setScheduleFormData((prev) => ({
                    ...prev,
                    description: partyInfoText,
                  }));
                }
              }
            } catch (error) {
              console.error("당사자 정보 조회 실패:", error);
            }
          })();
        }
      }
    }
  }, [open, lawsuit, editingSchedule]);

  // 폼 초기화
  const resetScheduleForm = () => {
    const defaultTitle = lawsuit && lawsuit.case_number ? `${lawsuit.case_number} ` : "";

    setScheduleFormData({
      title: defaultTitle,
      event_type: "",
      event_date: new Date(),
      location: "",
      description: "",
    });

    setFileToUpload(null);
    setFormErrors({});
  };

  // 입력 처리
  const handleScheduleInputChange = (field, value) => {
    let updatedFormData = {
      ...scheduleFormData,
      [field]: value,
    };

    // event_type이 변경될 때 제목에 자동으로 기일 유형 추가
    if (field === "event_type" && value) {
      const currentTitle = scheduleFormData.title || "";
      // 현재 제목이 사건번호만 있거나 비어있으면 기일 유형 추가
      if (
        lawsuit &&
        (currentTitle.trim() === lawsuit.case_number.trim() || currentTitle.trim() === "")
      ) {
        updatedFormData.title = `${lawsuit.case_number} ${value}`;
      }
    }

    setScheduleFormData(updatedFormData);

    // 입력 시 오류 초기화
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: null,
      });
    }
  };

  // 폼 유효성 검사
  const validateScheduleForm = () => {
    const errors = {};

    if (!scheduleFormData.title) errors.title = "제목을 입력해주세요";
    if (!scheduleFormData.event_type) errors.event_type = "기일 유형을 입력해주세요";
    if (!scheduleFormData.event_date) errors.event_date = "날짜를 선택해주세요";
    if (!scheduleFormData.location) errors.location = "장소를 입력해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 당사자 유형 라벨 얻기
  const getPartyTypeLabel = (type) => {
    const labels = {
      plaintiff: "원고",
      defendant: "피고",
      creditor: "채권자",
      debtor: "채무자",
      applicant: "신청인",
      respondent: "피신청인",
    };
    return labels[type] || type;
  };

  // 일정에 대한 알림 생성 함수
  const createNotificationsForSchedule = async (scheduleData) => {
    if (!lawsuit || !lawsuit.id) {
      console.error("알림 생성: 사건 ID가 없습니다");
      return;
    }

    try {
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

      // 개인 및 법인 의뢰인 처리 (AddLawsuitModal.jsx 참고)
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

      // 채권자와 채무자 찾기
      let creditorName = "미지정";
      let debtorName = "미지정";

      try {
        // 소송 당사자 정보 가져오기
        const { creditor, debtor } = await getLawsuitParties(lawsuit.id);
        if (creditor) {
          creditorName =
            creditor.entity_type === "individual"
              ? creditor.name
              : creditor.company_name || "미지정";
        }
        if (debtor) {
          debtorName =
            debtor.entity_type === "individual" ? debtor.name : debtor.company_name || "미지정";
        }
      } catch (err) {
        console.error("당사자 정보 조회 실패:", err);
      }

      // 알림 제목과 내용 설정
      const title = `${scheduleData.event_type}기일이 등록되었습니다.`;
      const message = `${lawsuit.case_number}_${creditorName}(${debtorName})`;

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
        notification_type: "schedule",
        created_at: new Date().toISOString(),
        related_id: scheduleData.id,
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
        notification_type: "schedule",
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: scheduleData.id,
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

  // 소송의 당사자 정보 가져오기
  const getLawsuitParties = async (lawsuitId) => {
    try {
      if (!lawsuitId) {
        return { creditor: null, debtor: null };
      }

      // 소송 당사자 관계 조회
      const { data: lawsuitParties, error: lawsuitPartiesError } = await supabase
        .from("test_lawsuit_parties")
        .select("party_id, party_type")
        .eq("lawsuit_id", lawsuitId);

      if (lawsuitPartiesError) {
        throw lawsuitPartiesError;
      }

      if (!lawsuitParties || lawsuitParties.length === 0) {
        return { creditor: null, debtor: null };
      }

      // 당사자 ID 목록 추출
      const partyIds = lawsuitParties.map((p) => p.party_id);

      // 당사자 상세 정보 조회
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("*")
        .in("id", partyIds);

      if (partiesError) {
        throw partiesError;
      }

      if (!partiesData || partiesData.length === 0) {
        return { creditor: null, debtor: null };
      }

      // 당사자 관계와 상세 정보 결합
      const parties = partiesData.map((party) => {
        const lawsuitParty = lawsuitParties.find((lp) => lp.party_id === party.id);
        return {
          ...party,
          party_type: lawsuitParty?.party_type,
        };
      });

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

      return { creditor, debtor };
    } catch (error) {
      console.error("당사자 정보 조회 실패:", error);
      return { creditor: null, debtor: null };
    }
  };

  // 파일 선택 핸들러
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

  // 파일 삭제 핸들러
  const resetFileUpload = () => {
    setFileToUpload(null);
  };

  // 기일 추가 제출 처리
  const handleSubmitSchedule = async (e) => {
    e.preventDefault();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 기일을 추가할 수 있습니다",
      });
      return;
    }

    if (!validateScheduleForm()) return;

    setIsSubmitting(true);

    try {
      if (!lawsuit || !lawsuit.id) {
        throw new Error("유효한 소송 정보가 없습니다.");
      }

      // 파일 업로드 처리
      let fileUrl = isEditMode ? editingSchedule?.file_url || null : null;

      if (fileToUpload) {
        // 파일 이름에 타임스탬프 추가하여 중복 방지
        const fileExt = fileToUpload.name.split(".").pop();
        const fileName = `${lawsuit.case_id}/${lawsuit.id}/${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const filePath = `schedule-files/${fileName}`;

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

      if (isEditMode && editingSchedule && editingSchedule.id) {
        // 수정 모드
        const updatedSchedule = {
          title: scheduleFormData.title,
          event_type: scheduleFormData.event_type,
          event_date: scheduleFormData.event_date.toISOString(),
          end_date: scheduleFormData.event_date.toISOString(), // 기본적으로 같은 날짜로 설정
          location: scheduleFormData.location,
          description: scheduleFormData.description.trim() || null,
          file_url: fileUrl,
          updated_at: new Date().toISOString(),
        };

        // 파일 URL이 변경되지 않았다면 업데이트 데이터에서 제외
        if (fileUrl === editingSchedule.file_url) {
          delete updatedSchedule.file_url;
        }

        const { data, error } = await supabase
          .from("test_schedules")
          .update(updatedSchedule)
          .eq("id", editingSchedule.id)
          .select()
          .single();

        if (error) {
          console.error("기일 수정 실패:", error);
          throw error;
        }

        toast.success("기일이 수정되었습니다", {
          description: "기일이 성공적으로 수정되었습니다.",
        });

        // 수정된 데이터로 성공 콜백 호출
        if (onSuccess) {
          onSuccess(data);
        }

        // 모달 닫기
        onOpenChange(false);
      } else {
        // 추가 모드
        const newSchedule = {
          title: scheduleFormData.title,
          event_type: scheduleFormData.event_type,
          event_date: scheduleFormData.event_date.toISOString(),
          end_date: scheduleFormData.event_date.toISOString(), // 기본적으로 같은 날짜로 설정
          case_id: lawsuit.case_id,
          lawsuit_id: lawsuit.id,
          location: scheduleFormData.location,
          description: scheduleFormData.description.trim() || null,
          is_important: true, // 소송 기일은 중요하게 표시
          court_name: lawsuit.court_name,
          case_number: lawsuit.case_number,
          file_url: fileUrl,
          created_by: user.id,
        };

        console.log("새 기일 추가:", newSchedule);

        const { data, error } = await supabase
          .from("test_schedules")
          .insert(newSchedule)
          .select()
          .single();

        if (error) {
          console.error("기일 추가 실패:", error);
          throw error;
        }

        console.log("기일 추가 성공:", data);

        // 알림 생성
        try {
          console.log("알림 생성 시작...");
          await createNotificationsForSchedule(data);
          console.log("알림 생성 완료");
        } catch (notificationError) {
          console.error("알림 생성 중 오류 발생:", notificationError);
          // 알림 생성 실패해도 기일 추가는 성공으로 처리
        }

        toast.success("기일이 추가되었습니다", {
          description: "기일이 성공적으로 추가되었습니다.",
        });

        // 추가된 데이터로 성공 콜백 호출
        if (onSuccess) {
          onSuccess(data);
        }

        // 모달 닫기
        onOpenChange(false);
      }
    } catch (error) {
      console.error("기일 추가 중 오류 발생:", error);
      toast.error("기일 추가 중 오류가 발생했습니다.", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "기일 수정" : "기일 추가"}</DialogTitle>
          <DialogDescription>기일 정보를 입력하고 저장 버튼을 클릭하세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitSchedule} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              placeholder="예: 감정기일"
              value={scheduleFormData.title}
              onChange={(e) => handleScheduleInputChange("title", e.target.value)}
              required
            />
            {formErrors.title && <p className="text-sm text-red-500">{formErrors.title}</p>}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="event_type">기일 유형</Label>
              <Input
                id="event_type"
                placeholder="예: 변론, 선고, 감정"
                value={scheduleFormData.event_type}
                onChange={(e) => handleScheduleInputChange("event_type", e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {["변론", "선고", "감정", "변론준비", "화해", "조정", "심문", "경매", "기타"].map(
                  (type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs py-1 h-auto"
                      onClick={() => handleScheduleInputChange("event_type", type)}
                    >
                      {type}
                    </Button>
                  )
                )}
              </div>
              {formErrors.event_type && (
                <p className="text-sm text-red-500">{formErrors.event_type}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="event_date">기일 날짜 및 시간</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="event_date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleFormData.event_date
                          ? format(new Date(scheduleFormData.event_date), "PPP", { locale: ko })
                          : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleFormData.event_date}
                        onSelect={(date) => {
                          // 현재 시간 정보를 유지하면서 날짜만 변경
                          const currentDate = scheduleFormData.event_date || new Date();
                          const newDate = new Date(date);
                          newDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                          handleScheduleInputChange("event_date", newDate);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-1">
                  <Input
                    type="time"
                    value={
                      scheduleFormData.event_date
                        ? `${String(scheduleFormData.event_date.getHours()).padStart(
                            2,
                            "0"
                          )}:${String(scheduleFormData.event_date.getMinutes()).padStart(2, "0")}`
                        : "09:00"
                    }
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":").map(Number);
                      const newDate = new Date(scheduleFormData.event_date || new Date());
                      newDate.setHours(hours, minutes);
                      handleScheduleInputChange("event_date", newDate);
                    }}
                  />
                </div>
              </div>
              {formErrors.event_date && (
                <p className="text-sm text-red-500">{formErrors.event_date}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="location">장소</Label>
            <Input
              id="location"
              placeholder="예: 서울중앙지방법원 507호 법정"
              value={scheduleFormData.location}
              onChange={(e) => handleScheduleInputChange("location", e.target.value)}
              required
            />
            {formErrors.location && <p className="text-sm text-red-500">{formErrors.location}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="기일에 대한 추가 정보를 입력하세요"
              value={scheduleFormData.description}
              onChange={(e) => handleScheduleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>첨부 파일</Label>
            {fileToUpload ? (
              <div className="flex items-center justify-between border rounded-md p-2">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm truncate max-w-[200px]">{fileToUpload.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFileUpload}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">파일 삭제</span>
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileUploadDropzone
                onFileChange={handleFileChange}
                accept={{
                  "application/pdf": [".pdf"],
                  "application/msword": [".doc"],
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
                    ".docx",
                  ],
                  "application/vnd.ms-excel": [".xls"],
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                  "image/jpeg": [".jpg", ".jpeg"],
                  "image/png": [".png"],
                }}
                maxFiles={1}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "수정하기" : "저장하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
