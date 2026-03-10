"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Upload, FileCheck, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import FileUploadDropzone from "@/components/ui/file-upload-dropzone";
import { v4 as uuidv4 } from "uuid";

const activityTypes = [
  { value: "kcb", label: "KCB조회" },
  { value: "message", label: "메세지" },
  { value: "call", label: "전화" },
  { value: "visit", label: "방문" },
  { value: "payment", label: "납부" },
  { value: "letter", label: "통지서 발송" },
  { value: "legal", label: "법적 조치" },
  { value: "other", label: "기타" },
];

const statusOptions = [
  { value: "predicted", label: "예정" },
  { value: "completed", label: "완료" },
];

export default function RecoveryActivityModal({
  open,
  onOpenChange,
  onSuccess,
  caseId,
  user,
  parties = [],
  activity = null, // 수정 시 전달되는 활동 데이터
  isEditing = false, // 수정 모드 여부
  caseDetails = null,
  clients = null,
}) {
  const [formData, setFormData] = useState({
    activity_type: "",
    date: new Date(),
    description: "",
    amount: "",
    notes: "",
    status: "completed",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [localCaseDetails, setLocalCaseDetails] = useState(caseDetails || null);

  // 모달이 열릴 때 데이터 초기화
  useEffect(() => {
    if (open) {
      if (isEditing && activity) {
        // 수정 모드: 기존 데이터로 초기화
        setFormData({
          activity_type: activity.activity_type,
          date: new Date(activity.date),
          description: activity.description,
          amount: activity.amount ? activity.amount.toString() : "",
          notes: activity.notes || "",
          status: activity.status || "completed",
        });
      } else {
        // 추가 모드: 기본값으로 초기화
        setFormData({
          activity_type: "",
          date: new Date(),
          description: "",
          amount: "",
          notes: "",
          status: "completed",
        });
      }
      setFileToUpload(null);
      setFilePreview(null);
      setFormErrors({});

      // 사건 정보가 전달되지 않았거나 업데이트가 필요한 경우에만 가져옴
      if (!caseDetails || !localCaseDetails) {
        fetchCaseDetails();
      } else {
        setLocalCaseDetails(caseDetails);
      }
    }
  }, [open, isEditing, activity, caseDetails]);

  // 사건 정보 불러오기
  const fetchCaseDetails = async () => {
    try {
      if (!caseId) {
        console.error("사건 ID가 없습니다.");
        return;
      }

      console.log("사건 정보 로드 시작 - 사건 ID:", caseId);

      const { data, error } = await supabase
        .from("test_cases")
        .select(
          `
          *,
          clients:test_case_clients(
            individual_id(id, name, email),
            organization_id(id, name)
          ),
          parties:test_case_parties(*)
        `
        )
        .eq("id", caseId)
        .single();

      if (error) {
        console.error("사건 정보 로드 실패:", error);
        return;
      }

      console.log("사건 정보 로드 성공:", data);
      setLocalCaseDetails(data); // 로컬 상태 업데이트
    } catch (error) {
      console.error("사건 정보 불러오기 실패:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    // 입력 시 오류 초기화
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: null,
      });
    }
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      date,
    });
    if (formErrors.date) {
      setFormErrors({
        ...formErrors,
        date: null,
      });
    }
  };

  // 활동 유형에 따른 기본 설명문 생성 함수
  const getDefaultDescription = (type) => {
    switch (type) {
      case "kcb":
        return "KCB 조회를 진행하였습니다.";
      case "message":
        return "변제 통보를 진행하였습니다.";
      case "call":
        return "채무자에게 전화 연락을 하였습니다.";
      case "visit":
        return "현장 방문하여 면담을 진행하였습니다.";
      case "payment":
        return "납부가 확인되었습니다.";
      case "letter":
        return "통지서를 발송하였습니다.";
      case "legal":
        return "법적 조치를 진행하였습니다.";
      default:
        return "";
    }
  };

  const handleTypeChange = (value) => {
    setFormData((prev) => {
      // 활동 유형에 따른 기본 내용 설정
      const defaultDescription = getDefaultDescription(value);

      // 기존 내용이 없을 때만 기본 내용으로 설정하는 대신, 항상 업데이트
      return {
        ...prev,
        activity_type: value,
        description: defaultDescription,
      };
    });

    if (formErrors.activity_type) {
      setFormErrors((prev) => ({ ...prev, activity_type: "" }));
    }
  };

  const handleStatusChange = (value) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleFileChange = (file) => {
    if (file) {
      setFileToUpload(file);

      // 파일 미리보기 처리
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      if (formErrors.file) {
        setFormErrors({
          ...formErrors,
          file: null,
        });
      }
    }
  };

  // 드래그 앤 드롭 이벤트 핸들러 추가
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50/50", "dark:bg-blue-900/20");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/50", "dark:bg-blue-900/20");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/50", "dark:bg-blue-900/20");

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileToUpload(file);

      // 파일 미리보기 처리
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      if (formErrors.file) {
        setFormErrors({
          ...formErrors,
          file: null,
        });
      }
    }
  };

  const resetFileUpload = () => {
    setFileToUpload(null);
    setFilePreview(null);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.activity_type) errors.activity_type = "활동 유형을 선택해주세요";
    if (!formData.date) errors.date = "날짜를 선택해주세요";
    if (!formData.description) errors.description = "내용을 입력해주세요";

    if (
      formData.activity_type === "payment" &&
      (!formData.amount || isNaN(Number(formData.amount)))
    ) {
      errors.amount = "올바른 금액을 입력해주세요";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadFile = async (file, caseId, activityId) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${caseId}/${activityId}/${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `recovery-activities/${fileName}`;

      const { data, error } = await supabase.storage.from("case-files").upload(filePath, file);

      if (error) throw error;

      // 파일 URL 생성
      const { data: urlData } = supabase.storage.from("case-files").getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("파일 업로드 오류:", error);
      throw error;
    }
  };

  const getActivityMessage = (activityType, amount, status) => {
    const statusText = status === "predicted" ? "예정" : "완료";

    switch (activityType) {
      case "kcb":
        return `KCB조회를 진행했습니다.`;
      case "message":
        return `변제 통보를 ${statusText}하였습니다.`;
      case "call":
        return `전화가 ${statusText}되었습니다.`;
      case "visit":
        return `방문 상담이 ${statusText}되었습니다.`;
      case "payment":
        if (amount) {
          const formattedAmount = new Intl.NumberFormat("ko-KR", {
            style: "currency",
            currency: "KRW",
          }).format(amount);
          return `${formattedAmount} 납부가 ${statusText}되었습니다.`;
        }
        return `납부가 ${statusText}되었습니다.`;
      case "letter":
        return `통지서가 발송되었습니다.`;
      case "legal":
        return `법적 조치가 ${statusText}되었습니다.`;
      default:
        return `회수 활동이 ${statusText}되었습니다.`;
    }
  };

  // 알림 생성 함수
  const createNotification = async (activityData, actionType, oldStatus = null) => {
    if (!caseId) return;

    try {
      // 모든 의뢰인과 담당자의 ID를 수집하기 위한 Set
      const userIds = new Set();

      console.log("알림 생성 시작 - 사건 ID:", caseId);
      console.log("활동 정보:", JSON.stringify(activityData, null, 2));

      // 1. 사건 담당자 조회
      // props로 전달된 사건 정보에 handlers가 있는 경우 이를 활용
      if (caseDetails && caseDetails.handlers) {
        console.log("props로 전달된 담당자 정보 사용:", caseDetails.handlers.length);
        caseDetails.handlers.forEach((handler) => {
          if (handler.user_id) {
            userIds.add(handler.user_id);
            console.log("담당자 ID 추가:", handler.user_id);
          }
        });
      } else {
        // 직접 API 호출로 사건 담당자 조회
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
      }

      // 2. 의뢰인 조회
      // props로 전달된 clients가 있는 경우 이를 활용
      if (clients && clients.length > 0) {
        console.log(`props로 전달된 의뢰인 정보 사용: ${clients.length}명`);

        // 개인 의뢰인 처리
        clients.forEach((client) => {
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
        const organizationIds = clients
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
        // 직접 API 호출로 의뢰인 조회
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

      if (finalUserIds.length === 0) {
        console.log("알림을 받을 사용자가 없습니다");
        return;
      }

      // 알림 제목 및 내용 구성
      let creditorName = "미지정";
      let debtorName = "미지정";

      // 로컬 상태 또는 props의, 사건 정보를 사용하여 당사자 이름 설정
      const currentCaseDetails = localCaseDetails || caseDetails;
      if (currentCaseDetails && currentCaseDetails.parties) {
        currentCaseDetails.parties.forEach((party) => {
          if (["creditor", "plaintiff", "applicant"].includes(party.party_type)) {
            creditorName = party.name || "미지정";
          } else if (["debtor", "defendant", "respondent"].includes(party.party_type)) {
            debtorName = party.name || "미지정";
          }
        });
      }

      console.log("Final notification title data:", { creditorName, debtorName });

      // 알림 생성 여부 결정
      let shouldCreateNotification = true;

      // 수정일 때 상태 변경 시에만 알림 생성
      if (actionType === "update") {
        shouldCreateNotification = oldStatus !== activityData.status;
      }

      if (!shouldCreateNotification) return;

      // 알림 제목 설정 - 활동 유형에 따라 다르게 설정
      let title = "";
      const statusText = activityData.status === "predicted" ? "예정" : "완료";

      switch (activityData.activity_type) {
        case "kcb":
          title = `KCB조회를 진행했습니다.`;
          break;
        case "message":
          title = `변제 통보를 ${statusText}하였습니다.`;
          break;
        case "call":
          title = `전화가 ${statusText}되었습니다.`;
          break;
        case "visit":
          title = `방문 상담이 ${statusText}되었습니다.`;
          break;
        case "payment":
          if (activityData.amount) {
            const formattedAmount = new Intl.NumberFormat("ko-KR", {
              style: "currency",
              currency: "KRW",
            }).format(activityData.amount);
            title = `${formattedAmount} 납부가 ${statusText}되었습니다.`;
          } else {
            title = `납부가 ${statusText}되었습니다.`;
          }
          break;
        case "letter":
          title = `통지서가 발송되었습니다.`;
          break;
        case "legal":
          title = `법적 조치가 ${statusText}되었습니다.`;
          break;
        default:
          title = `회수 활동이 ${statusText}되었습니다.`;
      }

      // 알림 내용 - 채무자 이름 표시
      const message = `채무자 ${debtorName}`;

      // 사건 정보 추가 조회 (case_id 확인용)
      const { data: caseData, error: caseError } = await supabase
        .from("test_cases")
        .select("id")
        .eq("id", caseId)
        .single();

      if (caseError) {
        console.error("사건 조회 실패:", caseError);
        return;
      }

      // 1. 사건 알림 생성 (test_case_notifications 테이블)
      const caseNotification = {
        case_id: caseData.id,
        title: title,
        message: message,
        notification_type: "recovery_activity",
        created_at: new Date().toISOString(),
        related_id: activityData.id,
      };

      console.log("사건 알림 생성 시작:", caseNotification);
      try {
        const { data: caseNotificationData, error: caseNotificationError } = await supabase
          .from("test_case_notifications")
          .insert(caseNotification)
          .select();

        if (caseNotificationError) {
          console.error("사건 알림 생성 실패:", caseNotificationError, "\ncase_id:", caseData.id);
        } else {
          console.log("사건 알림이 생성되었습니다:", caseNotificationData);
        }
      } catch (notificationError) {
        console.error("사건 알림 생성 중 예외 발생:", notificationError);
      }

      // 2. 개인 알림 생성 (test_individual_notifications 테이블)
      console.log(`${finalUserIds.length}명의 사용자에게 개인 알림을 생성합니다:`, finalUserIds);

      // 각 사용자에 대한 알림 생성
      const individualNotifications = finalUserIds.map((userId) => ({
        id: uuidv4(),
        user_id: userId,
        case_id: caseData.id,
        title: title,
        message: message,
        notification_type: "recovery_activity",
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: activityData.id,
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

  const getActivityTypeText = (type) => {
    const found = activityTypes.find((item) => item.value === type);
    return found ? found.label : type;
  };

  // 금액 형식 변환
  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  // 당사자 유형에 따른 색상 반환 함수
  const getPartyTypeColor = (type) => {
    switch (type) {
      case "plaintiff":
      case "creditor":
      case "applicant":
        return "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "defendant":
      case "debtor":
      case "respondent":
        return "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    }
  };

  // 추가 모드 - 데이터 저장
  const handleAdd = async () => {
    setIsSubmitting(true);
    try {
      // 활동 생성
      const { data: activityData, error: activityError } = await supabase
        .from("test_recovery_activities")
        .insert({
          case_id: caseId,
          activity_type: formData.activity_type,
          date: formData.date.toISOString(),
          description: formData.description,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          notes: formData.notes,
          created_by: user.id,
          status: formData.status,
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // 수행된 작업에 따라 알림 생성
      await createNotification(activityData, "created");

      // 첨부 파일이 있는 경우 업로드
      if (fileToUpload) {
        const fileUrl = await uploadFile(fileToUpload, caseId, activityData.id);
        if (fileUrl) {
          // 파일 URL 업데이트
          const { error: updateError } = await supabase
            .from("test_recovery_activities")
            .update({ file_url: fileUrl })
            .eq("id", activityData.id);

          if (updateError) {
            console.error("파일 URL 업데이트 실패:", updateError);
            toast.error("파일 URL 업데이트에 실패했습니다");
          }
        }
      }

      toast.success("회수 활동이 추가되었습니다");
      onOpenChange(false);
      if (onSuccess) onSuccess(activityData);
    } catch (error) {
      console.error("회수 활동 추가 실패:", error);
      toast.error("회수 활동 추가에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수정 모드 - 데이터 업데이트
  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      // 이전 상태 가져오기
      const { data: previousData, error: fetchError } = await supabase
        .from("test_recovery_activities")
        .select("*")
        .eq("id", activity.id)
        .single();

      if (fetchError) throw fetchError;

      const updateData = {
        activity_type: formData.activity_type,
        date: formData.date.toISOString(),
        description: formData.description,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        notes: formData.notes,
        status: formData.status,
      };

      // 활동 업데이트
      const { data: activityData, error: updateError } = await supabase
        .from("test_recovery_activities")
        .update(updateData)
        .eq("id", activity.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 상태 변경 감지 및 알림 생성
      if (previousData.status !== formData.status) {
        await createNotification(activityData, "updated", previousData.status);
      }

      // 첨부 파일이 있는 경우 업로드
      if (fileToUpload) {
        const fileUrl = await uploadFile(fileToUpload, caseId, activity.id);
        if (fileUrl) {
          // 파일 URL 업데이트
          const { error: fileUpdateError } = await supabase
            .from("test_recovery_activities")
            .update({ file_url: fileUrl })
            .eq("id", activity.id);

          if (fileUpdateError) {
            console.error("파일 URL 업데이트 실패:", fileUpdateError);
            toast.error("파일 URL 업데이트에 실패했습니다");
          }
        }
      }

      toast.success("회수 활동이 수정되었습니다");
      onOpenChange(false);
      if (onSuccess) onSuccess(activityData);
    } catch (error) {
      console.error("회수 활동 수정 실패:", error);
      toast.error("회수 활동 수정에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 통합된 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 폼 유효성 검사
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      if (isEditing) {
        result = await handleUpdate();
      } else {
        result = await handleAdd();
      }

      // 모달 닫기와 성공 콜백은 handleAdd, handleUpdate 내부에서 처리합니다
      // 상위 처리 로직을 제거합니다
    } catch (error) {
      console.error("회수 활동 저장 실패:", error);
      toast.error("회수 활동 저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "회수 활동 수정" : "회수 활동 추가"}</DialogTitle>
        </DialogHeader>

        {/* 당사자 정보 섹션 */}
        {parties && parties.length > 0 && (
          <div className="mb-4 border rounded-md p-3 bg-gray-50/50 dark:bg-gray-900/50">
            <h3 className="text-sm font-medium mb-2">당사자 정보</h3>
            <div className="space-y-2">
              {parties.slice(0, 3).map((party, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getPartyTypeColor(party.party_type))}
                  >
                    {party.party_type === "plaintiff"
                      ? "원고"
                      : party.party_type === "defendant"
                      ? "피고"
                      : party.party_type === "creditor"
                      ? "채권자"
                      : party.party_type === "debtor"
                      ? "채무자"
                      : party.party_type === "applicant"
                      ? "신청인"
                      : party.party_type === "respondent"
                      ? "피신청인"
                      : party.party_type}
                  </Badge>
                  <span className="font-medium truncate">{party.name || party.company_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">활동 유형</label>
            <Select value={formData.activity_type} onValueChange={handleTypeChange}>
              <SelectTrigger className={formErrors.activity_type ? "border-red-500" : ""}>
                <SelectValue placeholder="활동 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.activity_type && (
              <p className="text-xs text-red-500">{formErrors.activity_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">상태</label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">날짜</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    formErrors.date ? "border-red-500" : ""
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(formData.date, "PPP", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={handleDateChange}
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            {formErrors.date && <p className="text-xs text-red-500">{formErrors.date}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">내용</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="활동 내용을 입력하세요"
              className={formErrors.description ? "border-red-500" : ""}
            />
            {formErrors.description && (
              <p className="text-xs text-red-500">{formErrors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              납부 금액 {formData.activity_type !== "payment" && "(선택사항)"}
            </label>
            <Input
              name="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              placeholder="금액을 입력하세요"
              className={formErrors.amount ? "border-red-500" : ""}
            />
            {formErrors.amount && <p className="text-xs text-red-500">{formErrors.amount}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">비고</label>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="추가 내용이 있다면 입력하세요 (선택사항)"
            />
          </div>

          {/* 파일 첨부 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              첨부 파일 {isEditing && activity?.file_url ? "(기존 파일 교체)" : ""}
            </label>
            <div className="flex flex-col gap-2">
              <FileUploadDropzone
                onFileSelect={handleFileChange}
                onFileRemove={resetFileUpload}
                selectedFile={fileToUpload}
                existingFileUrl={isEditing && activity?.file_url ? activity.file_url : null}
                fileUrlLabel="기존 파일이 있습니다"
                uploadLabel="파일을 이곳에 끌어서 놓거나 클릭하여 업로드"
                replaceLabel="파일을 이곳에 끌어서 놓거나 클릭하여 교체"
                id="recovery-file-upload"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                maxSizeMB={10}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "처리 중..." : isEditing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
