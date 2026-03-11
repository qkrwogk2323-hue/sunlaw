"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox"; // 💡 모름 체크박스용 임포트
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search, User, Building2, Users, ChevronRight, Phone, Mail, Calendar, Briefcase, Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [individualClients, setIndividualClients] = useState([]);
  const [organizationClients, setOrganizationClients] = useState([]);
  const [filteredIndividuals, setFilteredIndividuals] = useState([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // 💡 새 의뢰인 등록 모달 상태 변수들 (주민번호, 주소, 모름 체크 추가)
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientType, setNewClientType] = useState("individual");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  
  const [newClientResidentNum, setNewClientResidentNum] = useState("");
  const [isUnknownResident, setIsUnknownResident] = useState(false);
  
  const [newClientAddress, setNewClientAddress] = useState("");
  const [isUnknownAddress, setIsUnknownAddress] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  useEffect(() => {
    filterClients();
  }, [searchTerm, activeTab, individualClients, organizationClients]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data: caseClients } = await supabase
        .from("test_case_clients")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: individuals } = await supabase.from("users").select("*").eq("role", "client");
      if (individuals) {
        const individualWithCaseCounts = await Promise.all(
          individuals.map(async (ind) => {
            const cases = (caseClients || []).filter((c) => c.individual_id === ind.id);
            let recentActivity = null;
            if (cases.length > 0) {
              const caseIds = cases.map(c => c.case_id);
              const { data } = await supabase.from("test_cases").select("created_at").in("id", caseIds).order("created_at", { ascending: false }).limit(1);
              if (data && data.length > 0) recentActivity = data[0];
            }
            return { ...ind, phone: ind.phone || ind.phone_number || "", casesCount: cases.length, clientType: "individual", recentActivity };
          })
        );
        setIndividualClients(individualWithCaseCounts);
      }

      const { data: orgs } = await supabase.from("test_organizations").select("*");
      if (orgs) {
        const orgsWithCaseCounts = await Promise.all(
          orgs.map(async (org) => {
            const cases = (caseClients || []).filter((c) => c.organization_id === org.id);
            let recentActivity = null;
            if (cases.length > 0) {
              const caseIds = cases.map(c => c.case_id);
              const { data } = await supabase.from("test_cases").select("created_at").in("id", caseIds).order("created_at", { ascending: false }).limit(1);
              if (data && data.length > 0) recentActivity = data[0];
            }
            return { ...org, casesCount: cases.length, clientType: "organization", recentActivity };
          })
        );
        setOrganizationClients(orgsWithCaseCounts);
      }
    } catch (error) {
      console.error("의뢰인 정보 가져오기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 💡 DB 저장 함수 (null 처리 완벽 적용)
  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error(newClientType === "individual" ? "이름을 입력해주세요" : "기업명을 입력해주세요");
      return;
    }
    setIsSubmitting(true);
    try {
      // 모름 체크 시 null, 아니면 입력값 (빈 텍스트면 다시 null)
      const residentValue = isUnknownResident ? null : (newClientResidentNum.trim() || null);
      const addressValue = isUnknownAddress ? null : (newClientAddress.trim() || null);
      const phoneValue = newClientPhone.trim() || null;

      if (newClientType === "individual") {
        const { error } = await supabase.from("users").insert({ 
          name: newClientName, 
          phone_number: phoneValue, 
          resident_number: residentValue, // 개인은 resident_number 컬럼
          address: addressValue,
          role: "client" 
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("test_organizations").insert({ 
          name: newClientName, 
          phone: phoneValue,
          business_number: residentValue, // 법인은 business_number 컬럼
          address: addressValue
        });
        if (error) throw error;
      }
      toast.success("새 의뢰인이 성공적으로 등록되었습니다!");
      
      // 모달 닫고 입력값 초기화
      setShowClientModal(false);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientResidentNum("");
      setIsUnknownResident(false);
      setNewClientAddress("");
      setIsUnknownAddress(false);
      
      fetchClients(); // 새 데이터로 화면 새로고침
    } catch (err) {
      console.error(err);
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterClients = () => {
    const term = searchTerm.toLowerCase().trim();
    const filteredIndividuals = individualClients.filter((client) => {
      return (client.name && client.name.toLowerCase().includes(term)) ||
        (client.email && client.email.toLowerCase().includes(term)) ||
        (client.phone && client.phone.toLowerCase().includes(term));
    });
    const filteredOrganizations = organizationClients.filter((org) => {
      return (org.name && org.name.toLowerCase().includes(term)) ||
        (org.email && org.email.toLowerCase().includes(term)) ||
        (org.representative_name && org.representative_name.toLowerCase().includes(term)) ||
        (org.business_number && org.business_number.toLowerCase().includes(term));
    });

    if (activeTab === "individuals") {
      setFilteredIndividuals(filteredIndividuals);
      setFilteredOrganizations([]);
      setTotalPages(Math.ceil(filteredIndividuals.length / ITEMS_PER_PAGE) || 1);
    } else if (activeTab === "organizations") {
      setFilteredIndividuals([]);
      setFilteredOrganizations(filteredOrganizations);
      setTotalPages(Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE) || 1);
    } else {
      setFilteredIndividuals(filteredIndividuals);
      setFilteredOrganizations(filteredOrganizations);
      setTotalPages(Math.ceil((filteredIndividuals.length + filteredOrganizations.length) / ITEMS_PER_PAGE) || 1);
    }

    const totalItems = activeTab === "individuals" ? filteredIndividuals.length : activeTab === "organizations" ? filteredOrganizations.length : filteredIndividuals.length + filteredOrganizations.length;
    const maxPage = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    if (currentPage > maxPage) setCurrentPage(1);
  };

  const navigateToClientDetail = (client) => {
    if (!client || !client.id) return;
    router.push(`/clients/${client.id}?client_type=${client.clientType}`);
  };

  const getCurrentPageData = () => {
    const allClients = [];
    if (activeTab === "individuals" || activeTab === "all") allClients.push(...filteredIndividuals);
    if (activeTab === "organizations" || activeTab === "all") allClients.push(...filteredOrganizations);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage + 1 < 5) startPage = Math.max(1, endPage - 4);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => setCurrentPage(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return (
      <Pagination className="mt-6 flex justify-center">
        <PaginationContent className="flex flex-wrap">
          <PaginationItem>
            <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} />
          </PaginationItem>
          {pages}
          <PaginationItem>
            <PaginationNext onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderClientCard = (client) => {
    const isIndividual = client.clientType === "individual";
    const lastActivityDate = client.recentActivity ? new Date(client.recentActivity.created_at) : null;
    return (
      <Card key={client.id} className="mb-4 hover:bg-gray-50 dark:hover:bg-gray-900/10 cursor-pointer transition-colors overflow-hidden" onClick={() => navigateToClientDetail(client)}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              {isIndividual ? <AvatarImage src={client.profile_image} alt={client.name} /> : <AvatarImage src={`https://avatar.vercel.sh/${client.name?.replace(/\s+/g, "")}.png`} alt={client.name} />}
              <AvatarFallback className={isIndividual ? "bg-blue-100" : "bg-amber-100"}>
                {isIndividual ? <User className="h-6 w-6 text-blue-700" /> : <Building2 className="h-6 w-6 text-amber-700" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-lg flex items-center gap-2">
                    {client.name || (isIndividual ? "이름 없음" : "기업명 없음")}
                    <Badge variant={isIndividual ? "outline" : "secondary"} className="ml-2">{isIndividual ? "개인" : "기업"}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {client.email && <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /><span>{client.email}</span></div>}
                    {client.phone && <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /><span>{client.phone}</span></div>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-lg">{client.casesCount || 0}건</span>
                    </div>
                    <div className="text-xs text-muted-foreground">담당사건</div>
                  </div>
                  {lastActivityDate && (
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{format(lastActivityDate, "yyyy.MM.dd", { locale: ko })}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">최근 활동</div>
                    </div>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto py-8 max-w-5xl px-4 md:px-6 w-full">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">의뢰인 관리</h1>
        <p className="text-muted-foreground">전체 의뢰인 목록을 확인하고 정보를 관리하거나 사건 내역을 확인할 수 있습니다.</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input type="search" placeholder="이름, 기업명으로 검색..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all"><Users className="h-4 w-4 mr-1" /><span className="hidden sm:inline">전체</span></TabsTrigger>
              <TabsTrigger value="individuals"><User className="h-4 w-4 mr-1" /><span className="hidden sm:inline">개인</span></TabsTrigger>
              <TabsTrigger value="organizations"><Building2 className="h-4 w-4 mr-1" /><span className="hidden sm:inline">기업</span></TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button size="sm" className="flex items-center gap-1" onClick={() => setShowClientModal(true)}>
            <Plus className="h-4 w-4" />
            <span>의뢰인 추가</span>
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {loading ? (
           <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : getCurrentPageData().length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="font-medium text-xl mb-2">의뢰인이 없습니다</h3>
            <p className="text-muted-foreground">{searchTerm ? "검색 결과가 없습니다." : "등록된 의뢰인이 없습니다."}</p>
          </div>
        ) : (
          <>
            {getCurrentPageData().map(renderClientCard)}
            {renderPagination()}
          </>
        )}
      </div>

      {/* 💡 업그레이드된 새 의뢰인 등록 팝업창 (주민번호, 주소, 모름 포함) */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 의뢰인 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={newClientType} onValueChange={setNewClientType}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">개인</TabsTrigger>
                <TabsTrigger value="organization">기업 (법인/단체)</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* 1. 이름 / 기업명 */}
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-red-500">{newClientType === "individual" ? "이름 *" : "기업명 *"}</label>
              <Input
                placeholder={newClientType === "individual" ? "홍길동" : "주식회사 태양"}
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
            </div>

            {/* 2. 연락처 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">연락처 (선택)</label>
              <Input
                placeholder="010-0000-0000"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
              />
            </div>

            {/* 3. 주민등록번호 / 사업자번호 + 모름 체크 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {newClientType === "individual" ? "주민등록번호" : "사업자등록번호"}
                </label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unknown-resident" 
                    checked={isUnknownResident} 
                    onCheckedChange={setIsUnknownResident} 
                  />
                  <label htmlFor="unknown-resident" className="text-xs text-muted-foreground cursor-pointer font-medium">
                    모름
                  </label>
                </div>
              </div>
              <Input
                placeholder={newClientType === "individual" ? "000000-0000000" : "000-00-00000"}
                value={newClientResidentNum}
                onChange={(e) => setNewClientResidentNum(e.target.value)}
                disabled={isUnknownResident}
                className={isUnknownResident ? "bg-gray-100 dark:bg-gray-800 text-gray-400" : ""}
              />
            </div>

            {/* 4. 주소 + 모름 체크 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">주소</label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unknown-address" 
                    checked={isUnknownAddress} 
                    onCheckedChange={setIsUnknownAddress} 
                  />
                  <label htmlFor="unknown-address" className="text-xs text-muted-foreground cursor-pointer font-medium">
                    모름
                  </label>
                </div>
              </div>
              <Input
                placeholder="주소를 입력하세요"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                disabled={isUnknownAddress}
                className={isUnknownAddress ? "bg-gray-100 dark:bg-gray-800 text-gray-400" : ""}
              />
            </div>

            <Button className="w-full mt-4" onClick={handleCreateClient} disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "등록 완료"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}