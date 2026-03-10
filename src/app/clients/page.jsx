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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  User,
  Building2,
  Users,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  useEffect(() => {
    filterClients();
  }, [searchTerm, activeTab, individualClients, organizationClients]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data: caseClients, error: clientsError } = await supabase
        .from("test_case_clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      const individualClientIds = caseClients
        .filter((client) => client.client_type === "individual" && client.individual_id)
        .map((client) => client.individual_id);

      const uniqueIndividualIds = [...new Set(individualClientIds)];

      if (uniqueIndividualIds.length > 0) {
        const { data: individuals, error: individualsError } = await supabase
          .from("users")
          .select("*")
          .in("id", uniqueIndividualIds);

        if (individualsError) throw individualsError;

        const individualWithCaseCounts = await Promise.all(
          individuals.map(async (individual) => {
            const casesCount = caseClients.filter(
              (client) => client.individual_id === individual.id
            ).length;

            const { data: recentActivity } = await supabase
              .from("test_cases")
              .select("created_at, case_info")
              .in(
                "id",
                caseClients
                  .filter((client) => client.individual_id === individual.id)
                  .map((client) => client.case_id)
              )
              .order("created_at", { ascending: false })
              .limit(1);

            return {
              ...individual,
              casesCount,
              clientType: "individual",
              recentActivity:
                recentActivity && recentActivity.length > 0 ? recentActivity[0] : null,
            };
          })
        );

        setIndividualClients(individualWithCaseCounts);
        setFilteredIndividuals(individualWithCaseCounts);
      }

      const organizationClientIds = caseClients
        .filter((client) => client.client_type === "organization" && client.organization_id)
        .map((client) => client.organization_id);

      const uniqueOrganizationIds = [...new Set(organizationClientIds)];

      if (uniqueOrganizationIds.length > 0) {
        const { data: organizations, error: organizationsError } = await supabase
          .from("test_organizations")
          .select("*")
          .in("id", uniqueOrganizationIds);

        if (organizationsError) throw organizationsError;

        const organizationsWithCaseCounts = await Promise.all(
          organizations.map(async (organization) => {
            const casesCount = caseClients.filter(
              (client) => client.organization_id === organization.id
            ).length;

            const { data: recentActivity } = await supabase
              .from("test_cases")
              .select("created_at, case_info")
              .in(
                "id",
                caseClients
                  .filter((client) => client.organization_id === organization.id)
                  .map((client) => client.case_id)
              )
              .order("created_at", { ascending: false })
              .limit(1);

            return {
              ...organization,
              casesCount,
              clientType: "organization",
              recentActivity:
                recentActivity && recentActivity.length > 0 ? recentActivity[0] : null,
            };
          })
        );

        setOrganizationClients(organizationsWithCaseCounts);
        setFilteredOrganizations(organizationsWithCaseCounts);
      }
    } catch (error) {
      console.error("의뢰인 정보 가져오기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    const term = searchTerm.toLowerCase().trim();

    const filteredIndividuals = individualClients.filter((client) => {
      return (
        (client.name && client.name.toLowerCase().includes(term)) ||
        (client.email && client.email.toLowerCase().includes(term)) ||
        (client.phone && client.phone.toLowerCase().includes(term))
      );
    });

    const filteredOrganizations = organizationClients.filter((org) => {
      return (
        (org.name && org.name.toLowerCase().includes(term)) ||
        (org.email && org.email.toLowerCase().includes(term)) ||
        (org.representative_name && org.representative_name.toLowerCase().includes(term)) ||
        (org.business_number && org.business_number.toLowerCase().includes(term))
      );
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
      setTotalPages(
        Math.ceil((filteredIndividuals.length + filteredOrganizations.length) / ITEMS_PER_PAGE) || 1
      );
    }

    const totalItems =
      activeTab === "individuals"
        ? filteredIndividuals.length
        : activeTab === "organizations"
        ? filteredOrganizations.length
        : filteredIndividuals.length + filteredOrganizations.length;

    const maxPage = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(1);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const navigateToClientDetail = (client) => {
    if (!client || !client.id) {
      console.error("의뢰인 정보가 유효하지 않습니다.");
      return;
    }

    router.push(`/clients/${client.id}?client_type=${client.clientType}`);
  };

  const getCurrentPageData = () => {
    const allClients = [];

    if (activeTab === "individuals" || activeTab === "all") {
      allClients.push(...filteredIndividuals);
    }

    if (activeTab === "organizations" || activeTab === "all") {
      allClients.push(...filteredOrganizations);
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    return allClients.slice(startIndex, endIndex);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const showFirstPageJump = startPage > 1;
    const showLastPageJump = endPage < totalPages;

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <Pagination className="mt-6 flex justify-center">
        <PaginationContent className="flex flex-wrap">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            />
          </PaginationItem>

          {showFirstPageJump && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationLink className="cursor-default">...</PaginationLink>
                </PaginationItem>
              )}
            </>
          )}

          {pages}

          {showLastPageJump && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink className="cursor-default">...</PaginationLink>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderClientCard = (client) => {
    const isIndividual = client.clientType === "individual";
    const lastActivityDate = client.recentActivity
      ? new Date(client.recentActivity.created_at)
      : null;

    return (
      <Card
        key={client.id}
        className="mb-4 hover:bg-gray-50 dark:hover:bg-gray-900/10 cursor-pointer transition-colors overflow-hidden"
        onClick={() => navigateToClientDetail(client)}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              {isIndividual ? (
                <AvatarImage src={client.profile_image} alt={client.name} />
              ) : (
                <AvatarImage
                  src={`https://avatar.vercel.sh/${client.name?.replace(/\s+/g, "")}.png`}
                  alt={client.name}
                />
              )}
              <AvatarFallback className={isIndividual ? "bg-blue-100" : "bg-amber-100"}>
                {isIndividual ? (
                  <User className="h-6 w-6 text-blue-700" />
                ) : (
                  <Building2 className="h-6 w-6 text-amber-700" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-lg flex items-center gap-2">
                    {client.name || (isIndividual ? "이름 없음" : "기업명 없음")}
                    <Badge variant={isIndividual ? "outline" : "secondary"} className="ml-2">
                      {isIndividual ? "개인" : "기업"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {!isIndividual && client.representative_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <span>대표: {client.representative_name}</span>
                      </div>
                    )}
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
                        <span className="font-medium">
                          {format(lastActivityDate, "yyyy.MM.dd", { locale: ko })}
                        </span>
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array(4)
            .fill(0)
            .map((_, index) => (
              <Card key={index} className="mb-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-16" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      );
    }

    const currentPageData = getCurrentPageData();

    if (currentPageData.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="font-medium text-xl mb-2">의뢰인이 없습니다</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {searchTerm ? `'${searchTerm}' 검색 결과가 없습니다.` : "등록된 의뢰인이 없습니다."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/cases")}>
            사건 목록으로 이동
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-4">{currentPageData.map((client) => renderClientCard(client))}</div>
        {renderPagination()}
      </>
    );
  };

  return (
    <div className="mx-auto py-8 max-w-5xl px-4 md:px-6 w-full">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">의뢰인 관리</h1>
        <p className="text-muted-foreground">
          전체 의뢰인 목록을 확인하고 정보를 관리하거나 사건 내역을 확인할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="이름, 이메일, 전화번호로 검색..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">전체</span>
              </TabsTrigger>
              <TabsTrigger value="individuals" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">개인</span>
              </TabsTrigger>
              <TabsTrigger value="organizations" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">기업</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            <span>의뢰인 추가</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {!loading && (
              <>
                총 {filteredIndividuals.length + filteredOrganizations.length}명의 의뢰인
                {activeTab === "all" && (
                  <span className="ml-1">
                    (개인: {filteredIndividuals.length}, 기업: {filteredOrganizations.length})
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
