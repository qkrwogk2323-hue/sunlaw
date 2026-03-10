"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/utils/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ClientInfoSection from "./components/ClientInfoSection";
import BasicInfoSection from "./components/BasicInfoSection";
import PartyInfoSection from "./components/PartyInfoSection";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function NewCasePage() {
  const router = useRouter();
  const { user, loading, isAdmin, isStaff } = useUser();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [formData, setFormData] = useState({
    clients: [], // 기본적으로 의뢰인 없음
    case_type: "debt", // 기본값: 채권
    status: "pending", // 기본값: 대기중
    filing_date: new Date(), // 기본값: 오늘
    principal_amount: "", // 수임원금
    interests: [], // 이자 정보 배열 (최대 2개)
    expenses: [], // 비용 정보 배열
    parties: [
      {
        party_type: "creditor", // 기본값: 채권자
        entity_type: "individual", // 기본값: 개인
        name: "",
        company_name: "",
        corporate_number: "",
        position: "",
        phone: "",
        unknown_phone: false,
        address: "",
        unknown_address: false,
        email: "",
        unknown_email: false,
        resident_number: "",
        unknown_resident_number: false,
      },
      {
        party_type: "debtor", // 기본값: 채무자
        entity_type: "individual", // 기본값: 개인
        name: "",
        company_name: "",
        corporate_number: "",
        position: "",
        phone: "",
        unknown_phone: false,
        address: "",
        unknown_address: false,
        email: "",
        unknown_email: false,
        resident_number: "",
        unknown_resident_number: false,
      },
    ],
  });

  const form = useForm({
    defaultValues: formData,
  });

  // 필수 필드 유효성 검사 추가
  useEffect(() => {
    const validateForm = () => {
      // 필수 필드 목록
      const requiredFields = {
        // 당사자 정보 검증 - 최소 2명(원고/피고 또는 채권자/채무자)
        parties:
          formData.parties.length >= 2 &&
          formData.parties.every((party) => {
            if (party.entity_type === "individual") {
              return !!party.name; // 개인인 경우 이름 필수
            } else {
              return !!party.company_name; // 법인인 경우 회사명 필수
            }
          }),
      };

      // 모든 필수 필드가 유효한지 확인
      const isValid = Object.values(requiredFields).every((value) => !!value);
      setIsFormValid(isValid);
    };

    validateForm();
  }, [formData]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }

    // admin 또는 staff 역할이 아닌 경우 접근 제한
    if (!isAdmin() && !isStaff()) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        // 사용자 목록 조회 (role 상관없이 모든 사용자)
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, birth_date")
          .order("name");

        if (usersError) throw usersError;
        setUsers(usersData || []);

        try {
          // 조직 목록 조회
          const { data: orgsData, error: orgsError } = await supabase
            .from("test_organizations")
            .select("id, name, business_number")
            .order("name");

          if (orgsError) {
            console.error("조직 데이터 조회 오류:", orgsError);
            // 테이블이 없는 경우 빈 배열 설정
            if (orgsError.code === "42P01") {
              // relation does not exist
              setOrganizations([]);
              toast.error("조직 테이블이 존재하지 않습니다", {
                description: "Supabase에서 테이블을 생성해주세요.",
              });
            } else {
              throw orgsError;
            }
          } else {
            setOrganizations(orgsData || []);
          }
        } catch (orgError) {
          console.error("조직 데이터 처리 오류:", orgError);
          setOrganizations([]);
        }
      } catch (error) {
        console.error("데이터 조회 오류:", error);
        toast.error("데이터 조회 중 오류가 발생했습니다", {
          description: error.message || "다시 시도해주세요.",
        });
      }
    };

    fetchData();
  }, [user, loading, router, isAdmin, isStaff]);

  // 사건 유형 변경 시 당사자 유형 자동 변경
  useEffect(() => {
    if (formData.case_type === "lawsuit") {
      // 소송 사건인 경우 원고/피고로 설정
      setFormData((prev) => ({
        ...prev,
        parties: prev.parties.map((party, index) => ({
          ...party,
          party_type: index === 0 ? "plaintiff" : "defendant",
        })),
      }));
    } else if (formData.case_type === "debt") {
      // 채권 사건인 경우 채권자/채무자로 설정
      setFormData((prev) => ({
        ...prev,
        parties: prev.parties.map((party, index) => ({
          ...party,
          party_type: index === 0 ? "creditor" : "debtor",
        })),
      }));
    }
  }, [formData.case_type]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      filing_date: date,
    }));
  };

  const handleClientChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedClients = [...prev.clients];
      updatedClients[index] = {
        ...updatedClients[index],
        [field]: value,
      };

      // 개인/그룹 유형이 변경된 경우 ID 필드 초기화
      if (field === "client_type") {
        if (value === "individual") {
          updatedClients[index].organization_id = "";
        } else {
          updatedClients[index].individual_id = "";
        }
      }

      return {
        ...prev,
        clients: updatedClients,
      };
    });
  };

  const handlePartyChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedParties = [...prev.parties];
      updatedParties[index] = {
        ...updatedParties[index],
        [field]: value,
      };
      return {
        ...prev,
        parties: updatedParties,
      };
    });
  };

  const handleUnknownToggle = (index, field) => {
    setFormData((prev) => {
      const updatedParties = [...prev.parties];
      const unknownField = `unknown_${field}`;

      // 모름 체크박스 상태 토글
      updatedParties[index] = {
        ...updatedParties[index],
        [unknownField]: !updatedParties[index][unknownField],
      };

      // 모름이 체크되면 필드 값을 비우고, 입력 불가능하게 설정
      if (updatedParties[index][unknownField]) {
        updatedParties[index][field] = "";
      }

      return {
        ...prev,
        parties: updatedParties,
      };
    });
  };

  const addClient = () => {
    setFormData((prev) => ({
      ...prev,
      clients: [
        ...prev.clients,
        {
          client_type: "individual",
          individual_id: "",
          organization_id: "",
        },
      ],
    }));
  };

  const removeClient = (index) => {
    setFormData((prev) => {
      const updatedClients = [...prev.clients];
      updatedClients.splice(index, 1);
      return {
        ...prev,
        clients: updatedClients,
      };
    });
  };

  const addParty = () => {
    setFormData((prev) => ({
      ...prev,
      parties: [
        ...prev.parties,
        {
          party_type: prev.case_type === "lawsuit" ? "plaintiff" : "creditor",
          entity_type: "individual",
          name: "",
          company_name: "",
          corporate_number: "",
          position: "",
          phone: "",
          unknown_phone: false,
          address: "",
          unknown_address: false,
          email: "",
          unknown_email: false,
          resident_number: "",
          unknown_resident_number: false,
        },
      ],
    }));
  };

  const removeParty = (index) => {
    if (formData.parties.length <= 2) {
      alert("최소 2명의 당사자가 필요합니다.");
      return;
    }

    setFormData((prev) => {
      const updatedParties = [...prev.parties];
      updatedParties.splice(index, 1);
      return {
        ...prev,
        parties: updatedParties,
      };
    });
  };

  // 이자 추가 함수
  const addInterest = () => {
    if (formData.interests.length >= 2) {
      alert("이자는 최대 2개까지만 추가할 수 있습니다.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      interests: [
        ...prev.interests,
        {
          start_date: null, // 기산일
          end_date: null, // 종기일
          rate: "", // 이자율
        },
      ],
    }));
  };

  // 이자 삭제 함수
  const removeInterest = (index) => {
    setFormData((prev) => {
      const updatedInterests = [...prev.interests];
      updatedInterests.splice(index, 1);
      return {
        ...prev,
        interests: updatedInterests,
      };
    });
  };

  // 이자 정보 변경 함수
  const handleInterestChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedInterests = [...prev.interests];
      updatedInterests[index] = {
        ...updatedInterests[index],
        [field]: value,
      };
      return {
        ...prev,
        interests: updatedInterests,
      };
    });
  };

  // 이자 날짜 변경 함수
  const handleInterestDateChange = (index, field, date) => {
    setFormData((prev) => {
      const updatedInterests = [...prev.interests];
      updatedInterests[index] = {
        ...updatedInterests[index],
        [field]: date,
      };
      return {
        ...prev,
        interests: updatedInterests,
      };
    });
  };

  // 비용 추가 함수
  const addExpense = (type) => {
    // 이미 해당 유형의 비용이 있는지 확인
    const existingExpense = formData.expenses.find((expense) => expense.expense_type === type);

    if (existingExpense) {
      toast.error("이미 추가된 비용 유형입니다", {
        description: `${type}은(는) 이미 추가되어 있습니다.`,
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          expense_type: type, // 비용 유형 (서기료, 송달료, 인지액, 예납금)
          amount: "", // 금액
        },
      ],
    }));

    toast.success("비용 추가됨", {
      description: `${type} 항목이 추가되었습니다.`,
    });
  };

  // 비용 삭제 함수
  const removeExpense = (index) => {
    setFormData((prev) => {
      const updatedExpenses = [...prev.expenses];
      updatedExpenses.splice(index, 1);
      return {
        ...prev,
        expenses: updatedExpenses,
      };
    });
  };

  // 비용 정보 변경 함수
  const handleExpenseChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedExpenses = [...prev.expenses];
      updatedExpenses[index] = {
        ...updatedExpenses[index],
        [field]: value,
      };
      return {
        ...prev,
        expenses: updatedExpenses,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    // 필수 필드 검증
    if (!isFormValid) {
      toast.error("필수 정보를 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      // 사용자 세션 확인 (NextAuth 세션에 의존)
      // NextAuth에서 이미 로그인 상태를 확인했으므로 Supabase 세션 체크는 생략

      // 1. 사건 기본 정보 저장
      const caseData = {
        case_type: formData.case_type || "debt",
        status: formData.status || "pending",
        filing_date: formData.filing_date || null,
        principal_amount: formData.principal_amount ? parseFloat(formData.principal_amount) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("저장할 사건 데이터:", caseData);

      // 테이블 이름 확인
      const tableName = "test_cases";
      console.log(`테이블 이름: ${tableName}`);

      try {
        // RLS 정책 문제를 해결하기 위해 테이블 스키마를 명시적으로 지정
        const { data: newCase, error: caseError } = await supabase
          .from(tableName)
          .insert(caseData)
          .select() // 생성된 레코드 반환
          .single();

        if (caseError) {
          console.error("사건 저장 오류:", caseError);

          // 테이블이 없는 경우
          if (caseError.code === "42P01") {
            throw new Error(
              `테이블이 존재하지 않습니다: ${tableName}. Supabase에서 테이블을 생성해주세요.`
            );
          }

          // RLS 정책 위반 오류인 경우
          if (caseError.code === "42501") {
            throw new Error(
              "RLS 정책 위반: Supabase에서 해당 테이블의 RLS 정책을 확인하거나 비활성화해주세요."
            );
          }

          throw new Error(`사건 저장 실패: ${caseError.message} (코드: ${caseError.code})`);
        }

        if (!newCase) {
          throw new Error("사건이 저장되었지만 반환된 데이터가 없습니다.");
        }

        console.log("저장된 사건:", newCase);

        // 2. 이자 정보 저장 (이자가 있는 경우에만)
        if (formData.interests.length > 0) {
          try {
            const interestsData = formData.interests.map((interest) => {
              return {
                case_id: newCase.id,
                start_date: interest.start_date || null,
                end_date: interest.end_date || null,
                rate: interest.rate ? parseFloat(interest.rate) : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            });

            const { error: interestsError } = await supabase
              .from("test_case_interests")
              .insert(interestsData);

            if (interestsError) {
              console.error("이자 정보 저장 오류:", interestsError);
              if (interestsError.code === "42P01") {
                console.warn(
                  "이자 정보 테이블이 존재하지 않습니다. 이자 정보는 저장되지 않았습니다."
                );
              } else {
                throw new Error(
                  `이자 정보 저장 실패: ${interestsError.message} (코드: ${interestsError.code})`
                );
              }
            }
          } catch (interestError) {
            console.error("이자 정보 처리 오류:", interestError);
            // 이자 정보 저장 실패는 전체 프로세스를 중단하지 않음
          }
        }

        // 3. 비용 정보 저장 (비용이 있는 경우에만)
        if (formData.expenses.length > 0) {
          try {
            const expensesData = formData.expenses.map((expense) => {
              return {
                case_id: newCase.id,
                expense_type:
                  expense.expense_type === "기타"
                    ? expense.custom_type || "기타 비용"
                    : expense.expense_type,
                amount: expense.amount ? parseFloat(expense.amount) : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            });

            const { error: expensesError } = await supabase
              .from("test_case_expenses")
              .insert(expensesData);

            if (expensesError) {
              console.error("비용 정보 저장 오류:", expensesError);
              if (expensesError.code === "42P01") {
                console.warn(
                  "비용 정보 테이블이 존재하지 않습니다. 비용 정보는 저장되지 않았습니다."
                );
              } else {
                throw new Error(
                  `비용 정보 저장 실패: ${expensesError.message} (코드: ${expensesError.code})`
                );
              }
            }
          } catch (expenseError) {
            console.error("비용 정보 처리 오류:", expenseError);
            // 비용 정보 저장 실패는 전체 프로세스를 중단하지 않음
          }
        }

        // 4. 의뢰인 정보 저장 (의뢰인이 있는 경우에만)
        if (formData.clients.length > 0) {
          try {
            const clientsData = formData.clients.map((client) => {
              return {
                case_id: newCase.id,
                client_type: client.client_type,
                individual_id: client.client_type === "individual" ? client.individual_id : null,
                organization_id:
                  client.client_type === "organization" ? client.organization_id : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            });

            const { error: clientsError } = await supabase
              .from("test_case_clients")
              .insert(clientsData);

            if (clientsError) {
              console.error("의뢰인 정보 저장 오류:", clientsError);
              if (clientsError.code === "42P01") {
                console.warn(
                  "의뢰인 정보 테이블이 존재하지 않습니다. 의뢰인 정보는 저장되지 않았습니다."
                );
              } else {
                throw new Error(
                  `의뢰인 정보 저장 실패: ${clientsError.message} (코드: ${clientsError.code})`
                );
              }
            }
          } catch (clientError) {
            console.error("의뢰인 정보 처리 오류:", clientError);
            // 의뢰인 정보 저장 실패는 전체 프로세스를 중단하지 않음
          }
        }

        // 5. 당사자 정보 저장
        try {
          const partiesData = formData.parties.map((party) => {
            return {
              case_id: newCase.id,
              party_type: party.party_type,
              entity_type: party.entity_type,
              name: party.name || null,
              company_name: party.entity_type === "corporation" ? party.company_name : null,
              corporate_number: party.entity_type === "corporation" ? party.corporate_number : null,
              position: party.entity_type === "corporation" ? party.position : null,
              phone: party.unknown_phone ? null : party.phone,
              address: party.unknown_address ? null : party.address,
              email: party.unknown_email ? null : party.email,
              resident_number: party.unknown_resident_number ? null : party.resident_number,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          });

          const { error: partiesError } = await supabase
            .from("test_case_parties")
            .insert(partiesData);

          if (partiesError) {
            console.error("당사자 정보 저장 오류:", partiesError);
            if (partiesError.code === "42P01") {
              console.warn(
                "당사자 정보 테이블이 존재하지 않습니다. 당사자 정보는 저장되지 않았습니다."
              );
            } else {
              throw new Error(
                `당사자 정보 저장 실패: ${partiesError.message} (코드: ${partiesError.code})`
              );
            }
          }
        } catch (partyError) {
          console.error("당사자 정보 처리 오류:", partyError);
          // 당사자 정보 저장 실패는 전체 프로세스를 중단하지 않음
        }

        // 성공 시 사건 목록 페이지로 이동
        toast.success("사건이 성공적으로 등록되었습니다", {
          description: "사건 목록 페이지로 이동합니다.",
        });
        router.push("/cases");
      } catch (saveError) {
        console.error("사건 저장 처리 오류:", saveError);
        throw saveError;
      }
    } catch (error) {
      console.error("사건 등록 오류:", error);

      // 에러 메시지 개선
      if (error.message && error.message.includes("RLS 정책 위반")) {
        toast.error("권한 오류", {
          description: "데이터베이스 접근 권한이 없습니다. 관리자에게 문의하세요.",
        });
      } else {
        toast.error("사건 등록 중 오류가 발생했습니다.", {
          description: error.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 당사자 유형 레이블
  const getPartyTypeLabel = (caseType, partyType) => {
    if (caseType === "lawsuit") {
      return partyType === "plaintiff" ? "원고" : "피고";
    } else {
      return partyType === "creditor" ? "채권자" : "채무자";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-10 w-[250px] mb-6" />
        <div className="grid gap-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!user || (!isAdmin() && !isStaff())) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">접근 권한이 없습니다</CardTitle>
            <CardDescription>이 페이지는 관리자 또는 직원만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => router.push("/cases")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Button>
        <h1 className="text-2xl font-bold">새 사건 등록</h1>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit}>
          {/* 의뢰인 정보 섹션 */}
          <ClientInfoSection
            formData={formData}
            setFormData={setFormData}
            users={users}
            organizations={organizations}
          />

          {/* 기본 정보와 당사자 정보를 PC에서 좌우로 배치 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 기본 정보 */}
            <BasicInfoSection formData={formData} setFormData={setFormData} />

            {/* 당사자 정보 */}
            <PartyInfoSection formData={formData} setFormData={setFormData} />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/cases")}>
              취소
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button type="submit" disabled={submitting || !isFormValid}>
                      {submitting ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!isFormValid && (
                  <TooltipContent>
                    <p>필수 정보를 모두 입력해주세요</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </form>
      </Form>
    </div>
  );
}
