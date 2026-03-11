"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { user } = useUser();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [resolvedCaseId, setResolvedCaseId] = useState(null);
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

  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value || ""
    );

  const normalizeTab = (tabValue) => {
    if (tabValue === "lawsuit" || tabValue === "lawsuits") return "lawsuits";
    if (tabValue === "recovery") return "recovery";
    return "dashboard";
  };

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  const resolveCaseId = async (rawId) => {
    if (!rawId || !isUuid(rawId)) {
      return null;
    }
    const { data: directCase, error: directCaseError } = await supabase
      .from("test_cases")
      .select("id")
      .eq("id", rawId)
      .maybeSingle();
    if (!directCaseError && directCase?.id) {
      return directCase.id;
    }
    const { data: lawsuitRow, error: lawsuitError } = await supabase
      .from("test_case_lawsuits")
      .select("id, case_id")
      .eq("id", rawId)
      .maybeSingle();
    if (!lawsuitError && lawsuitRow?.case_id) {
      return lawsuitRow.case_id;
    }
    return null;
  };

  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      if (caseId === "clients") {
        router.replace("/clients");
        return;
      }

      const effectiveCaseId = await resolveCaseId(caseId);
      if (!effectiveCaseId) {
        setResolvedCaseId(null);
        setCaseData(null);
        return;
      }

      setResolvedCaseId(effectiveCaseId);

      if (effectiveCaseId !== caseId) {
        const nextTab = normalizeTab(searchParams.get("tab"));
        router.replace(
          nextTab !== "dashboard"
            ? `/cases/${effectiveCaseId}?tab=${nextTab}`
            : `/cases/${effectiveCaseId}`
        );
      }
      const { data, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", effectiveCaseId)
        .single();
      if (error) throw error;
      if (!data) {
        setCaseData(null);
        return;
      }
      if (data.status_id) {
        const statusInfo = getStatusById(data.status_id);
        data.status_info = {
          name: statusInfo.name,
          color: statusInfo.color,
        };
      }
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("*")
        .eq("case_id", effectiveCaseId);
      if (partiesError) throw partiesError;
      
      const { data: clientsData, error: clientsError } = await supabase
        .from("test_case_clients")
        .select(`
          *,
          individual:users!fk_case_clients_individual(id, name, email, phone_number, resident_number, address),
          organization:test_organizations!fk_case_clients_org(id, name, representative_name, representative_position, business_number, phone, email, address)
        `)
        .eq("case_id", effectiveCaseId);
      if (clientsError) throw clientsError;
      
      const { data: interestsData, error: interestsError } = await supabase
        .from("test_case_interests")
        .select("*")
        .eq("case_id", effectiveCaseId);
      if (interestsError) throw interestsError;
      const { data: expensesData, error: expensesError } = await supabase
        .from("test_case_expenses")
        .select("*")
        .eq("case_id", effectiveCaseId);
      if (expensesError) throw expensesError;

      const processedClients = (clientsData || []).map((client) => {
        return {
          ...client,
          client_type: client.client_type || (client.individual_id ? "individual" : "organization"),
          individual_name: client.individual?.name || "",
          organization_name: client.organization?.name || "",
          representative_name: client.organization?.representative_name || "",
          representative_position: client.organization?.representative_position || "",
          business_number: client.organization?.business_number || "",
          phone: client.individual?.phone_number || client.organization?.phone || "",
          email: client.individual?.email || client.organization?.email || "",
          address: client.individual?.address || client.organization?.address || "",
          resident_number: client.individual?.resident_number || "",
        };
      });

      const processedInterests = (interestsData || []).map((interest) => {
        let amount = 0;
        if (interest.start_date && interest.end_date && interest.rate && data.principal_amount) {
          const days = differenceInDays(new Date(interest.end_date), new Date(interest.start_date));
          if (days > 0) {
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
      toast.error("케이스 정보 가져오기 실패", {
        description: error.message || "알 수 없는 오류가 발생했습니다",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const effectiveCaseId = await resolveCaseId(caseId);
      if (!effectiveCaseId) {
        setNotifications([]);
        return;
      }
      const { data, error } = await supabase
        .from("test_individual_notifications")
        .select("*")
        .eq("case_id", effectiveCaseId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("알림 정보 조회 실패:", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const effectiveCaseId = await resolveCaseId(caseId);
      if (!effectiveCaseId) {
        setNotificationCount(0);
        return;
      }
      const { count, error } = await supabase
        .from("test_individual_notifications")
        .select("*", { count: "exact", head: true })
        .eq("case_id", effectiveCaseId);
      if (error) throw error;
      setNotificationCount(count || 0);
    } catch (error) {
      console.error("알림 개수 조회 실패:", error);
      setNotificationCount(0);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "lawsuit_update": return <Gavel className="w-4 h-4 text-purple-500" />;
      case "recovery_activity": return <CreditCard className="w-4 h-4 text-green-500" />;
      case "deadline": return <CalendarIcon className="w-4 h-4 text-red-500" />;
      case "document": return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay > 0) return `${diffDay}일 전`;
    if (diffHour > 0) return `${diffHour}시간 전`;
    if (diffMin > 0) return `${diffMin}분 전`;
    return "방금 전";
  };

  useEffect(() => {
    if (caseId && user) {
      fetchCaseDetails();
      fetchNotifications();
      fetchNotificationCount();
    }
  }, [caseId, user, searchParams]);

  if (loading) {
    return (
      <div className="container p-4 mx-auto">
        <div className="space-y-2 mb-6">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 돌아가기
          </Button>
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1"><Skeleton className="h-[400px] w-full" /></div>
          <div className="md:col-span-3"><Skeleton className="h-[600px] w-full" /></div>
        </div>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="container p-4 mx-auto">
        <div className="space-y-2 mb-6">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 돌아가기
          </Button>
          <h2 className="text-xl font-bold">사건 정보를 찾을 수 없습니다</h2>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const statusMap = {
      pending: "bg-amber-500 hover:bg-amber-600",
      in_progress: "bg-violet-500 hover:bg-violet-600",
      completed: "bg-green-500 hover:bg-green-600",
    };
    return statusMap[status] || "bg-slate-500 hover:bg-slate-600";
  };

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

  const handleRemoveClient = async (clientId) => {
    if (!confirm("이 의뢰인을 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("test_case_clients").delete().eq("id", clientId);
      if (error) throw error;
      setClients(clients.filter((client) => client.id !== clientId));
      toast.success("의뢰인이 삭제되었습니다");
    } catch (error) {
      console.error("의뢰인 삭제 실패:", error);
      toast.error("의뢰인 삭제 실패", { description: error.message });
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
        .from("users") 
        .select("*")
        .or(`name.ilike.%${userSearchTerm}%,email.ilike.%${userSearchTerm}%`)
        .limit(10);
      if (error) throw error;
      setUserSearchResults(data || []);
      if (data && data.length === 0) toast.info("검색 결과가 없습니다");
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
      if (error) throw error;
      setOrgSearchResults(data || []);
      if (data && data.length === 0) toast.info("검색 결과가 없습니다");
    } catch (error) {
      console.error("조직 검색 실패:", error);
      toast.error("조직 검색에 실패했습니다");
    } finally {
      setOrgSearchLoading(false);
    }
  };

  const handleAddUserClient = async (userId) => {
    try {
      const isAlreadyClient = clients.some(
        (client) => client.client_type === "individual" && client.individual_id === userId
      );
      if (isAlreadyClient) {
        toast.info("이미 등록된 의뢰인입니다");
        return;
      }
      const newClient = {
        case_id: caseId,
        individual_id: userId,
        organization_id: null,
        client_type: "individual",
        position: "",
      };
      
      const { error } = await supabase.from("test_case_clients").insert(newClient);
      if (error) throw error;
      
      await fetchCaseDetails(); 
      toast.success("의뢰인이 추가되었습니다");
      setShowClientModal(false);
    } catch (error) {
      console.error("의뢰인 추가 실패:", error);
      toast.error("의뢰인 추가 실패", { description: error.message });
    }
  };

  const handleAddOrgClient = async (orgId) => {
    try {
      const isAlreadyClient = clients.some(
        (client) => client.client_type === "organization" && client.organization_id === orgId
      );
      if (isAlreadyClient) {
        toast.info("이미 등록된 의뢰인입니다");
        return;
      }
      const newClient = {
        case_id: caseId,
        individual_id: null,
        organization_id: orgId,
        client_type: "organization",
        position: "",
      };
      
      const { error } = await supabase.from("test_case_clients").insert(newClient);
      if (error) throw error;
      
      await fetchCaseDetails(); 
      toast.success("의뢰인이 추가되었습니다");
      setShowClientModal(false);
    } catch (error) {
      console.error("의뢰인 추가 실패:", error);
      toast.error("의뢰인 추가 실패", { description: error.message });
    }
  };

  const handleEditParty = async (partyId, partyData) => {
    try {
      setLoading(true);
      const {
        partyType, entityType, name, companyName, phone, email, address, residentNumber, corporateNumber, position,
      } = partyData;
      if (!partyType) { toast.error("당사자 유형을 선택해주세요."); setLoading(false); return; }
      if (!entityType) { toast.error("개인/법인 구분을 선택해주세요."); setLoading(false); return; }
      if (entityType === "individual" && !name) { toast.error("이름을 입력해주세요."); setLoading(false); return; }
      if (entityType === "corporation" && !companyName) { toast.error("법인/단체명을 입력해주세요."); setLoading(false); return; }
      
      const { error } = await supabase
        .from("test_case_parties")
        .update({
          party_type: partyType, entityType, name, company_name: companyName, phone, email, address,
          resident_number: residentNumber, corporate_number: corporateNumber, position, updated_at: new Date().toISOString(),
        })
        .eq("id", partyId);
      if (error) throw error;
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

  const openEditPartyModal = (party) => {
    setEditMode(true); setEditPartyId(party.id); setPartyType(party.party_type); setEntityType(party.entity_type || "individual");
    setName(party.name || ""); setCompanyName(party.company_name || ""); setPhone(party.phone || ""); setEmail(party.email || "");
    setAddress(party.address || ""); setResidentNumber(party.resident_number || ""); setCorporateNumber(party.corporate_number || ""); setPosition(party.position || "");
    setShowPartyModal(true);
  };

  const handleRemoveParty = async (partyId) => {
    if (!confirm("이 당사자를 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("test_case_parties").delete().eq("id", partyId);
      if (error) throw error;
      setParties(parties.filter((party) => party.id !== partyId));
      toast.success("당사자가 삭제되었습니다");
    } catch (error) {
      console.error("당사자 삭제 실패:", error);
      toast.error("당사자 삭제 실패", { description: error.message });
    }
  };

  const handleStatusChange = (value) => setSelectedStatus(value);

  const handleUpdateStatus = async () => {
    if (!selectedStatus) { toast.error("상태를 선택해주세요"); return; }
    try {
      const { error } = await supabase.from("test_cases").update({ status: selectedStatus }).eq("id", caseId);
      if (error) throw error;
      setCaseData({ ...caseData, status: selectedStatus });
      toast.success("상태가 변경되었습니다");
      setShowStatusModal(false);
    } catch (error) {
      console.error("상태 변경 실패:", error);
      toast.error("상태 변경 실패", { description: error.message });
    }
  };

  const handleAddParty = async (partyData) => {
    try {
      setLoading(true);
      const {
        partyType, entityType, name, companyName, phone, email, address, residentNumber, corporateNumber, position,
      } = partyData;
      if (!partyType) { toast.error("당사자 유형을 선택해주세요."); setLoading(false); return; }
      if (!entityType) { toast.error("개인/법인 구분을 선택해주세요."); setLoading(false); return; }
      if (entityType === "individual" && !name) { toast.error("이름을 입력해주세요."); setLoading(false); return; }
      if (entityType === "corporation" && !companyName) { toast.error("법인/단체명을 입력해주세요."); setLoading(false); return; }
      
      const { error } = await supabase
        .from("test_case_parties")
        .insert([{
            case_id: caseId, party_type: partyType, entity_type: entityType, name, company_name: companyName, phone, email, address,
            resident_number: residentNumber, corporate_number: corporateNumber, position, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }]);
      if (error) throw error;
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

  const resetPartyForm = () => {
    setPartyType("plaintiff"); setEntityType("individual"); setName(""); setCompanyName(""); setPhone(""); setEmail(""); setAddress("");
    setResidentNumber(""); setCorporateNumber(""); setPosition("");
  };

  const handlePartyModalOpenChange = (open) => {
    if (!open) resetPartyForm();
    setShowPartyModal(open);
  };

  const handleUpdateDebtInfo = async (debtInfo) => {
    try {
      setLoading(true);
      const { error: caseError } = await supabase.from("test_cases").update({ principal_amount: debtInfo.principal_amount }).eq("id", caseId);
      if (caseError) throw caseError;
      
      await supabase.from("test_case_interests").delete().eq("case_id", caseId);
      if (debtInfo.interests && debtInfo.interests.length > 0) {
        const interestsToInsert = debtInfo.interests.map((interest) => ({
          case_id: caseId, start_date: interest.start_date, end_date: interest.end_date, rate: interest.rate,
        }));
        await supabase.from("test_case_interests").insert(interestsToInsert);
      }
      
      await supabase.from("test_case_expenses").delete().eq("case_id", caseId);
      if (debtInfo.expenses && debtInfo.expenses.length > 0) {
        const expensesToInsert = debtInfo.expenses.map((expense) => ({
          case_id: caseId, expense_type: expense.expense_type === "기타" && expense.custom_type ? expense.custom_type : expense.expense_type, amount: expense.amount,
        }));
        await supabase.from("test_case_expenses").insert(expensesToInsert);
      }
      
      await fetchCaseDetails();
      toast.success("채권 정보가 업데이트되었습니다");
    } catch (error) {
      console.error("채권 정보 업데이트 실패:", error);
      toast.error("채권 정보 업데이트에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUserSearch();
    }
  };

  const handleOrgSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleOrgSearch();
    }
  };

  const onLawsuitCreated = async () => {
    toast.success("소송 정보가 저장되었습니다");
    await fetchCaseDetails();
  };

  const onScheduleAdded = async () => {
    toast.success("일정 정보가 저장되었습니다");
    await fetchCaseDetails();
    setEditingLawsuit(null);
    setEditingSchedule(null);
  };

  const onRecoveryAdded = async () => {
    toast.success("회수 활동 정보가 저장되었습니다");
    await fetchCaseDetails();
    setEditingRecovery(null);
  };

  const onSubmissionAdded = async () => {
    toast.success("제출 서류 정보가 저장되었습니다");
    await fetchCaseDetails();
    setEditingLawsuit(null);
    setEditingSubmission(null);
  };

  const handleDeleteCase = async () => {
    if (!caseId) return;
    try {
      setIsDeleting(true);
      const { data: submissionData } = await supabase.from("test_lawsuit_submissions").select("id, file_url").eq("lawsuit_id", caseId);
      if (submissionData && submissionData.length > 0) {
        for (const submission of submissionData) {
          if (submission.file_url) {
            try {
              const filePathMatch = submission.file_url.match(/case-files\/(.+)/);
              if (filePathMatch && filePathMatch[1]) await supabase.storage.from("case-files").remove([filePathMatch[1]]);
            } catch (fileError) {}
          }
        }
        await supabase.from("test_lawsuit_submissions").delete().in("id", submissionData.map((s) => s.id));
      }
      await supabase.from("test_lawsuit_parties").delete().eq("lawsuit_id", caseId);
      await supabase.from("test_case_lawsuits").delete().eq("case_id", caseId);
      
      const { data: recoveryData } = await supabase.from("test_recovery_activities").select("id, file_url").eq("case_id", caseId);
      if (recoveryData && recoveryData.length > 0) {
        for (const activity of recoveryData) {
          if (activity.file_url) {
            try {
              const filePathMatch = activity.file_url.match(/case-files\/(.+)/);
              if (filePathMatch && filePathMatch[1]) await supabase.storage.from("case-files").remove([filePathMatch[1]]);
            } catch (fileError) {}
          }
        }
        await supabase.from("test_recovery_activities").delete().in("id", recoveryData.map((r) => r.id));
      }
      
      await supabase.from("test_case_notifications").delete().eq("case_id", caseId);
      await supabase.from("test_individual_notifications").delete().eq("case_id", caseId);
      await supabase.from("test_schedules").delete().eq("lawsuit_id", caseId);
      await supabase.from("test_case_handlers").delete().eq("case_id", caseId);
      await supabase.from("test_case_clients").delete().eq("case_id", caseId);
      await supabase.from("test_case_parties").delete().eq("case_id", caseId);
      await supabase.from("test_case_interests").delete().eq("case_id", caseId);
      await supabase.from("test_case_expenses").delete().eq("case_id", caseId);
      
      const { error: caseDeleteError } = await supabase.from("test_cases").delete().eq("id", caseId);
      if (caseDeleteError) throw caseDeleteError;
      
      toast.success("사건이 성공적으로 삭제되었습니다");
      router.push("/cases");
    } catch (error) {
      console.error("사건 삭제 중 오류 발생:", error);
      toast.error("사건 삭제 실패", { description: error.message });
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
            <ArrowLeft className="mr-2 h-4 w-4" /> 돌아가기
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden transition-all hover:shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 py-4 flex items-center justify-center">
                <CardTitle className="text-lg font-semibold">사건 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">최근 알림</p>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={fetchNotifications}><RefreshCw className="h-3.5 w-3.5" /></Button>
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
                          <div key={notification.id} className={`p-2 rounded-md ${"bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30"}`}>
                            <div className="flex items-start">
                              <div className="rounded-full bg-white dark:bg-slate-700 p-1.5 mr-2 flex-shrink-0">
                                {getNotificationIcon(notification.notification_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-xs font-medium truncate ${notification.is_read ? "text-gray-800 dark:text-gray-200" : "text-blue-700 dark:text-blue-300"}`}>
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{notification.message}</p>
                                <div className="flex items-center mt-1 text-xs text-gray-400"><Clock className="w-3 h-3 mr-1" />{formatNotificationTime(notification.created_at)}</div>
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
                    <Badge className="font-medium text-white px-3 py-1" style={{ backgroundColor: caseData.status_info.color }}>{caseData.status_info?.name || "미정"}</Badge>
                  ) : (
                    <Badge className={cn("font-medium text-white px-3 py-1", getStatusColor(caseData.status))}>
                      {caseData.status === "in_progress" ? "진행중" : caseData.status === "pending" ? "대기중" : caseData.status === "completed" ? "완료" : caseData.status || "미정"}
                    </Badge>
                  )}
                  {user && (user.role === "admin" || user.role === "staff") && (
                    <Button variant="ghost" size="sm" className="ml-2 h-7 px-2" onClick={() => setShowStatusModal(true)}><Edit className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">채권금액</p>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-800 dark:text-gray-200 text-lg">
                      {formatCurrency(Number(caseData.principal_amount || 0) + caseData.interests?.reduce((sum, interest) => sum + Number(interest.amount || 0), 0) + caseData.expenses?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))}
                    </p>
                    <Button variant="ghost" size="sm" className="ml-2 h-7 px-2 text-blue-500" onClick={() => setShowDebtDetailModal(true)}>상세보기</Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">등록일</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(caseData.created_at)}</p>
                </div>
                <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">의뢰인</p>
                    {user && (user.role === "admin" || user.role === "staff") && (
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowClientModal(true)}><Plus className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {clients.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">등록된 의뢰인이 없습니다</p>
                    ) : (
                      clients.slice(0, 3).map((client, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {client.client_type === "individual" ? <User className="h-4 w-4 text-blue-500" /> : <Building2 className="h-4 w-4 text-amber-500" />}
                          <span className="font-medium truncate">
                            {client.client_type === "individual" ? client.individual_name : client.organization_name}
                          </span>
                        </div>
                      ))
                    )}
                    {clients.length > 3 && <p className="text-xs text-muted-foreground">외 {clients.length - 3}명</p>}
                    {clients.length > 0 && <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowClientDetailModal(true)}>의뢰인 상세보기</Button>}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">당사자</p>
                    {user && (user.role === "admin" || user.role === "staff") && (
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowPartyModal(true)}><Plus className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {parties.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">등록된 당사자가 없습니다</p>
                    ) : (
                      [...parties].sort((a, b) => {
                        const isMainPartyA = ["plaintiff", "creditor", "applicant"].includes(a.party_type);
                        const isMainPartyB = ["plaintiff", "creditor", "applicant"].includes(b.party_type);
                        if (isMainPartyA && !isMainPartyB) return -1;
                        if (!isMainPartyA && isMainPartyB) return 1;
                        return 0;
                      }).slice(0, 3).map((party, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", getPartyTypeColor(party.party_type))}>
                            {party.party_type === "plaintiff" ? "원고" : party.party_type === "defendant" ? "피고" : party.party_type === "creditor" ? "채권자" : party.party_type === "debtor" ? "채무자" : party.party_type === "applicant" ? "신청인" : party.party_type === "respondent" ? "피신청인" : party.party_type}
                          </Badge>
                          <span className="font-medium truncate">{party.entity_type === "corporation" ? party.company_name : party.name}</span>
                        </div>
                      ))
                    )}
                    {parties.length > 3 && <p className="text-xs text-muted-foreground">외 {parties.length - 3}명</p>}
                    {parties.length > 0 && <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowPartyDetailModal(true)}>당사자 상세보기</Button>}
                  </div>
                </div>
                <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />
                <div className="mt-4">
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full" disabled={isDeleting || (user?.role !== "admin" && user?.role !== "staff")}>
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
                        <AlertDialogAction onClick={handleDeleteCase} className="bg-red-600 hover:bg-red-700">
                          {isDeleting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />삭제 중...</> : "삭제하기"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-3">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full border-b rounded-none justify-start bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 h-auto p-0 gap-x-1">
                    <TabsTrigger value="dashboard" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none px-5 py-3 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 transition-all">
                      <BarChart2 className="h-4 w-4 mr-2" /> 대시보드
                    </TabsTrigger>
                    <TabsTrigger value="lawsuits" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none px-5 py-3 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 transition-all">
                      <Scale className="h-4 w-4 mr-2" /> 소송
                    </TabsTrigger>
                    <TabsTrigger value="recovery" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none px-5 py-3 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 transition-all">
                      <Clock className="h-4 w-4 mr-2" /> 회수활동
                    </TabsTrigger>
                  </TabsList>
                  <div className="p-5">
                    <TabsContent value="dashboard" className="mt-0">
                      <CaseDashboard caseId={resolvedCaseId || caseId} caseData={caseData} parties={parties} clients={clients} />
                    </TabsContent>
                    <TabsContent value="lawsuits" className="mt-0">
                      <LawsuitManager caseId={resolvedCaseId || caseId} parties={parties} viewMode={true} />
                    </TabsContent>
                    <TabsContent value="recovery" className="mt-0">
                      <RecoveryActivities caseId={resolvedCaseId || caseId} parties={parties} />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
        <ClientDetailModal open={showClientDetailModal} onOpenChange={setShowClientDetailModal} clients={clients} onRemoveClient={handleRemoveClient} user={user} />
        <PartyDetailModal open={showPartyDetailModal} onOpenChange={setShowPartyDetailModal} parties={parties} onEditParty={openEditPartyModal} onRemoveParty={handleRemoveParty} user={user} getPartyTypeColor={getPartyTypeColor} />
        <ClientManageModal
          open={showClientModal} onOpenChange={setShowClientModal} userSearchTerm={userSearchTerm} setUserSearchTerm={setUserSearchTerm} userSearchLoading={userSearchLoading}
          userSearchResults={userSearchResults} orgSearchTerm={orgSearchTerm} setOrgSearchTerm={setOrgSearchTerm} orgSearchLoading={orgSearchLoading} orgSearchResults={orgSearchResults}
          handleUserSearch={handleUserSearch} handleOrgSearch={handleOrgSearch} handleAddUserClient={handleAddUserClient} handleAddOrgClient={handleAddOrgClient}
          handleUserSearchKeyDown={handleUserSearchKeyDown} handleOrgSearchKeyDown={handleOrgSearchKeyDown}
        />
        <StatusChangeModal open={showStatusModal} onOpenChange={setShowStatusModal} defaultStatus={caseData.status} selectedStatus={selectedStatus} handleStatusChange={handleStatusChange} handleUpdateStatus={handleUpdateStatus} />
        <PartyManageModal
          open={showPartyModal} onOpenChange={handlePartyModalOpenChange} partyType={partyType} setPartyType={setPartyType} entityType={entityType} setEntityType={setEntityType}
          name={name} setName={setName} companyName={companyName} setCompanyName={setCompanyName} phone={phone} setPhone={setPhone} email={email} setEmail={setEmail}
          address={address} setAddress={setAddress} residentNumber={residentNumber} setResidentNumber={setResidentNumber} corporateNumber={corporateNumber} setCorporateNumber={setCorporateNumber}
          position={position} setPosition={setPosition} handleAddParty={handleAddParty} handleEditParty={handleEditParty} editMode={editMode} editPartyId={editPartyId} clients={clients}
        />
        <DebtDetailModal open={showDebtDetailModal} onOpenChange={setShowDebtDetailModal} caseData={caseData} user={user} onUpdateDebtInfo={handleUpdateDebtInfo} />
        <AddLawsuitModal open={openLawsuitModal} onOpenChange={setOpenLawsuitModal} parties={parties} onSuccess={onLawsuitCreated} caseId={caseId} caseDetails={caseData} clients={clients} />
        <ScheduleFormModal open={openScheduleModal} onOpenChange={setOpenScheduleModal} lawsuit={editingLawsuit} onSuccess={onScheduleAdded} editingSchedule={editingSchedule} caseDetails={caseData} clients={clients} />
        <RecoveryActivityModal open={openRecoveryModal} onOpenChange={setOpenRecoveryModal} onSuccess={onRecoveryAdded} caseId={caseId} user={user} parties={parties} activity={editingRecovery} isEditing={!!editingRecovery} caseDetails={caseData} clients={clients} />
        <AddSubmissionModal open={openSubmissionModal} onOpenChange={setOpenSubmissionModal} onSuccess={onSubmissionAdded} caseId={caseId} lawsuitId={editingLawsuit?.id} parties={parties} lawsuitType={editingLawsuit?.lawsuit_type} editingSubmission={editingSubmission} caseDetails={caseData} clients={clients} />
      </div>
    </div>
  );
}