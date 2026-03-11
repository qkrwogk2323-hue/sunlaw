"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency as formatUtil } from "@/utils/format";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEFAULT_PAGE_SIZE = 10;
const PARTY_ROLE_GROUPS = {
  creditor: ["creditor", "plaintiff", "applicant"],
  debtor: ["debtor", "defendant", "respondent"],
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || ""
  );

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatPartyName = (party) => {
  if (!party) return "미등록";
  if (["corporation", "organization", "company"].includes(party.entity_type)) {
    return party.company_name || party.name || "미등록";
  }
  return party.name || party.company_name || "미등록";
};

const getCaseStatusBadge = (status) => {
  if (!status) {
    return (
      <Badge className="border bg-gray-100 text-gray-700 border-gray-200 text-xs whitespace-nowrap min-w-[65px] flex justify-center py-1">
        <AlertCircle className="mr-1 h-3 w-3" />알 수 없음
      </Badge>
    );
  }
  let IconComponent = AlertCircle;
  let className = "bg-gray-100 text-gray-700 border-gray-200";
  let name = "알 수 없음";

  switch (status) {
    case "active":
    case "in_progress":
    case "pending":
      IconComponent = Timer;
      className = "bg-blue-50 text-blue-600 border-blue-200";
      name = "진행중";
      break;
    case "completed":
    case "closed":
      IconComponent = CheckCircle2;
      className = "bg-green-50 text-green-600 border-green-200";
      name = "완료";
      break;
    default:
      break;
  }
  return (
    <Badge className={cn("text-xs whitespace-nowrap min-w-[65px] flex justify-center py-1 border", className)}>
      <IconComponent className="mr-1 h-3 w-3" />
      {name}
    </Badge>
  );
};

const renderLawsuitTypeBadge = (type) => {
  if (!type) {
    return <Badge className="bg-muted text-muted-foreground border-muted/50 border">일반 사건</Badge>;
  }
  if (type === "civil") {
    return <Badge className="bg-primary/10 text-primary border-primary/20 border"><Scale className="mr-1 h-3 w-3" />민사</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border-muted/50 border">{type}</Badge>;
};

function CasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("case_number");
  const [allCases, setAllCases] = useState([]);

  const pushStateToUrl = useCallback(
    ({ nextSearchTerm, nextSearchType, nextPage, nextPageSize }) => {
      const params = new URLSearchParams();
      if (nextSearchTerm?.trim()) params.set("q", nextSearchTerm.trim());
      params.set("type", nextSearchType || "case_number");
      if ((nextPage || 1) > 1) params.set("page", String(nextPage));
      if ((nextPageSize || DEFAULT_PAGE_SIZE) !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(nextPageSize));
      const query = params.toString();
      router.push(query ? `/cases?${query}` : "/cases");
    },
    [router]
  );

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const { data: caseRows, error: caseError } = await supabase
        .from("test_cases")
        .select("id, case_type, status, filing_date, principal_amount, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (caseError) throw caseError;

      const casesData = caseRows || [];
      if (casesData.length === 0) {
        setAllCases([]);
        return;
      }

      const caseIds = casesData.map((item) => item.id).filter(Boolean);

      const [partiesResult, clientsResult, lawsuitsResult] = await Promise.all([
        supabase.from("test_case_parties").select("id, case_id, party_type, entity_type, name, company_name, kcb_checked, kcb_checked_date, payment_notification_sent, payment_notification_date").in("case_id", caseIds),
        supabase.from("test_case_clients").select("id, case_id, client_type, individual_id, organization_id").in("case_id", caseIds),
        supabase.from("test_case_lawsuits").select("id, case_id, lawsuit_type, court_name, case_number, created_at, updated_at").in("case_id", caseIds).order("created_at", { ascending: false }),
      ]);

      if (partiesResult.error) throw partiesResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (lawsuitsResult.error) throw lawsuitsResult.error;

      const clientsData = clientsResult.data || [];
      const lawsuitsData = lawsuitsResult.data || [];
      const partiesData = partiesResult.data || [];

      const userIds = [...new Set(clientsData.filter((item) => item.client_type === "individual" && isUuid(item.individual_id)).map((item) => item.individual_id))];
      const organizationIds = [...new Set(clientsData.filter((item) => item.client_type === "organization" && isUuid(item.organization_id)).map((item) => item.organization_id))];

      const [usersResult, organizationsResult] = await Promise.all([
        userIds.length > 0 ? supabase.from("users").select("id, name").in("id", userIds) : Promise.resolve({ data: [], error: null }),
        organizationIds.length > 0 ? supabase.from("test_organizations").select("id, name").in("id", organizationIds) : Promise.resolve({ data: [], error: null }),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (organizationsResult.error) throw organizationsResult.error;

      const userMap = new Map((usersResult.data || []).map((item) => [item.id, item]));
      const organizationMap = new Map((organizationsResult.data || []).map((item) => [item.id, item]));

      const partiesByCase = new Map();
      partiesData.forEach((party) => {
        if (!partiesByCase.has(party.case_id)) partiesByCase.set(party.case_id, []);
        partiesByCase.get(party.case_id).push(party);
      });

      const clientsByCase = new Map();
      clientsData.forEach((client) => {
        if (!clientsByCase.has(client.case_id)) clientsByCase.set(client.case_id, []);
        clientsByCase.get(client.case_id).push(client);
      });

      const lawsuitsByCase = new Map();
      lawsuitsData.forEach((lawsuit) => {
        if (!lawsuitsByCase.has(lawsuit.case_id)) lawsuitsByCase.set(lawsuit.case_id, []);
        lawsuitsByCase.get(lawsuit.case_id).push(lawsuit);
      });

      const normalizedCases = casesData.map((caseItem) => {
        const caseParties = partiesByCase.get(caseItem.id) || [];
        const caseClients = clientsByCase.get(caseItem.id) || [];
        const caseLawsuits = lawsuitsByCase.get(caseItem.id) || [];

        const creditor = caseParties.find((party) => PARTY_ROLE_GROUPS.creditor.includes(party.party_type));
        const debtor = caseParties.find((party) => PARTY_ROLE_GROUPS.debtor.includes(party.party_type));

        const clientNames = caseClients.map((client) => {
          if (client.client_type === "individual") return userMap.get(client.individual_id)?.name || null;
          if (client.client_type === "organization") return organizationMap.get(client.organization_id)?.name || null;
          return null;
        }).filter(Boolean);

        const latestLawsuit = [...caseLawsuits].sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })[0];

        return {
          id: caseItem.id,
          case_id: caseItem.id,
          status: caseItem.status || "pending",
          case_type: caseItem.case_type || "debt",
          filing_date: caseItem.filing_date || null,
          principal_amount: Number(caseItem.principal_amount) || 0,
          created_at: caseItem.created_at,
          updated_at: caseItem.updated_at,
          creditor_name: formatPartyName(creditor),
          debtor_name: formatPartyName(debtor),
          party_names: caseParties.map(formatPartyName).filter(Boolean).join(", "),
          clientName: clientNames.length > 0 ? clientNames.join(", ") : "미등록",
          case_number: latestLawsuit?.case_number || "",
          court_name: latestLawsuit?.court_name || "",
          lawsuit_type: latestLawsuit?.lawsuit_type || null,
        };
      });

      setAllCases(normalizedCases);
    } catch (error) {
      console.error("사건 목록 불러오기 오류:", error);
      toast.error("사건 목록을 불러오는 중 오류가 발생했습니다");
      setAllCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    const nextType = searchParams.get("type") === "party_name" ? "party_name" : "case_number";
    const nextTerm = searchParams.get("q") || "";
    const nextPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const nextPageSize = Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE);
    setSearchType(nextType);
    setSearchTerm(nextTerm);
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, [searchParams]);

  const filteredCases = useMemo(() => {
    const normalizedTerm = normalizeSearchText(searchTerm);
    const source = [...allCases].sort((a, b) => {
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      return bTime - aTime;
    });

    if (!normalizedTerm) return source;

    if (searchType === "party_name") {
      return source.filter((caseItem) => {
        const searchable = [caseItem.creditor_name, caseItem.debtor_name, caseItem.party_names, caseItem.clientName].map(normalizeSearchText).join(" ");
        return searchable.includes(normalizedTerm);
      });
    }

    const exactMatches = source.filter((caseItem) => normalizeSearchText(caseItem.case_number) === normalizedTerm);
    if (exactMatches.length > 0) return exactMatches;

    return source.filter((caseItem) => {
      const searchable = [caseItem.case_number, caseItem.court_name, caseItem.id].map(normalizeSearchText).join(" ");
      return searchable.includes(normalizedTerm);
    });
  }, [allCases, searchTerm, searchType]);

  const totalResults = filteredCases.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, currentPage, pageSize]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    pushStateToUrl({ nextSearchTerm: searchTerm, nextSearchType: searchType, nextPage: 1, nextPageSize: pageSize });
  };

  const handleTabChange = (value) => {
    setSearchType(value);
    setSearchTerm("");
    pushStateToUrl({ nextSearchTerm: "", nextSearchType: value, nextPage: 1, nextPageSize: pageSize });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    pushStateToUrl({ nextSearchTerm: searchTerm, nextSearchType: searchType, nextPage, nextPageSize: pageSize });
  };

  const openCaseDetail = (caseId, tab) => {
    const params = new URLSearchParams();
    if (tab) params.set("tab", tab);
    const query = params.toString();
    router.push(query ? `/cases/${caseId}?${query}` : `/cases/${caseId}`);
  };

  const getCaseSummaryText = (caseItem) => {
    if (searchType === "party_name") return `${caseItem.creditor_name} / ${caseItem.debtor_name}`;
    if (caseItem.clientName && caseItem.clientName !== "미등록") return caseItem.clientName;
    return `${caseItem.creditor_name} / ${caseItem.debtor_name}`;
  };

  const getSearchPlaceholder = () => searchType === "case_number" ? "사건번호 입력 (예: 2024가단123456)" : "당사자 이름 입력 (개인 또는 회사명)";

  const PaginationComponent = ({ activePage, pages, onChange }) => {
    const getPageButtons = () => {
      if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
      if (activePage <= 4) return [1, 2, 3, 4, 5, "...", pages];
      if (activePage >= pages - 3) return [1, "...", pages - 4, pages - 3, pages - 2, pages - 1, pages];
      return [1, "...", activePage - 1, activePage, activePage + 1, "...", pages];
    };
    return (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={activePage === 1} onClick={() => onChange(activePage - 1)}>이전</Button>
        {getPageButtons().map((pageNumber, index) =>
          pageNumber === "..." ? (
            <Button key={`ellipsis-${index}`} variant="outline" size="sm" disabled>...</Button>
          ) : (
            <Button key={pageNumber} variant={activePage === pageNumber ? "default" : "outline"} size="sm" onClick={() => onChange(pageNumber)}>
              {pageNumber}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" disabled={activePage === pages} onClick={() => onChange(activePage + 1)}>다음</Button>
      </div>
    );
  };

  return (
    <div className="container py-6 px-4 md:px-6">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div><h1 className="text-2xl font-semibold tracking-tight">사건 검색</h1></div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/clients">
              <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2"><Users className="h-4 w-4" />의뢰인 목록</Button>
            </Link>
            <Link href="/cases/new">
              <Button className="w-full sm:w-auto flex items-center gap-2"><Plus className="h-4 w-4" />새 사건 등록</Button>
            </Link>
          </div>
        </div>
        <Tabs value={searchType} onValueChange={handleTabChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="case_number">사건번호</TabsTrigger>
            <TabsTrigger value="party_name">당사자 이름</TabsTrigger>
          </TabsList>
          <form onSubmit={handleSearchSubmit} className="flex w-full mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input type="search" placeholder={getSearchPlaceholder()} className="pl-9 w-full" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
            <Button type="submit" className="ml-2" disabled={!searchTerm.trim() && !searchParams.get("q")}>검색</Button>
          </form>
          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {searchTerm.trim() ? `'${searchTerm.trim()}' 검색 결과 (${totalResults}건)` : `최근 사건 목록 (${totalResults}건)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />사건 목록을 불러오는 중입니다.</div>
              ) : visibleCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"><Search className="h-8 w-8 text-gray-400 dark:text-gray-500" /></div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">결과가 없습니다</h3>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                        <TableHead className="pl-4">상태</TableHead>
                        <TableHead>당사자</TableHead>
                        <TableHead>원리금</TableHead>
                        <TableHead>소송정보</TableHead>
                        <TableHead className="text-center">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleCases.map((caseItem) => (
                        <TableRow key={caseItem.id} className="border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => openCaseDetail(caseItem.id)}>
                          <TableCell className="py-3 pl-4">{getCaseStatusBadge(caseItem.status)}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="text-sm truncate max-w-[240px]">{getCaseSummaryText(caseItem)}</span>
                              {searchType === "party_name" && <span className="text-xs text-muted-foreground mt-1">의뢰인: {caseItem.clientName}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="py-3"><span className="font-medium text-sm md:text-base">{formatUtil(caseItem.principal_amount || 0)}</span></TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1">
                              {renderLawsuitTypeBadge(caseItem.lawsuit_type)}
                              <div className="text-sm text-gray-500">{[caseItem.court_name, caseItem.case_number].filter(Boolean).join(" ") || "등록된 소송 정보 없음"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-3 pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(event) => event.stopPropagation()}><MoreHorizontal className="h-4 w-4 text-gray-500" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={(event) => { event.stopPropagation(); openCaseDetail(caseItem.id); }} className="cursor-pointer"><ExternalLink className="h-4 w-4 mr-2 text-blue-500" /><span>상세페이지 이동</span></DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!loading && totalResults > 0 && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-col sm:flex-row">
                  <div className="text-sm text-gray-500 dark:text-gray-400">총 {totalResults}개 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalResults)}개 표시</div>
                  <PaginationComponent activePage={currentPage} pages={totalPages} onChange={handlePageChange} />
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-12"><RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" /></div>}>
      <CasesContent />
    </Suspense>
  );
}