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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { v4 as uuidv4 } from "uuid";

// 소송 유형 상수 정의
const LAWSUIT_TYPES = [
  { value: "civil", label: "민사" },
  { value: "bankruptcy", label: "회생파산" },
  { value: "payment_order", label: "지급명령" },
  { value: "execution", label: "민사집행" },
];

export default function AddRelatedLawsuitModal({
  open,
  onOpenChange,
  onSuccess,
  lawsuitId,
  editingRelatedLawsuit = null,
  caseId = null,
}) {
  const { user } = useUser();
  const isEditMode = !!editingRelatedLawsuit;

  const [formData, setFormData] = useState({
    court_name: "",
    case_number: "",
    type: "",
    description: "",
    lawsuit_type: "civil", // 소송 유형 필드 추가
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // 수정 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (isEditMode && editingRelatedLawsuit) {
      console.log("관련 소송 정보 폼 초기화: 수정 모드", editingRelatedLawsuit);
      setFormData({
        court_name: editingRelatedLawsuit.court_name || "",
        case_number: editingRelatedLawsuit.case_number || "",
        type: editingRelatedLawsuit.type || "",
        description: editingRelatedLawsuit.description || "",
        lawsuit_type: editingRelatedLawsuit.lawsuit_type || "civil", // 소송 유형 초기화
      });
    } else {
      console.log("관련 소송 정보 폼 초기화: 추가 모드");
      setFormData({
        court_name: "",
        case_number: "",
        type: "",
        description: "",
        lawsuit_type: "civil", // 소송 유형 초기화
      });
    }
  }, [editingRelatedLawsuit, isEditMode]);

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

  const validateForm = () => {
    const errors = {};

    if (!formData.lawsuit_type) errors.lawsuit_type = "소송 유형을 선택해주세요";
    if (!formData.court_name.trim()) errors.court_name = "법원명을 입력해주세요";
    if (!formData.case_number.trim()) errors.case_number = "사건번호를 입력해주세요";
    if (!formData.type.trim()) errors.type = "구분을 입력해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createNotification = async (relatedLawsuitData) => {
    try {
      // 소송 정보 조회
      const { data: lawsuitInfo, error: lawsuitError } = await supabase
        .from("test_case_lawsuits")
        .select("*")
        .eq("id", lawsuitId)
        .single();

      if (lawsuitError) {
        console.error("소송 정보 조회 실패:", lawsuitError);
        // 오류가 있더라도 진행
      }

      // 모든 의뢰인과 담당자의 ID를 수집하기 위한 Set
      const userIds = new Set();

      console.log("알림 생성: 관련 소송 ID =", relatedLawsuitData.id);
      console.log("알림 생성: 소송 ID =", lawsuitId);

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
      if (uniqueUserIds.length > 0) {
        console.log("알림 생성: 사용자 ID 검증 시작");
        const { data: validUsers, error: usersError } = await supabase
          .from("users")
          .select("id")
          .in("id", uniqueUserIds);

        if (usersError) {
          console.error("사용자 검증 실패:", usersError);
        } else if (validUsers && validUsers.length > 0) {
          // 유효한 사용자 ID만 필터링
          const validUserIds = validUsers.map((user) => user.id);
          console.log(`검증된 사용자 ${validUserIds.length}명:`, validUserIds);

          // 검증 결과 반영
          userIds.clear();
          validUserIds.forEach((id) => userIds.add(id));
        } else {
          console.log("유효한 사용자 없음");
        }
      }

      // 최종 검증된 사용자 ID 목록
      const finalUserIds = Array.from(userIds);
      console.log(`최종 알림 대상 사용자 ${finalUserIds.length}명:`, finalUserIds);

      // 채권자와 채무자 이름 조회
      let creditorName = "미지정";
      let debtorName = "미지정";

      // 소송 유형에 따라 당사자 유형 결정
      let creditorType, debtorType;

      if (lawsuitInfo) {
        if (lawsuitInfo.lawsuit_type === "civil") {
          creditorType = "plaintiff"; // 원고
          debtorType = "defendant"; // 피고
        } else if (
          lawsuitInfo.lawsuit_type === "payment_order" ||
          lawsuitInfo.lawsuit_type === "execution"
        ) {
          creditorType = "creditor"; // 채권자
          debtorType = "debtor"; // 채무자
        } else if (lawsuitInfo.lawsuit_type === "bankruptcy") {
          creditorType = "applicant"; // 신청인
          debtorType = "debtor"; // 채무자
        } else {
          creditorType = "plaintiff"; // 기본값
          debtorType = "defendant"; // 기본값
        }
      } else {
        creditorType = "plaintiff"; // 기본값
        debtorType = "defendant"; // 기본값
      }

      // 소송 당사자 정보 가져오기
      try {
        const { data: lawsuitParties, error: partiesError } = await supabase
          .from("test_lawsuit_parties")
          .select(
            `
            party_id,
            party_type,
            party:party_id(id, name, company_name, entity_type)
          `
          )
          .eq("lawsuit_id", lawsuitId);

        if (!partiesError && lawsuitParties) {
          // 채권자(원고/신청인) 찾기
          const creditor = lawsuitParties.find((p) => p.party_type === creditorType);
          if (creditor && creditor.party) {
            creditorName =
              creditor.party.entity_type === "individual"
                ? creditor.party.name
                : creditor.party.company_name || "미지정";
          }

          // 채무자(피고/피신청인) 찾기
          const debtor = lawsuitParties.find((p) => p.party_type === debtorType);
          if (debtor && debtor.party) {
            debtorName =
              debtor.party.entity_type === "individual"
                ? debtor.party.name
                : debtor.party.company_name || "미지정";
          }
        }
      } catch (err) {
        console.error("당사자 정보 조회 실패:", err);
      }

      // 알림 제목과 내용 설정
      const title = "관련소송이 등록되었습니다.";
      const message = `${relatedLawsuitData.case_number}_${relatedLawsuitData.type}_${creditorName}(${debtorName})`;

      // 1. 사건 알림 생성 (test_case_notifications 테이블)
      const caseNotification = {
        case_id: caseId,
        title: title,
        message: message,
        notification_type: "related_lawsuit",
        created_at: new Date().toISOString(),
        related_id: relatedLawsuitData.id,
      };

      console.log("알림 생성: 사건 알림 생성 시작", caseNotification);
      const { error: caseNotificationError } = await supabase
        .from("test_case_notifications")
        .insert(caseNotification);

      if (caseNotificationError) {
        console.error("사건 알림 생성 실패:", caseNotificationError);
      } else {
        console.log("사건 알림이 생성되었습니다");
      }

      // 2. 개인 알림 생성 (test_individual_notifications 테이블)
      if (finalUserIds.length === 0) {
        console.log("알림을 받을 사용자가 없습니다");
        return;
      }

      console.log(`${finalUserIds.length}명의 사용자에게 개인 알림을 생성합니다`);

      // 각 사용자에 대한 알림 생성
      const individualNotifications = finalUserIds.map((userId) => ({
        id: uuidv4(),
        user_id: userId,
        case_id: caseId,
        title: title,
        message: message,
        notification_type: "related_lawsuit",
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: relatedLawsuitData.id,
      }));

      console.log("알림 생성: 개인 알림 생성 시작", individualNotifications);
      try {
        const { data: notificationsData, error: individualNotificationError } = await supabase
          .from("test_individual_notifications")
          .insert(individualNotifications)
          .select();

        if (individualNotificationError) {
          console.error("개인 알림 생성 실패:", individualNotificationError);

          // 각 알림을 개별적으로 삽입 시도 (일괄 삽입에 실패한 경우)
          console.log("개별적으로 알림 삽입 시도...");
          for (const notification of individualNotifications) {
            console.log("개별 알림 삽입 시도:", notification);
            const { data, error } = await supabase
              .from("test_individual_notifications")
              .insert(notification)
              .select();

            if (error) {
              console.error(`사용자 ID ${notification.user_id}에 대한 알림 생성 실패:`, error);
            } else {
              console.log(`사용자 ID ${notification.user_id}에 대한 알림 생성 성공:`, data);
            }
          }
        } else {
          console.log(`${finalUserIds.length}개의 개인 알림이 생성되었습니다`, notificationsData);
        }
      } catch (notificationError) {
        console.error("개인 알림 생성 중 예외 발생:", notificationError);
      }
    } catch (error) {
      console.error("알림 생성 중 오류 발생:", error);
    }
  };

  // 관련 소송을 기반으로 실제 소송을 생성하는 함수
  const createRealLawsuit = async (relatedLawsuitData) => {
    try {
      console.log("실제 소송 생성 시작:", relatedLawsuitData);

      // 먼저 소송이 속한 case_id를 가져오기 위해 원본 소송 정보 조회
      const { data: originalLawsuit, error: originalLawsuitError } = await supabase
        .from("test_case_lawsuits")
        .select("case_id")
        .eq("id", lawsuitId)
        .single();

      if (originalLawsuitError) {
        console.error("원본 소송 정보 조회 실패:", originalLawsuitError);
        throw originalLawsuitError;
      }

      // 관련 사건에 대한 실제 소송 데이터 생성
      const newLawsuitId = uuidv4();
      const newLawsuitData = {
        id: newLawsuitId,
        case_id: originalLawsuit.case_id,
        court_name: relatedLawsuitData.court_name,
        case_number: relatedLawsuitData.case_number,
        lawsuit_type: relatedLawsuitData.lawsuit_type, // 소송 유형 저장
        status: "in_progress", // 기본 상태는 진행 중
        description: relatedLawsuitData.description,
        type: relatedLawsuitData.type, // 구분(대여금, 약정금 등) 정보 저장
        filing_date: new Date().toISOString().split("T")[0], // 오늘 날짜를 filing_date로 설정
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("생성할 소송 데이터:", newLawsuitData);

      // 소송 정보 저장
      const { data: newLawsuit, error: newLawsuitError } = await supabase
        .from("test_case_lawsuits")
        .insert(newLawsuitData)
        .select()
        .single();

      if (newLawsuitError) {
        console.error("관련 사건 소송 생성 실패:", newLawsuitError);
        throw newLawsuitError;
      }

      console.log("관련 사건 소송 생성 성공:", newLawsuit);

      // 원본 소송의 당사자들 조회
      const { data: originalParties, error: originalPartiesError } = await supabase
        .from("test_lawsuit_parties")
        .select("party_id, party_type")
        .eq("lawsuit_id", lawsuitId);

      if (originalPartiesError) {
        console.error("원본 소송 당사자 조회 실패:", originalPartiesError);
        // 당사자 조회 실패는 치명적 오류가 아니므로 계속 진행
      } else if (originalParties && originalParties.length > 0) {
        console.log("복사할 당사자 정보:", originalParties);

        // 새 소송에 당사자 정보 복사
        try {
          for (const party of originalParties) {
            // 소송 유형에 따라 당사자 유형 매핑
            let newPartyType = party.party_type; // 기본값으로 원본 타입 사용

            // 안전한 방식으로 당사자 유형 확인
            try {
              const partyType = party.party_type || "";
              const isCreditorType = ["plaintiff", "creditor", "applicant"].includes(partyType);

              // 새 소송 유형에 따라 당사자 유형 결정
              if (relatedLawsuitData.lawsuit_type === "civil") {
                newPartyType = isCreditorType ? "plaintiff" : "defendant"; // 민사: 원고/피고
              } else if (relatedLawsuitData.lawsuit_type === "bankruptcy") {
                newPartyType = isCreditorType ? "applicant" : "debtor"; // 회생파산: 신청인/채무자
              } else if (
                relatedLawsuitData.lawsuit_type === "payment_order" ||
                relatedLawsuitData.lawsuit_type === "execution"
              ) {
                newPartyType = isCreditorType ? "creditor" : "debtor"; // 지급명령/민사집행: 채권자/채무자
              }

              console.log(
                `당사자 ID ${party.party_id || "unknown"}의 유형 매핑: ${
                  party.party_type || "unknown"
                } -> ${newPartyType}`
              );
            } catch (mappingError) {
              console.error("당사자 유형 매핑 중 오류 발생:", mappingError);
              // 매핑 오류 시 기본 타입 유지
            }

            if (!party.party_id) {
              console.warn("party_id가 없는 당사자가 있습니다. 건너뜁니다.");
              continue;
            }

            const newPartyData = {
              id: uuidv4(),
              lawsuit_id: newLawsuitId,
              party_id: party.party_id,
              party_type: newPartyType,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { error: insertError } = await supabase
              .from("test_lawsuit_parties")
              .insert(newPartyData);

            if (insertError) {
              console.error(`당사자 ID ${party.party_id}의 연결 실패:`, insertError);
            }
          }
          console.log("당사자 정보 복사 완료");
        } catch (partyError) {
          console.error("당사자 정보 복사 중 오류 발생:", partyError);
          // 당사자 복사 실패는 치명적 오류가 아니므로 계속 진행
        }
      } else {
        console.log("복사할 당사자 정보 없음");
      }

      return newLawsuit;
    } catch (error) {
      console.error("실제 소송 생성 중 오류 발생:", error);
      toast.error("관련 소송 등록에 실패했습니다.");
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("필수 입력 사항을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      let data;
      let id = editingRelatedLawsuit?.id || uuidv4();

      if (isEditMode) {
        console.log("관련 소송 정보 수정:", formData);
        // 수정 모드
        const { data: updatedData, error } = await supabase
          .from("test_related_lawsuits")
          .update({
            court_name: formData.court_name.trim(),
            case_number: formData.case_number.trim(),
            lawsuit_type: formData.lawsuit_type, // 소송 유형 저장
            type: formData.type.trim(),
            description: formData.description.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("관련 소송 수정 실패:", error);
          throw error;
        }

        data = updatedData;
        toast.success("관련 소송 정보가 수정되었습니다.");
      } else {
        console.log("관련 소송 정보 추가:", formData);
        // 신규 추가 모드
        const { data: insertedData, error } = await supabase
          .from("test_related_lawsuits")
          .insert({
            id,
            lawsuit_id: lawsuitId,
            court_name: formData.court_name.trim(),
            case_number: formData.case_number.trim(),
            lawsuit_type: formData.lawsuit_type, // 소송 유형 저장
            type: formData.type.trim(),
            description: formData.description.trim(),
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("관련 소송 추가 실패:", error);
          throw error;
        }

        data = insertedData;

        // 실제 소송 정보도 함께 생성
        try {
          await createRealLawsuit(data);
          console.log("관련 소송 및 실제 소송 모두 생성 성공");
        } catch (lawsuitError) {
          console.error("실제 소송 생성 실패:", lawsuitError);
          // 실제 소송 생성 실패는 관련 소송 추가에 영향을 주지 않음
        }

        // 알림 생성
        try {
          await createNotification(data);
        } catch (notificationError) {
          console.error("알림 생성 실패:", notificationError);
          // 알림 생성 실패는 관련 소송 추가에 영향을 주지 않음
        }

        toast.success("관련 소송이 추가되었습니다.");
      }

      onSuccess && onSuccess(data);
      onOpenChange(false);
    } catch (error) {
      console.error("관련 소송 처리 중 오류 발생:", error);
      toast.error(isEditMode ? "관련 소송 수정에 실패했습니다." : "관련 소송 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "관련 소송 정보 수정" : "관련 소송 등록"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lawsuit_type">소송 유형</Label>
            <Select
              value={formData.lawsuit_type}
              onValueChange={(value) => handleInputChange("lawsuit_type", value)}
            >
              <SelectTrigger
                id="lawsuit_type"
                className={formErrors.lawsuit_type ? "border-red-500" : ""}
              >
                <SelectValue placeholder="소송 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {LAWSUIT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.lawsuit_type && (
              <p className="text-sm text-red-500">{formErrors.lawsuit_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="court_name">법원명</Label>
            <Input
              id="court_name"
              placeholder="법원명을 입력하세요"
              value={formData.court_name}
              onChange={(e) => handleInputChange("court_name", e.target.value)}
              className={formErrors.court_name ? "border-red-500" : ""}
            />
            {formErrors.court_name && (
              <p className="text-sm text-red-500">{formErrors.court_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="case_number">사건번호</Label>
              <Input
                id="case_number"
                value={formData.case_number}
                onChange={(e) => handleInputChange("case_number", e.target.value)}
                placeholder="예: 2023가단12345"
                className={formErrors.case_number ? "border-red-500" : ""}
              />
              {formErrors.case_number && (
                <p className="text-xs text-red-500">{formErrors.case_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">사건구분</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                placeholder="손해배상(기), 약정금 등"
                className={formErrors.type ? "border-red-500" : ""}
              />
              {formErrors.type && <p className="text-xs text-red-500">{formErrors.type}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="관련 소송에 대한 설명을 입력하세요"
              className="min-h-[80px]"
            />
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
