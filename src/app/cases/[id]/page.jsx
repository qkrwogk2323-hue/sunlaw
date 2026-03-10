"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  BarChart2,
  Clock,
  FileUp,
  History,
  Bell,
  AlertTriangle,
  ChevronRight,
  Plus,
  CalendarPlus,
  Scale,
  Edit,
  User,
  Building2,
  Trash2,
  Search,
  Activity,
  Gavel,
  CreditCard,
  CalendarIcon,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusById } from "@/utils/constants";

import RecoveryActivities from "./components/RecoveryActivities";
import CaseDashboard from "./components/CaseDashboard";
import LawsuitManager from "./components/LawsuitManager";

// 모달 컴포넌트 import
import ClientDetailModal from "./components/modals/ClientDetailModal";
import PartyDetailModal from "./components/modals/PartyDetailModal";
import ClientManageModal from "./components/modals/ClientManageModal";
import StatusChangeModal from "./components/modals/StatusChangeModal";
import PartyManageModal from "./components/modals/PartyManageModal";
import DebtDetailModal from "./components/modals/DebtDetailModal";
import AddLawsuitModal from "./components/modals/AddLawsuitModal";
import ScheduleFormModal from "./components/modals/ScheduleFormModal";
import RecoveryActivityModal from "./components/modals/RecoveryActivityModal";
import AddSubmissionModal from "./components/modals/AddSubmissionModal";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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

export default function CasePage() {
  const pathname = usePathname();
  const router = useRouter();
  const { id: caseId } = useParams();
  const { user } = useUser();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [parties, setParties] = useState([]);
  const [clients, setClients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // 모달 상태 관리
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [showPartyDetailModal, setShowPartyDetailModal] = useState(false);
  const [showDebtDetailModal, setShowDebtDetailModal] = useState(false);
  const [openLawsuitModal, setOpenLawsuitModal] = useState(false);
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [openRecoveryModal, setOpenRecoveryModal] = useState(false);
  const [openSubmissionModal, setOpenSubmissionModal] = useState(false);
  const [editingLawsuit, setEditingLawsuit] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [editingRecovery, setEditingRecovery] = useState(null);

  // 추가 상태 관리
  const [selectedStatus, setSelectedStatus] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [orgSearchTerm, setOrgSearchTerm] = useState("");
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [orgSearchResults, setOrgSearchResults] = useState([]);

  // 상태 변수 추가
  const [partyType, setPartyType] = useState("plaintiff");
  const [entityType, setEntityType] = useState("individual");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [representative, setRepresentative] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [residentNumber, setResidentNumber] = useState("");
  const [corporateNumber, setCorporateNumber] = useState("");
  const [position, setPosition] = useState("");

  // 당사자 수정 관련 상태 변수
  const [editMode, setEditMode] = useState(false);
  const [editPartyId, setEditPartyId] = useState(null);

  // 알림 개수 관리
  const [notificationCount, setNotificationCount] = useState(0);

  // 추가된 상태 변수
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 케이스 정보 가져오기
  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      // 사건 정보 및 관련 데이터 가져오기
      const { data, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", caseId)
        .single();

      if (error) throw error;

      // 사건 정보가 없는 경우
      if (!data) {
        toast.error("사건 정보를 찾을 수 없습니다");
        router.push("/cases");
        return;
      }

      // status_id가 있으면 constants에서 상태 정보 가져오기
      if (data.status_id) {
        const statusInfo = getStatusById(data.status_id);
        data.status_info = {
          name: statusInfo.name,
          color: statusInfo.color,
        };
      }

      // 당사자 정보 가져오기
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("*")
        .eq("case_id", caseId);

      if (partiesError) throw partiesError;

      // 의뢰인 정보 가져오기
      const { data: clientsData, error: clientsError } = await supabase
        .from("test_case_clients")
        .select(
          `
          *,
          individual_id(id, name, email, phone_number, resident_number, address),
          organization_id(
            id, 
            name, 
            representative_name, 
            representative_position, 
            business_number, 
            phone, 
            email, 
            address
          )
        `
        )
        .eq("case_id", caseId);

      if (clientsError) throw clientsError;

      // 이자 정보 가져오기
      const { data: interestsData, error: interestsError } = await supabase
        .from("test_case_interests")
        .select("*")
        .eq("case_id", caseId);

      if (interestsError) throw interestsError;

      // 비용 정보 가져오기
      const { data: expensesData, error: expensesError } = await supabase
        .from("test_case_expenses")
        .select("*")
        .eq("case_id", caseId);

      if (expensesError) throw expensesError;

      // 의뢰인 정보 가공
      const processedClients = clientsData.map((client) => {
        console.log("원본 의뢰인 데이터:", client);

        return {
          ...client,
          client_type: client.individual_id ? "individual" : "organization",
          individual_name: client.individual_id?.name,
          organization_name: client.organization_id?.name,
          representative_name: client.organization_id?.representative_name,
          representative_position: client.organization_id?.representative_position,
          business_number: client.organization_id?.business_number,
          phone: client.individual_id?.phone_number || client.organization_id?.phone || "",
          email: client.individual_id?.email || client.organization_id?.email || "",
          address: client.individual_id
            ? client.individual_id?.address || ""
            : client.organization_id?.address || "",
          resident_number: client.individual_id?.resident_number || "",
        };
      });

      // 이자 정보 처리 - 사용자 화면에 표시할 이자 금액 계산 추가
      const processedInterests = interestsData.map((interest) => {
        let amount = 0;
        if (interest.start_date && interest.end_date && interest.rate && data.principal_amount) {
          const days = differenceInDays(new Date(interest.end_date), new Date(interest.start_date));
          if (days > 0) {
            // 일할 계산: 원금 * 이자율 * (일수 / 365)
            amount = Math.round(
              Number(data.principal_amount) * (Number(interest.rate) / 100) * (days / 365)
            );
          }
        }
        return {
          ...interest,
          amount: amount.toString(),
        };
      });

      // caseData에 이자와 비용 정보 포함
      const enrichedCaseData = {
        ...data,
        interests: processedInterests || [],
        expenses: expensesData || [],
      };

      setCaseData(enrichedCaseData);
      setParties(partiesData || []);
      setClients(processedClients || []);
    } catch (error) {
      console.error("케이스 정보 가져오기 실패:", error);
      console.error("오류 상세 정보:", JSON.stringify(error, null, 2));
      console.error("오류 stack:", error.stack);

      toast.error("케이스 정보 가져오기 실패", {
        description: error.message || "알 수 없는 오류가 발생했습니다",
      });
    } finally {
      setLoading(false);
    }
  };

  // 알림 정보 가져오기
  const fetchNotifications = async () => {
    console.log(caseId);
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from("test_case_notifications")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("알림 정보 조회 실패:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // 알림 개수 가져오기
  const fetchNotificationCount = async () => {
    try {
      const { count, error } = await supabase
        .from("test_case_notifications")
        .select("*", { count: "exact", head: true })
        .eq("case_id", caseId);

      if (error) throw error;

      setNotificationCount(count || 0);
    } catch (error) {
      console.error("알림 개수 조회 실패:", error);
      setNotificationCount(0);
    }
  };

  // 알림 유형에 따른 아이콘 가져오기
  const getNotificationIcon = (type) => {
    switch (type) {
      case "lawsuit_update":
        return <Gavel className="w-4 h-4 text-purple-500" />;
      case "recovery_activity":
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case "deadline":
        return <CalendarIcon className="w-4 h-4 text-red-500" />;
      case "document":
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // 알림 생성 시간 포맷팅
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return `${diffDay}일 전`;
    } else if (diffHour > 0) {
      return `${diffHour}시간 전`;
    } else if (diffMin > 0) {
      return `${diffMin}분 전`;
    } else {
      return "방금 전";
    }
  };

  useEffect(() => {
    if (caseId && user) {
      fetchCaseDetails();
      fetchNotifications();
      fetchNotificationCount();
    }
  }, [caseId, user]);

  if (loading) {
    return (
      <div className="container p-4 mx-auto">
        <div className="space-y-2 mb-6">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container p-4 mx-auto">
        <div className="space-y-2 mb-6">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
          <h2 className="text-xl font-bold">사건 정보를 찾을 수 없습니다</h2>
        </div>
      </div>
    );
  }

  // 상태에 따른 배지 색상 매핑
  const getStatusColor = (status) => {
    const statusMap = {
      pending: "bg-amber-500 hover:bg-amber-600",
      in_progress: "bg-violet-500 hover:bg-violet-600",
      completed: "bg-green-500 hover:bg-green-600",
    };

    return statusMap[status] || "bg-slate-500 hover:bg-slate-600";
  };

  // 당사자 유형에 따른 색상
  const getPartyTypeColor = (type) => {
    const typeMap = {
      plaintiff: "text-blue-600",
      defendant: "text-red-600",
      creditor: "text-emerald-600",
      debtor: "text-amber-600",
      applicant: "text-purple-600",
      respondent: "text-orange-600",
    };

    return typeMap[type] || "text-gray-600";
  };

  // 의뢰인 관리 함수
  const handleRemoveClient = async (clientId) => {
    if (!confirm("이 의뢰인을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("test_case_clients").delete().eq("id", clientId);

      if (error) throw error;

      // 의뢰인 목록 갱신
      setClients(clients.filter((client) => client.id !== clientId));
      toast.success("의뢰인이 삭제되었습니다");
    } catch (error) {
      console.error("의뢰인 삭제 실패:", error);
      toast.error("의뢰인 삭제 실패", {
        description: error.message,
      });
    }
  };

  const handleUserSearch = async () => {
    if (!userSearchTerm) {
      toast.warning("검색어를 입력해주세요");
      return;
    }

    try {
      setUserSearchLoading(true);
      const { data, error } = await supabase
        .from("test_users")
        .select("*")
        .or(`name.ilike.%${userSearchTerm}%,email.ilike.%${userSearchTerm}%`)
        .limit(10);

      if (error) {
        if (error.code === "42P01") {
          // 테이블이 존재하지 않는 경우
          toast.error("사용자 테이블이 존재하지 않습니다 (test_users)", {
            description: "관리자에게 문의하세요",
          });
        } else {
          throw error;
        }
      } else {
        setUserSearchResults(data || []);
        if (data && data.length === 0) {
          toast.info("검색 결과가 없습니다");
        }
      }
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      toast.error("사용자 검색에 실패했습니다");
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleOrgSearch = async () => {
    if (!orgSearchTerm) {
      toast.warning("검색어를 입력해주세요");
      return;
    }

    try {
      setOrgSearchLoading(true);
      const { data, error } = await supabase
        .from("test_organizations")
        .select("*")
        .ilike("name", `%${orgSearchTerm}%`)
        .limit(10);

      if (error) {
        if (error.code === "42P01") {
          // 테이블이 존재하지 않는 경우
          toast.error("조직 테이블이 존재하지 않습니다 (test_organizations)", {
            description: "관리자에게 문의하세요",
          });
        } else {
          throw error;
        }
      } else {
        setOrgSearchResults(data || []);
        if (data && data.length === 0) {
          toast.info("검색 결과가 없습니다");
        }
      }
    } catch (error) {
      console.error("조직 검색 실패:", error);
      toast.error("조직 검색에 실패했습니다");
    } finally {
      setOrgSearchLoading(false);
    }
  };

  const handleAddUserClient = async (userId) => {
    try {
      // 이미 등록된 의뢰인인지 확인
      const isAlreadyClient = clients.some(
        (client) => client.client_type === "individual" && client.individual_id?.id === userId
      );

      if (isAlreadyClient) {
        toast.info("이미 등록된 의뢰인입니다");
        return;
      }

      const newClient = {
        case_id: caseId,
        individual_id: userId,
        organization_id: null,
        position: "",
      };

      const { data, error } = await supabase
        .from("test_case_clients")
        .insert(newClient)
        .select(
          `
          *,
          individual_id(id, name),
          organization_id(id, name, representative_name)
        `
        )
        .single();

      if (error) throw error;

      // 클라이언트 객체 가공
      const processedClient = {
        ...data,
        client_type: "individual",
        individual_name: data.individual_id?.name,
      };

      // 의뢰인 목록 갱신
      setClients([...clients, processedClient]);

      toast.success("의뢰인이 추가되었습니다");
      setShowClientModal(false);
    } catch (error) {
      console.error("의뢰인 추가 실패:", error);
      toast.error("의뢰인 추가 실패", {
        description: error.message,
      });
    }
  };

  const handleAddOrgClient = async (orgId) => {
    try {
      // 이미 등록된 의뢰인인지 확인
      const isAlreadyClient = clients.some(
        (client) => client.client_type === "organization" && client.organization_id?.id === orgId
      );

      if (isAlreadyClient) {
        toast.info("이미 등록된 의뢰인입니다");
        return;
      }

      const newClient = {
        case_id: caseId,
        individual_id: null,
        organization_id: orgId,
        position: "",
      };

      const { data, error } = await supabase
        .from("test_case_clients")
        .insert(newClient)
        .select(
          `
          *,
          individual_id(id, name),
          organization_id(id, name, representative_name)
        `
        )
        .single();

      if (error) throw error;

      // 클라이언트 객체 가공
      const processedClient = {
        ...data,
        client_type: "organization",
        organization_name: data.organization_id?.name,
        representative_name: data.organization_id?.representative_name,
      };

      // 의뢰인 목록 갱신
      setClients([...clients, processedClient]);

      toast.success("의뢰인이 추가되었습니다");
      setShowClientModal(false);
    } catch (error) {
      console.error("의뢰인 추가 실패:", error);
      toast.error("의뢰인 추가 실패", {
        description: error.message,
      });
    }
  };

  // 당사자 관리 함수
  const handleEditParty = async (partyId, partyData) => {
    try {
      setLoading(true);

      const {
        partyType,
        entityType,
        name,
        companyName,
        phone,
        email,
        address,
        residentNumber,
        corporateNumber,
        position,
      } = partyData;

      // 필수 필드 검증
      if (!partyType) {
        toast.error("당사자 유형을 선택해주세요.");
        setLoading(false);
        return;
      }

      if (!entityType) {
        toast.error("개인/법인 구분을 선택해주세요.");
        setLoading(false);
        return;
      }

      if (entityType === "individual" && !name) {
        toast.error("이름을 입력해주세요.");
        setLoading(false);
        return;
      }

      if (entityType === "corporation" && !companyName) {
        toast.error("법인/단체명을 입력해주세요.");
        setLoading(false);
        return;
      }

      // 당사자 수정
      const { error } = await supabase
        .from("test_case_parties")
        .update({
          party_type: partyType,
          entity_type: entityType,
          name,
          company_name: companyName,
          phone,
          email,
          address,
          resident_number: residentNumber,
          corporate_number: corporateNumber,
          position,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partyId);

      if (error) {
        console.error("Error updating party:", error);
        toast.error("당사자 수정 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      // 성공적으로 당사자가 수정되면 목록 새로고침
      fetchCaseDetails();
      setEditMode(false);
      setEditPartyId(null);
      setShowPartyModal(false);
      toast.success("당사자 정보가 수정되었습니다.");
    } catch (error) {
      console.error("Error in handleEditParty:", error);
      toast.error("당사자 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 당사자 수정 모달 열기
  const openEditPartyModal = (party) => {
    setEditMode(true);
    setEditPartyId(party.id);
    setPartyType(party.party_type);
    setEntityType(party.entity_type || "individual");
    setName(party.name || "");
    setCompanyName(party.company_name || "");
    setPhone(party.phone || "");
    setEmail(party.email || "");
    setAddress(party.address || "");
    setResidentNumber(party.resident_number || "");
    setCorporateNumber(party.corporate_number || "");
    setPosition(party.position || "");
    setShowPartyModal(true);
  };

  const handleRemoveParty = async (partyId) => {
    if (!confirm("이 당사자를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("test_case_parties").delete().eq("id", partyId);

      if (error) throw error;

      // 당사자 목록 갱신
      setParties(parties.filter((party) => party.id !== partyId));
      toast.success("당사자가 삭제되었습니다");
    } catch (error) {
      console.error("당사자 삭제 실패:", error);
      toast.error("당사자 삭제 실패", {
        description: error.message,
      });
    }
  };

  // 상태 관리 함수
  const handleStatusChange = (value) => {
    setSelectedStatus(value);
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      toast.error("상태를 선택해주세요");
      return;
    }

    try {
      const { error } = await supabase
        .from("test_cases")
        .update({ status: selectedStatus })
        .eq("id", caseId);

      if (error) throw error;

      // 케이스 정보 갱신
      setCaseData({
        ...caseData,
        status: selectedStatus,
      });

      toast.success("상태가 변경되었습니다");
      setShowStatusModal(false);
    } catch (error) {
      console.error("상태 변경 실패:", error);
      toast.error("상태 변경 실패", {
        description: error.message,
      });
    }
  };

  // 당사자 관리 함수에 추가
  const handleAddParty = async (partyData) => {
    try {
      setLoading(true);

      const {
        partyType,
        entityType,
        name,
        companyName,
        phone,
        email,
        address,
        residentNumber,
        corporateNumber,
        position,
      } = partyData;

      console.log("당사자 저장 데이터:", {
        partyType,
        entityType,
        name,
        companyName,
        phone,
        email,
        address,
        residentNumber,
        corporateNumber,
        position,
      });

      // 필수 필드 검증
      if (!partyType) {
        toast.error("당사자 유형을 선택해주세요.");
        setLoading(false);
        return;
      }

      if (!entityType) {
        toast.error("개인/법인 구분을 선택해주세요.");
        setLoading(false);
        return;
      }

      if (entityType === "individual" && !name) {
        toast.error("이름을 입력해주세요.");
        setLoading(false);
        return;
      }

      if (entityType === "corporation" && !companyName) {
        toast.error("법인/단체명을 입력해주세요.");
        setLoading(false);
        return;
      }

      // 당사자 추가
      const { data: newParty, error } = await supabase
        .from("test_case_parties")
        .insert([
          {
            case_id: caseId,
            party_type: partyType,
            entity_type: entityType,
            name,
            company_name: companyName,
            phone,
            email,
            address,
            resident_number: residentNumber,
            corporate_number: corporateNumber,
            position,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error("Error adding party:", error);
        toast.error("당사자 추가 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      console.log("저장된 당사자:", newParty);

      // 성공적으로 당사자가 추가되면 목록 새로고침
      fetchCaseDetails();
      setShowPartyModal(false);
      resetPartyForm();
      toast.success("당사자가 추가되었습니다.");
    } catch (error) {
      console.error("Error in handleAddParty:", error);
      toast.error("당사자 추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 당사자 추가 후 폼 초기화
  const resetPartyForm = () => {
    setPartyType("plaintiff");
    setEntityType("individual");
    setName("");
    setCompanyName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setResidentNumber("");
    setCorporateNumber("");
    setPosition("");
  };

  // 모달 닫기 시 상태 초기화
  const handlePartyModalOpenChange = (open) => {
    if (!open) {
      resetPartyForm();
    }
    setShowPartyModal(open);
  };

  // 채권금액 상세 정보 업데이트 핸들러
  const handleUpdateDebtInfo = async (debtInfo) => {
    try {
      setLoading(true);

      // 1. 사건의 principal_amount 필드만 업데이트
      const { error: caseError } = await supabase
        .from("test_cases")
        .update({
          principal_amount: debtInfo.principal_amount,
        })
        .eq("id", caseId);

      if (caseError) throw caseError;

      // 2. 기존 이자 정보 모두 삭제하고 다시 저장
      const { error: deleteInterestsError } = await supabase
        .from("test_case_interests")
        .delete()
        .eq("case_id", caseId);

      if (deleteInterestsError) throw deleteInterestsError;

      // 3. 이자 정보가 있으면 새로 저장
      if (debtInfo.interests && debtInfo.interests.length > 0) {
        const interestsToInsert = debtInfo.interests.map((interest) => ({
          case_id: caseId,
          start_date: interest.start_date,
          end_date: interest.end_date,
          rate: interest.rate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: insertInterestsError } = await supabase
          .from("test_case_interests")
          .insert(interestsToInsert);

        if (insertInterestsError) throw insertInterestsError;
      }

      // 4. 기존 비용 정보 모두 삭제하고 다시 저장
      const { error: deleteExpensesError } = await supabase
        .from("test_case_expenses")
        .delete()
        .eq("case_id", caseId);

      if (deleteExpensesError) throw deleteExpensesError;

      // 5. 비용 정보가 있으면 새로 저장
      if (debtInfo.expenses && debtInfo.expenses.length > 0) {
        const expensesToInsert = debtInfo.expenses.map((expense) => ({
          case_id: caseId,
          expense_type:
            expense.expense_type === "기타" && expense.custom_type
              ? expense.custom_type
              : expense.expense_type,
          amount: expense.amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: insertExpensesError } = await supabase
          .from("test_case_expenses")
          .insert(expensesToInsert);

        if (insertExpensesError) throw insertExpensesError;
      }

      // 데이터 새로고침
      await fetchCaseDetails();
      toast.success("채권 정보가 업데이트되었습니다");
    } catch (error) {
      console.error("채권 정보 업데이트 실패:", error);
      toast.error("채권 정보 업데이트에 실패했습니다", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 사용자 검색 시 엔터키 처리
  const handleUserSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUserSearch();
    }
  };

  // 조직 검색 시 엔터키 처리
  const handleOrgSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleOrgSearch();
    }
  };

  // 소송 생성 또는 수정 후 콜백 함수
  const onLawsuitCreated = async () => {
    // 소송 정보가 변경되면 사건 정보를 새로 불러옵니다
    toast.success("소송 정보가 저장되었습니다");
    await fetchCaseDetails();
  };

  // 일정 추가 후 콜백 함수
  const onScheduleAdded = async () => {
    // 일정 정보가 변경되면 사건 정보를 새로 불러옵니다
    toast.success("일정 정보가 저장되었습니다");
    await fetchCaseDetails();
    setEditingLawsuit(null);
    setEditingSchedule(null);
  };

  // 회수 활동 추가 후 콜백 함수
  const onRecoveryAdded = async () => {
    // 회수 활동 정보가 변경되면 사건 정보를 새로 불러옵니다
    toast.success("회수 활동 정보가 저장되었습니다");
    await fetchCaseDetails();
    setEditingRecovery(null);
  };

  // 제출 서류 추가 후 콜백 함수
  const onSubmissionAdded = async () => {
    // 제출 서류 정보가 변경되면 사건 정보를 새로 불러옵니다
    toast.success("제출 서류 정보가 저장되었습니다");
    await fetchCaseDetails();
    setEditingLawsuit(null);
    setEditingSubmission(null);
  };

  // 사건 삭제 함수 추가
  const handleDeleteCase = async () => {
    if (!caseId) return;

    try {
      setIsDeleting(true);

      // 단계별 삭제 프로세스 시작
      console.log(`사건 ID ${caseId} 삭제 프로세스 시작`);

      // 1. 제출 문서 및 관련 파일 삭제
      const { data: submissionData, error: submissionQueryError } = await supabase
        .from("test_lawsuit_submissions")
        .select("id, file_url")
        .eq("lawsuit_id", caseId);

      if (submissionQueryError) {
        console.error("제출 문서 조회 오류:", submissionQueryError);
      } else if (submissionData && submissionData.length > 0) {
        console.log(`${submissionData.length}개의 제출 문서 삭제 중...`);

        // 첨부 파일 삭제
        for (const submission of submissionData) {
          if (submission.file_url) {
            try {
              const filePathMatch = submission.file_url.match(/case-files\/(.+)/);
              if (filePathMatch && filePathMatch[1]) {
                const filePath = filePathMatch[1];
                await supabase.storage.from("case-files").remove([filePath]);
                console.log(`파일 삭제 완료: ${filePath}`);
              }
            } catch (fileError) {
              console.error(`파일 삭제 오류: ${submission.file_url}`, fileError);
            }
          }
        }

        // 제출 문서 삭제
        const { error: submissionDeleteError } = await supabase
          .from("test_lawsuit_submissions")
          .delete()
          .in(
            "id",
            submissionData.map((s) => s.id)
          );

        if (submissionDeleteError) {
          console.error("제출 문서 삭제 오류:", submissionDeleteError);
        } else {
          console.log("제출 문서 삭제 완료");
        }
      }

      // 2. 소송 관련 데이터 삭제
      const { error: lawsuitPartyDeleteError } = await supabase
        .from("test_lawsuit_parties")
        .delete()
        .eq("lawsuit_id", caseId);

      if (lawsuitPartyDeleteError) {
        console.error("소송 당사자 관계 삭제 오류:", lawsuitPartyDeleteError);
      } else {
        console.log("소송 당사자 관계 삭제 완료");
      }

      const { error: lawsuitDeleteError } = await supabase
        .from("test_case_lawsuits")
        .delete()
        .eq("case_id", caseId);

      if (lawsuitDeleteError) {
        console.error("소송 삭제 오류:", lawsuitDeleteError);
      } else {
        console.log("소송 데이터 삭제 완료");
      }

      // 3. 회수 활동 및 관련 파일 삭제
      const { data: recoveryData, error: recoveryQueryError } = await supabase
        .from("test_recovery_activities")
        .select("id, file_url")
        .eq("case_id", caseId);

      if (recoveryQueryError) {
        console.error("회수 활동 조회 오류:", recoveryQueryError);
      } else if (recoveryData && recoveryData.length > 0) {
        console.log(`${recoveryData.length}개의 회수 활동 삭제 중...`);

        // 첨부 파일 삭제
        for (const activity of recoveryData) {
          if (activity.file_url) {
            try {
              const filePathMatch = activity.file_url.match(/case-files\/(.+)/);
              if (filePathMatch && filePathMatch[1]) {
                const filePath = filePathMatch[1];
                await supabase.storage.from("case-files").remove([filePath]);
                console.log(`파일 삭제 완료: ${filePath}`);
              }
            } catch (fileError) {
              console.error(`파일 삭제 오류: ${activity.file_url}`, fileError);
            }
          }
        }

        // 회수 활동 삭제
        const { error: recoveryDeleteError } = await supabase
          .from("test_recovery_activities")
          .delete()
          .in(
            "id",
            recoveryData.map((r) => r.id)
          );

        if (recoveryDeleteError) {
          console.error("회수 활동 삭제 오류:", recoveryDeleteError);
        } else {
          console.log("회수 활동 삭제 완료");
        }
      }

      // 4. 알림 삭제
      const { error: caseNotificationDeleteError } = await supabase
        .from("test_case_notifications")
        .delete()
        .eq("case_id", caseId);

      if (caseNotificationDeleteError) {
        console.error("사건 알림 삭제 오류:", caseNotificationDeleteError);
      } else {
        console.log("사건 알림 삭제 완료");
      }

      const { error: individualNotificationDeleteError } = await supabase
        .from("test_individual_notifications")
        .delete()
        .eq("case_id", caseId);

      if (individualNotificationDeleteError) {
        console.error("개인 알림 삭제 오류:", individualNotificationDeleteError);
      } else {
        console.log("개인 알림 삭제 완료");
      }

      // 5. 기일 삭제
      const { error: scheduleDeleteError } = await supabase
        .from("test_schedules")
        .delete()
        .eq("lawsuit_id", caseId);

      if (scheduleDeleteError) {
        console.error("기일 삭제 오류:", scheduleDeleteError);
      } else {
        console.log("기일 데이터 삭제 완료");
      }

      // 6. 사건 관련 기타 데이터 삭제
      const { error: handlerDeleteError } = await supabase
        .from("test_case_handlers")
        .delete()
        .eq("case_id", caseId);

      if (handlerDeleteError) {
        console.error("사건 담당자 삭제 오류:", handlerDeleteError);
      } else {
        console.log("사건 담당자 삭제 완료");
      }

      const { error: clientDeleteError } = await supabase
        .from("test_case_clients")
        .delete()
        .eq("case_id", caseId);

      if (clientDeleteError) {
        console.error("의뢰인 삭제 오류:", clientDeleteError);
      } else {
        console.log("의뢰인 삭제 완료");
      }

      const { error: partyDeleteError } = await supabase
        .from("test_case_parties")
        .delete()
        .eq("case_id", caseId);

      if (partyDeleteError) {
        console.error("당사자 삭제 오류:", partyDeleteError);
      } else {
        console.log("당사자 삭제 완료");
      }

      const { error: interestDeleteError } = await supabase
        .from("test_case_interests")
        .delete()
        .eq("case_id", caseId);

      if (interestDeleteError) {
        console.error("이자 정보 삭제 오류:", interestDeleteError);
      } else {
        console.log("이자 정보 삭제 완료");
      }

      const { error: expenseDeleteError } = await supabase
        .from("test_case_expenses")
        .delete()
        .eq("case_id", caseId);

      if (expenseDeleteError) {
        console.error("비용 정보 삭제 오류:", expenseDeleteError);
      } else {
        console.log("비용 정보 삭제 완료");
      }

      // 7. 마지막으로 사건 자체 삭제
      const { error: caseDeleteError } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", caseId);

      if (caseDeleteError) {
        console.error("사건 삭제 오류:", caseDeleteError);
        throw caseDeleteError;
      }

      console.log("사건 삭제 완료");
      toast.success("사건이 성공적으로 삭제되었습니다");

      // 사건 목록 페이지로 이동
      router.push("/cases");
    } catch (error) {
      console.error("사건 삭제 중 오류 발생:", error);
      toast.error("사건 삭제 실패", {
        description: error.message || "알 수 없는 오류가 발생했습니다",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      <div className="container p-6 mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 사이드바 */}
          <div className="md:col-span-1">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden transition-all hover:shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 py-4 flex items-center justify-center">
                <CardTitle className="text-lg font-semibold">사건 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {/* 알림 섹션 추가 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">최근 알림</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={fetchNotifications}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {loadingNotifications ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex space-x-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <div className="space-y-1 flex-1">
                              <Skeleton className="h-3 w-3/4" />
                              <Skeleton className="h-2 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">알림이 없습니다</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-2 rounded-md ${"bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30"}`}
                          >
                            <div className="flex items-start">
                              <div className="rounded-full bg-white dark:bg-slate-700 p-1.5 mr-2 flex-shrink-0">
                                {getNotificationIcon(notification.notification_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4
                                  className={`text-xs font-medium truncate ${
                                    notification.is_read
                                      ? "text-gray-800 dark:text-gray-200"
                                      : "text-blue-700 dark:text-blue-300"
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center mt-1 text-xs text-gray-400">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatNotificationTime(notification.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">상태</p>
                  {caseData.status_info?.color ? (
                    <Badge
                      className="font-medium text-white px-3 py-1"
                      style={{ backgroundColor: caseData.status_info.color }}
                    >
                      {caseData.status_info?.name || "미정"}
                    </Badge>
                  ) : (
                    <Badge
                      className={cn(
                        "font-medium text-white px-3 py-1",
                        getStatusColor(caseData.status)
                      )}
                    >
                      {caseData.status === "in_progress"
                        ? "진행중"
                        : caseData.status === "pending"
                        ? "대기중"
                        : caseData.status === "completed"
                        ? "완료"
                        : caseData.status || "미정"}
                    </Badge>
                  )}
                  {user && (user.role === "admin" || user.role === "staff") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-7 px-2"
                      onClick={() => setShowStatusModal(true)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">채권금액</p>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-800 dark:text-gray-200 text-lg">
                      {formatCurrency(
                        Number(caseData.principal_amount || 0) +
                          caseData.interests?.reduce(
                            (sum, interest) => sum + Number(interest.amount || 0),
                            0
                          ) +
                          caseData.expenses?.reduce(
                            (sum, expense) => sum + Number(expense.amount || 0),
                            0
                          )
                      )}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-7 px-2 text-blue-500"
                      onClick={() => setShowDebtDetailModal(true)}
                    >
                      상세보기
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">등록일</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {formatDate(caseData.created_at)}
                  </p>
                </div>

                <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">의뢰인</p>
                    {user && (user.role === "admin" || user.role === "staff") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setShowClientModal(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {clients.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        등록된 의뢰인이 없습니다
                      </p>
                    ) : (
                      clients.slice(0, 3).map((client, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {client.client_type === "individual" ? (
                            <User className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Building2 className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="font-medium truncate">
                            {client.client_type === "individual"
                              ? client.individual_name
                              : client.organization_name}
                          </span>
                        </div>
                      ))
                    )}

                    {clients.length > 3 && (
                      <p className="text-xs text-muted-foreground">외 {clients.length - 3}명</p>
                    )}

                    {clients.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowClientDetailModal(true)}
                      >
                        의뢰인 상세보기
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">당사자</p>
                    {user && (user.role === "admin" || user.role === "staff") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setShowPartyModal(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {parties.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        등록된 당사자가 없습니다
                      </p>
                    ) : (
                      // 당사자 정렬: 원고/채권자/신청인 유형이 먼저 오도록 정렬
                      [...parties]
                        .sort((a, b) => {
                          // 원고/채권자/신청인 유형 우선순위 부여
                          const isMainPartyA = ["plaintiff", "creditor", "applicant"].includes(
                            a.party_type
                          );
                          const isMainPartyB = ["plaintiff", "creditor", "applicant"].includes(
                            b.party_type
                          );

                          if (isMainPartyA && !isMainPartyB) return -1;
                          if (!isMainPartyA && isMainPartyB) return 1;
                          return 0;
                        })
                        .slice(0, 3)
                        .map((party, index) => (
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
                            <span className="font-medium truncate">
                              {party.entity_type === "corporation"
                                ? party.company_name
                                : party.name}
                            </span>
                          </div>
                        ))
                    )}

                    {parties.length > 3 && (
                      <p className="text-xs text-muted-foreground">외 {parties.length - 3}명</p>
                    )}

                    {parties.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowPartyDetailModal(true)}
                      >
                        당사자 상세보기
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />

                <div className="mt-4">
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        disabled={isDeleting || (user?.role !== "admin" && user?.role !== "staff")}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? "삭제 중..." : "사건 삭제하기"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>사건 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          이 사건을 삭제하시겠습니까? 관련된 모든 데이터(소송, 회수 활동, 알림 등)가
                          함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteCase}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              삭제 중...
                            </>
                          ) : (
                            "삭제하기"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="md:col-span-3">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full border-b rounded-none justify-start bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 h-auto p-0 gap-x-1">
                    <TabsTrigger
                      value="dashboard"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none px-5 py-3 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 transition-all"
                    >
                      <BarChart2 className="h-4 w-4 mr-2" />
                      대시보드
                    </TabsTrigger>
                    <TabsTrigger
                      value="lawsuits"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none px-5 py-3 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 transition-all"
                    >
                      <Scale className="h-4 w-4 mr-2" />
                      소송
                    </TabsTrigger>
                    <TabsTrigger
                      value="recovery"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none px-5 py-3 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 transition-all"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      회수활동
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-5">
                    <TabsContent value="dashboard" className="mt-0">
                      <CaseDashboard
                        caseId={caseId}
                        caseData={caseData}
                        parties={parties}
                        clients={clients}
                      />
                    </TabsContent>

                    <TabsContent value="lawsuits" className="mt-0">
                      <LawsuitManager caseId={caseId} parties={parties} viewMode={true} />
                    </TabsContent>

                    <TabsContent value="recovery" className="mt-0">
                      <RecoveryActivities caseId={caseId} parties={parties} />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 모달 컴포넌트 사용 */}
        <ClientDetailModal
          open={showClientDetailModal}
          onOpenChange={setShowClientDetailModal}
          clients={clients}
          onRemoveClient={handleRemoveClient}
          user={user}
        />

        <PartyDetailModal
          open={showPartyDetailModal}
          onOpenChange={setShowPartyDetailModal}
          parties={parties}
          onEditParty={openEditPartyModal}
          onRemoveParty={handleRemoveParty}
          user={user}
          getPartyTypeColor={getPartyTypeColor}
        />

        <ClientManageModal
          open={showClientModal}
          onOpenChange={setShowClientModal}
          userSearchTerm={userSearchTerm}
          setUserSearchTerm={setUserSearchTerm}
          userSearchLoading={userSearchLoading}
          userSearchResults={userSearchResults}
          orgSearchTerm={orgSearchTerm}
          setOrgSearchTerm={setOrgSearchTerm}
          orgSearchLoading={orgSearchLoading}
          orgSearchResults={orgSearchResults}
          handleUserSearch={handleUserSearch}
          handleOrgSearch={handleOrgSearch}
          handleAddUserClient={handleAddUserClient}
          handleAddOrgClient={handleAddOrgClient}
          handleUserSearchKeyDown={handleUserSearchKeyDown}
          handleOrgSearchKeyDown={handleOrgSearchKeyDown}
        />

        <StatusChangeModal
          open={showStatusModal}
          onOpenChange={setShowStatusModal}
          defaultStatus={caseData.status}
          selectedStatus={selectedStatus}
          handleStatusChange={handleStatusChange}
          handleUpdateStatus={handleUpdateStatus}
        />

        <PartyManageModal
          open={showPartyModal}
          onOpenChange={handlePartyModalOpenChange}
          partyType={partyType}
          setPartyType={setPartyType}
          entityType={entityType}
          setEntityType={setEntityType}
          name={name}
          setName={setName}
          companyName={companyName}
          setCompanyName={setCompanyName}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          address={address}
          setAddress={setAddress}
          residentNumber={residentNumber}
          setResidentNumber={setResidentNumber}
          corporateNumber={corporateNumber}
          setCorporateNumber={setCorporateNumber}
          position={position}
          setPosition={setPosition}
          handleAddParty={handleAddParty}
          handleEditParty={handleEditParty}
          editMode={editMode}
          editPartyId={editPartyId}
          clients={clients}
        />

        {/* 채권금액 상세보기 모달 */}
        <DebtDetailModal
          open={showDebtDetailModal}
          onOpenChange={setShowDebtDetailModal}
          caseData={caseData}
          user={user}
          onUpdateDebtInfo={handleUpdateDebtInfo}
        />

        <AddLawsuitModal
          open={openLawsuitModal}
          onOpenChange={setOpenLawsuitModal}
          parties={parties}
          onSuccess={onLawsuitCreated}
          caseId={caseId}
          caseDetails={caseData}
          clients={clients}
        />

        <ScheduleFormModal
          open={openScheduleModal}
          onOpenChange={setOpenScheduleModal}
          lawsuit={editingLawsuit}
          onSuccess={onScheduleAdded}
          editingSchedule={editingSchedule}
          caseDetails={caseData}
          clients={clients}
        />

        <RecoveryActivityModal
          open={openRecoveryModal}
          onOpenChange={setOpenRecoveryModal}
          onSuccess={onRecoveryAdded}
          caseId={caseId}
          user={user}
          parties={parties}
          activity={editingRecovery}
          isEditing={!!editingRecovery}
          caseDetails={caseData}
          clients={clients}
        />

        <AddSubmissionModal
          open={openSubmissionModal}
          onOpenChange={setOpenSubmissionModal}
          onSuccess={onSubmissionAdded}
          caseId={caseId}
          lawsuitId={editingLawsuit?.id}
          parties={parties}
          lawsuitType={editingLawsuit?.lawsuit_type}
          editingSubmission={editingSubmission}
          caseDetails={caseData}
          clients={clients}
        />
      </div>
    </div>
  );
}
