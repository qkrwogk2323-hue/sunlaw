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
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Plus, Trash2, User, Building, Search } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";

const LAWSUIT_TYPES = [
  { value: "civil", label: "민사" },
  { value: "bankruptcy", label: "회생파산" },
  { value: "payment_order", label: "지급명령" },
  { value: "execution", label: "민사집행" },
];

const LAWSUIT_STATUS = [
  { value: "pending", label: "대기중" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "종결" },
];

// 당사자 유형에 따른 한국어 텍스트
const getPartyTypeText = (type) => {
  switch (type) {
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
      return type;
  }
};

// 소송 유형에 따른 한국어 텍스트
const getLawsuitTypeText = (type) => {
  const found = LAWSUIT_TYPES.find((item) => item.value === type);
  return found ? found.label : type;
};

export default function AddLawsuitModal({
  open,
  onOpenChange,
  parties = [],
  onSuccess,
  caseId,
  editingLawsuit = null,
  caseDetails = null,
  clients = null,
}) {
  const { user } = useUser();
  const isEditMode = !!editingLawsuit;
  const [localCaseDetails, setLocalCaseDetails] = useState(caseDetails);

  // 디버깅을 위한 로그 추가
  useEffect(() => {
    if (isEditMode) {
      console.log("수정 모드 활성화: editingLawsuit =", editingLawsuit);
    }
  }, [editingLawsuit, isEditMode]);

  const [formData, setFormData] = useState({
    lawsuit_type: "",
    court_name: "",
    case_number: "",
    filing_date: new Date(),
    description: "",
    status: "in_progress",
    type: "",
  });

  // 수정 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (isEditMode && editingLawsuit) {
      console.log("소송 정보 폼 초기화: 수정 모드", editingLawsuit);
      setFormData({
        lawsuit_type: editingLawsuit.lawsuit_type || "civil",
        court_name: editingLawsuit.court_name || "",
        case_number: editingLawsuit.case_number || "",
        filing_date: editingLawsuit.filing_date ? new Date(editingLawsuit.filing_date) : new Date(),
        description: editingLawsuit.description || "",
        status: editingLawsuit.status || "in_progress",
        type: editingLawsuit.type || "",
      });
    } else {
      console.log("소송 정보 폼 초기화: 추가 모드");
      setFormData({
        lawsuit_type: "civil",
        court_name: "",
        case_number: "",
        filing_date: new Date(),
        description: "",
        status: "in_progress",
        type: "",
      });
    }
  }, [editingLawsuit, isEditMode]);

  const [selectedParties, setSelectedParties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showPartySelector, setShowPartySelector] = useState(false);
  const [filteredParties, setFilteredParties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 모달이 열릴 때 선택된 당사자 초기화
  useEffect(() => {
    if (open) {
      if (isEditMode && editingLawsuit.test_lawsuit_parties) {
        // 기존 소송 당사자 정보 불러오기
        const loadPartyDetails = async () => {
          try {
            // 당사자 정보와 party_type 결합 - 당사자 정보가 이미 불러와진 경우 활용
            if (
              editingLawsuit.test_lawsuit_parties.length > 0 &&
              editingLawsuit.test_lawsuit_parties[0].party
            ) {
              // 이미 party 정보가 포함된 경우 (fetchLawsuits에서 조인한 경우)
              const partiesWithType = editingLawsuit.test_lawsuit_parties.map((lawsuitParty) => {
                return {
                  ...lawsuitParty.party,
                  lawsuit_party_type: lawsuitParty.party_type,
                };
              });

              setSelectedParties(partiesWithType);
            } else {
              // 기존 로직 - party 정보가 없는 경우 별도로 조회
              const partyIds = editingLawsuit.test_lawsuit_parties.map((lp) => lp.party_id);

              const { data, error } = await supabase
                .from("test_case_parties")
                .select("*")
                .in("id", partyIds);

              if (error) throw error;

              // 당사자 정보와 party_type 결합
              const partiesWithType = data.map((party) => {
                const lawsuitParty = editingLawsuit.test_lawsuit_parties.find(
                  (lp) => lp.party_id === party.id
                );
                return {
                  ...party,
                  lawsuit_party_type: lawsuitParty.party_type,
                };
              });

              setSelectedParties(partiesWithType);
            }
          } catch (error) {
            console.error("소송 당사자 정보 불러오기 실패:", error);
            toast.error("당사자 정보를 불러오는데 실패했습니다");
          }
        };

        loadPartyDetails();
      } else {
        // 새 소송 등록 시 모든 당사자를 기본으로 선택
        // 소송 유형에 따라 적절한 당사자 유형 자동 설정
        const initialSelectedParties = parties.map((party) => {
          // 기본 당사자 유형 결정 (party.party_type를 기반으로)
          let defaultPartyType = mapPartyTypeToLawsuitType(party.party_type, "civil");

          return {
            ...party,
            lawsuit_party_type: defaultPartyType,
          };
        });

        setSelectedParties(initialSelectedParties);
      }

      // 당사자 목록 초기화 - 이제 선택되지 않은 당사자만 표시
      updateFilteredParties();
      setSearchTerm("");

      // 에러 초기화
      setFormErrors({});

      // 사건 정보 불러오기 - props로 전달된 경우에는 API 호출 건너뛰기
      if (caseDetails) {
        console.log("props로 전달된 사건 정보 사용:", caseDetails);
        setLocalCaseDetails(caseDetails);
      } else {
        console.log("사건 정보 API 호출로 불러오기");
        fetchCaseDetails();
      }
    }
  }, [open, isEditMode, editingLawsuit, parties, caseDetails]);

  // 소송 유형이 변경될 때 당사자 유형 자동 업데이트
  useEffect(() => {
    if (formData.lawsuit_type && selectedParties.length > 0) {
      // 소송 유형에 따라 당사자 유형 자동 업데이트
      const updatedParties = selectedParties.map((party) => {
        const newPartyType = mapPartyTypeToLawsuitType(party.party_type, formData.lawsuit_type);
        return {
          ...party,
          lawsuit_party_type: newPartyType,
        };
      });

      setSelectedParties(updatedParties);
    }
  }, [formData.lawsuit_type]);

  // 당사자 유형을 소송 유형에 맞게 매핑하는 함수
  const mapPartyTypeToLawsuitType = (partyType, lawsuitType) => {
    // 기본 타입 매핑
    if (lawsuitType === "civil") {
      if (partyType === "creditor" || partyType === "applicant" || partyType === "plaintiff") {
        return "plaintiff"; // 원고
      } else {
        return "defendant"; // 피고
      }
    } else if (lawsuitType === "bankruptcy") {
      if (partyType === "plaintiff" || partyType === "creditor" || partyType === "applicant") {
        return "applicant"; // 신청인
      } else {
        return "debtor"; // 채무자
      }
    } else if (lawsuitType === "payment_order" || lawsuitType === "execution") {
      if (partyType === "plaintiff" || partyType === "applicant" || partyType === "creditor") {
        return "creditor"; // 채권자
      } else {
        return "debtor"; // 채무자
      }
    } else {
      // 기본값 반환
      if (partyType === "creditor" || partyType === "applicant" || partyType === "plaintiff") {
        return "plaintiff"; // 원고
      } else {
        return "defendant"; // 피고
      }
    }
  };

  // 필터링된 당사자 목록 업데이트 (선택되지 않은 당사자만 표시)
  const updateFilteredParties = () => {
    if (searchTerm) {
      const filtered = parties.filter((party) => {
        const name = party.entity_type === "individual" ? party.name : party.company_name;
        // 검색어로 필터링
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredParties(filtered);
    } else {
      // 검색어가 없으면 모든 당사자 표시
      setFilteredParties(parties);
    }
  };

  // 사건 정보 불러오기 함수
  const fetchCaseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("test_cases")
        .select(
          `
          *,
          clients:test_case_clients(
            individual_id(id, name, email),
            organization_id(id, name)
          )
        `
        )
        .eq("id", caseId)
        .single();

      if (error) throw error;
      setLocalCaseDetails(data);
    } catch (error) {
      console.error("사건 정보 불러오기 실패:", error);
    }
  };

  // 검색어에 따라 당사자 필터링
  useEffect(() => {
    updateFilteredParties();
  }, [searchTerm, parties, selectedParties]);

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

  // 당사자 추가 시 역할 선택 상태
  const [newParty, setNewParty] = useState({
    name: "",
    role: "",
    entity_type: "individual", // 개인 또는 법인
    company_name: "",
    phone: "",
    email: "",
  });

  const resetNewParty = () => {
    setNewParty({
      name: "",
      role: "",
      entity_type: "individual",
      company_name: "",
      phone: "",
      email: "",
    });
  };

  // 직접 당사자 추가 함수
  const addManualParty = () => {
    if (!newParty.role) {
      toast.error("당사자 역할을 선택해주세요");
      return;
    }

    if (newParty.entity_type === "individual" && !newParty.name) {
      toast.error("당사자 이름을 입력해주세요");
      return;
    }

    if (newParty.entity_type === "corporation" && !newParty.company_name) {
      toast.error("회사명을 입력해주세요");
      return;
    }

    // 고유 ID 생성
    const uniqueId = uuidv4();

    // 당사자 추가
    const partyToAdd = {
      id: uniqueId,
      uniqueId: uniqueId,
      name: newParty.entity_type === "individual" ? newParty.name : "",
      company_name: newParty.entity_type === "corporation" ? newParty.company_name : "",
      entity_type: newParty.entity_type,
      phone: newParty.phone,
      email: newParty.email,
      lawsuit_party_type: newParty.role,
    };

    setSelectedParties([...selectedParties, partyToAdd]);
    resetNewParty();

    if (formErrors.selected_parties) {
      setFormErrors({
        ...formErrors,
        selected_parties: null,
      });
    }
  };

  const removeParty = (uniqueId) => {
    setSelectedParties(selectedParties.filter((p) => p.uniqueId !== uniqueId));
  };

  const updatePartyType = (uniqueId, newType) => {
    setSelectedParties(
      selectedParties.map((p) =>
        p.uniqueId === uniqueId ? { ...p, lawsuit_party_type: newType } : p
      )
    );
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.lawsuit_type) errors.lawsuit_type = "소송 유형을 선택해주세요";
    if (!formData.court_name.trim()) errors.court_name = "법원명을 입력해주세요";
    if (!formData.case_number.trim()) errors.case_number = "사건번호를 입력해주세요";
    if (!formData.filing_date) errors.filing_date = "접수일을 선택해주세요";
    if (selectedParties.length === 0)
      errors.selected_parties = "당사자를 최소 한 명 이상 선택해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createNotification = async (lawsuitData) => {
    try {
      // 소송 정보 조회
      const { data: lawsuitInfo, error: lawsuitError } = await supabase
        .from("test_case_lawsuits")
        .select("*")
        .eq("id", lawsuitData.id)
        .single();

      if (lawsuitError) {
        console.error("소송 정보 조회 실패:", lawsuitError);
        // 오류가 있더라도 진행
      }

      // 모든 의뢰인과 담당자의 ID를 수집하기 위한 Set
      const userIds = new Set();

      console.log("알림 생성: 사건 ID =", caseId);
      console.log("알림 생성: 소송 정보 =", lawsuitData);

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

      // 알림 제목과 내용 설정
      // 소송 타입 가져오기
      const lawsuitTypeText = getLawsuitTypeText(lawsuitData.lawsuit_type);
      const title = `${lawsuitTypeText}소송이(가) ${isEditMode ? "수정" : "등록"}되었습니다.`;

      // 채권자와 채무자 찾기
      let creditorName = "미지정";
      let debtorName = "미지정";

      // 소송 유형에 따라 당사자 유형 결정
      let creditorType, debtorType;
      if (lawsuitData.lawsuit_type === "civil") {
        creditorType = "plaintiff"; // 원고
        debtorType = "defendant"; // 피고
      } else if (
        lawsuitData.lawsuit_type === "payment_order" ||
        lawsuitData.lawsuit_type === "execution"
      ) {
        creditorType = "creditor"; // 채권자
        debtorType = "debtor"; // 채무자
      } else if (lawsuitData.lawsuit_type === "bankruptcy") {
        creditorType = "applicant"; // 신청인
        debtorType = "debtor"; // 채무자
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
          .eq("lawsuit_id", lawsuitData.id);

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

      // 내용 구성
      const message = `${lawsuitData.case_number}_${creditorName}(${debtorName})`;

      // 1. 사건 알림 생성 (test_case_notifications 테이블)
      const caseNotification = {
        case_id: caseId,
        title: title,
        message: message,
        notification_type: "lawsuit",
        created_at: new Date().toISOString(),
        related_id: lawsuitData.id,
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
        notification_type: "lawsuit",
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: lawsuitData.id,
      }));

      console.log("알림 생성: 개인 알림 생성 시작", JSON.stringify(individualNotifications));
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
      console.error("알림 생성 중 오류 발생:", error, "\n스택 트레이스:", error.stack);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      console.log("소송 저장 시작: 모드 =", isEditMode ? "수정" : "추가");
      console.log("저장할 소송 데이터: ", formData);
      console.log("저장할 당사자 정보: ", selectedParties);

      // 소송 정보 데이터베이스에 저장
      const newLawsuit = {
        case_id: caseId,
        lawsuit_type: formData.lawsuit_type,
        court_name: formData.court_name.trim(),
        case_number: formData.case_number.trim(),
        filing_date: formData.filing_date.toISOString().split("T")[0],
        description: formData.description.trim() || null,
        status: formData.status,
        type: formData.type.trim() || null,
        created_by: user.id,
      };

      let lawsuit;
      let oldStatus = null;

      if (isEditMode) {
        console.log("소송 정보 수정 시작, ID =", editingLawsuit.id);
        // 수정 전 기존 상태 가져오기
        const { data: oldData, error: oldError } = await supabase
          .from("test_case_lawsuits")
          .select("status")
          .eq("id", editingLawsuit.id)
          .single();

        if (!oldError) {
          oldStatus = oldData.status;
        }

        // 소송 정보 업데이트
        const { data, error } = await supabase
          .from("test_case_lawsuits")
          .update(newLawsuit)
          .eq("id", editingLawsuit.id)
          .select();

        if (error) throw error;
        lawsuit = data[0];
        console.log("소송 정보 업데이트 성공, 업데이트된 데이터:", lawsuit);

        // 기존 당사자 연결 삭제
        console.log("기존 당사자 연결 삭제 시작");
        const { error: deleteError } = await supabase
          .from("test_lawsuit_parties")
          .delete()
          .eq("lawsuit_id", editingLawsuit.id);

        if (deleteError) {
          console.error("당사자 연결 삭제 실패:", deleteError);
          throw deleteError;
        }
        console.log("기존 당사자 연결 삭제 성공");
      } else {
        console.log("새 소송 정보 추가 시작");
        // 새 소송 정보 추가
        const { data, error } = await supabase
          .from("test_case_lawsuits")
          .insert(newLawsuit)
          .select();

        if (error) throw error;
        lawsuit = data[0];
        console.log("새 소송 정보 추가 성공, 추가된 데이터:", lawsuit);
      }

      // 선택된 당사자 연결
      if (selectedParties.length > 0) {
        console.log("당사자 연결 시작, 연결할 당사자 수:", selectedParties.length);
        const lawsuitParties = selectedParties.map((party) => ({
          lawsuit_id: lawsuit.id,
          party_id: party.id,
          party_type: party.lawsuit_party_type, // 소송에서의 당사자 유형
        }));

        const { error: partyError } = await supabase
          .from("test_lawsuit_parties")
          .insert(lawsuitParties);

        if (partyError) {
          console.error("당사자 연결 실패:", partyError);
          throw partyError;
        }
        console.log("당사자 연결 성공");
      } else {
        console.log("연결할 당사자가 없음");
      }

      // 알림 생성
      if (isEditMode) {
        console.log("소송 수정에 대한 알림 생성 시작");
        await createNotification(lawsuit);
      } else {
        console.log("소송 생성에 대한 알림 생성 시작");
        await createNotification(lawsuit);
      }

      toast.success(isEditMode ? "소송이 수정되었습니다" : "소송이 추가되었습니다");

      if (onSuccess) onSuccess(lawsuit);
      // 모달 닫기 전에 모든 팝업도 닫기
      setShowPartySelector(false);
      onOpenChange(false);
    } catch (error) {
      console.error("소송 저장 실패:", error);
      toast.error(isEditMode ? "소송 수정 실패" : "소송 추가 실패", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모든 가능한 당사자 유형
  const getAllPartyTypes = () => [
    { value: "plaintiff", label: "원고" },
    { value: "defendant", label: "피고" },
    { value: "creditor", label: "채권자" },
    { value: "debtor", label: "채무자" },
    { value: "applicant", label: "신청인" },
    { value: "respondent", label: "피신청인" },
  ];

  // 모달이 닫힐 때 상태 초기화 처리
  const handleDialogOpenChange = (isOpen) => {
    // 모달이 닫힐 때
    if (!isOpen) {
      // 모든 팝업도 닫기
      setShowPartySelector(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "소송 정보 수정" : "소송 등록"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lawsuit_type">소송 유형</Label>
              <Select
                value={formData.lawsuit_type}
                onValueChange={(value) => handleInputChange("lawsuit_type", value)}
              >
                <SelectTrigger className={formErrors.lawsuit_type ? "border-red-500" : ""}>
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
                <p className="text-xs text-red-500">{formErrors.lawsuit_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  {LAWSUIT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="court_name">법원명</Label>
              <Input
                id="court_name"
                value={formData.court_name}
                onChange={(e) => handleInputChange("court_name", e.target.value)}
                placeholder="법원명을 입력하세요"
                className={formErrors.court_name ? "border-red-500" : ""}
              />
              {formErrors.court_name && (
                <p className="text-xs text-red-500">{formErrors.court_name}</p>
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filing_date">접수일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.filing_date && "text-muted-foreground",
                      formErrors.filing_date && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.filing_date ? (
                      format(formData.filing_date, "yyyy년 MM월 dd일", { locale: ko })
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.filing_date}
                    onSelect={(date) => handleInputChange("filing_date", date)}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              {formErrors.filing_date && (
                <p className="text-xs text-red-500">{formErrors.filing_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="소송에 대한 설명을 입력하세요"
                className="min-h-[100px]"
              />
            </div>

            {/* 당사자 섹션 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>당사자 정보</Label>
              </div>

              {formErrors.selected_parties && (
                <p className="text-xs text-red-500">{formErrors.selected_parties}</p>
              )}

              {/* 당사자 추가 폼 */}
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">당사자 직접 추가</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="party-role">역할</Label>
                      <Select
                        value={newParty.role}
                        onValueChange={(value) => setNewParty({ ...newParty, role: value })}
                      >
                        <SelectTrigger id="party-role">
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllPartyTypes().map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="party-type">유형</Label>
                      <Select
                        value={newParty.entity_type}
                        onValueChange={(value) => setNewParty({ ...newParty, entity_type: value })}
                      >
                        <SelectTrigger id="party-type">
                          <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">개인</SelectItem>
                          <SelectItem value="corporation">법인</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newParty.entity_type === "individual" ? (
                      <div className="space-y-2">
                        <Label htmlFor="party-name">이름</Label>
                        <Input
                          id="party-name"
                          value={newParty.name}
                          onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                          placeholder="당사자 이름"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="party-company">회사명</Label>
                        <Input
                          id="party-company"
                          value={newParty.company_name}
                          onChange={(e) =>
                            setNewParty({ ...newParty, company_name: e.target.value })
                          }
                          placeholder="회사명"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="party-phone">연락처</Label>
                      <Input
                        id="party-phone"
                        value={newParty.phone}
                        onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })}
                        placeholder="연락처"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="party-email">이메일</Label>
                      <Input
                        id="party-email"
                        value={newParty.email}
                        onChange={(e) => setNewParty({ ...newParty, email: e.target.value })}
                        placeholder="이메일"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={addManualParty}>
                      <Plus className="mr-2 h-4 w-4" />
                      당사자 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 기존 당사자 목록 버튼 */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPartySelector(true)}
                className="w-full"
              >
                <Search className="mr-2 h-4 w-4" />
                기존 당사자 목록에서 선택
              </Button>

              {/* 선택된 당사자 목록 */}
              {selectedParties.length === 0 ? (
                <div className="text-center py-4 border rounded-md bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    선택된 당사자가 없습니다. 당사자를 추가해주세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedParties.map((party) => (
                    <Card key={party.uniqueId} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            {party.entity_type === "individual" ? (
                              <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                            ) : (
                              <Building className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <Select
                                  value={party.lawsuit_party_type}
                                  onValueChange={(value) => updatePartyType(party.uniqueId, value)}
                                >
                                  <SelectTrigger className="h-7 w-[90px] text-xs">
                                    <SelectValue placeholder="유형" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAllPartyTypes().map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="font-medium">
                                  {party.entity_type === "individual"
                                    ? party.name
                                    : party.company_name}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {party.phone ? party.phone : "연락처 없음"}
                                {party.email ? ` · ${party.email}` : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeParty(party.uniqueId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="ml-2">
              {isSubmitting ? "저장 중..." : isEditMode ? "수정" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 당사자 선택 다이얼로그 */}
      <Dialog open={showPartySelector} onOpenChange={setShowPartySelector}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>기존 당사자 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="당사자 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredParties.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
                </div>
              ) : (
                filteredParties.map((party) => (
                  <Card key={party.id} className="transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {party.entity_type === "individual" ? (
                            <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                          ) : (
                            <Building className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs font-normal">
                                {getPartyTypeText(party.party_type)}
                              </Badge>
                              <span className="font-medium">
                                {party.entity_type === "individual"
                                  ? party.name
                                  : party.company_name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {party.phone ? party.phone : "연락처 없음"}
                              {party.email ? ` · ${party.email}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={newParty.role}
                            onValueChange={(value) => setNewParty({ ...newParty, role: value })}
                          >
                            <SelectTrigger className="h-7 w-[90px] text-xs">
                              <SelectValue placeholder="역할 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllPartyTypes().map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-green-600"
                            onClick={() => {
                              if (!newParty.role) {
                                toast.error("역할을 선택해주세요");
                                return;
                              }

                              // 고유 ID 생성
                              const uniqueId = uuidv4();

                              // 기존 당사자 추가
                              const partyToAdd = {
                                ...party,
                                uniqueId: uniqueId,
                                lawsuit_party_type: newParty.role,
                              };

                              setSelectedParties([...selectedParties, partyToAdd]);
                              setNewParty({ ...newParty, role: "" });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> 추가
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPartySelector(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
