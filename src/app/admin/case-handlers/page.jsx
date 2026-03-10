"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserCog,
  User,
  Building2,
  UserCheck,
  UserX,
  PlusCircle,
  X,
  AlertCircle,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CaseHandlersPage() {
  const router = useRouter();
  const { user } = useUser();
  const [handlers, setHandlers] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredHandlers, setFilteredHandlers] = useState([]);
  const [selectedHandler, setSelectedHandler] = useState(null);
  const [handlerCases, setHandlerCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [searchCaseTerm, setSearchCaseTerm] = useState("");
  const [searchCaseResults, setSearchCaseResults] = useState([]);
  const [showSearchCaseDialog, setShowSearchCaseDialog] = useState(false);
  const [addingCase, setAddingCase] = useState(false);
  const [removingCaseId, setRemovingCaseId] = useState(null);
  const [showOpinionDialog, setShowOpinionDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [opinionTitle, setOpinionTitle] = useState("");
  const [opinionMessage, setOpinionMessage] = useState("");
  const [creditorName, setCreditorName] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [sendingOpinion, setSendingOpinion] = useState(false);

  // 관리자 권한 확인
  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("접근 권한이 없습니다");
      router.push("/");
    }
  }, [user, router]);

  // 담당자 목록 불러오기
  useEffect(() => {
    async function fetchHandlers() {
      try {
        setLoading(true);

        // Staff 역할을 가진 사용자 불러오기
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "staff")
          .order("name");

        if (error) throw error;

        // 담당자 데이터 저장
        setStaffs(data || []);
        setHandlers(data || []);
        setFilteredHandlers(data || []);
      } catch (error) {
        console.error("담당자 목록 불러오기 오류:", error.message);
        toast.error("담당자 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchHandlers();
  }, []);

  // 검색 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredHandlers(handlers);
      return;
    }

    const filtered = handlers.filter(
      (handler) =>
        handler.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        handler.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredHandlers(filtered);
  }, [searchTerm, handlers]);

  // 담당자 유형 변경 핸들러
  const handleEmployeeTypeChange = async (userId, newType) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ employee_type: newType })
        .eq("id", userId);

      if (error) throw error;

      // 상태 업데이트
      setHandlers((prev) =>
        prev.map((handler) =>
          handler.id === userId ? { ...handler, employee_type: newType } : handler
        )
      );

      setFilteredHandlers((prev) =>
        prev.map((handler) =>
          handler.id === userId ? { ...handler, employee_type: newType } : handler
        )
      );

      if (selectedHandler && selectedHandler.id === userId) {
        setSelectedHandler({ ...selectedHandler, employee_type: newType });
      }

      toast.success("담당자 유형이 변경되었습니다.");
    } catch (error) {
      console.error("담당자 유형 변경 오류:", error);
      toast.error("담당자 유형 변경에 실패했습니다.");
    }
  };

  // 담당자 선택 핸들러
  const handleSelectHandler = async (handler) => {
    setSelectedHandler(handler);
    await fetchHandlerCases(handler.id);
  };

  // 담당자의 사건 목록 불러오기
  const fetchHandlerCases = async (handlerId) => {
    try {
      setLoadingCases(true);

      // 담당자가 맡은 사건 ID 불러오기
      const { data: handlerData, error: handlerError } = await supabase
        .from("test_case_handlers")
        .select("case_id")
        .eq("user_id", handlerId);

      if (handlerError) throw handlerError;

      if (!handlerData || handlerData.length === 0) {
        setHandlerCases([]);
        return;
      }

      // 사건 ID 목록
      const caseIds = handlerData.map((h) => h.case_id);

      // 사건 정보 불러오기
      const { data: casesData, error: casesError } = await supabase
        .from("test_cases")
        .select("*")
        .in("id", caseIds);

      if (casesError) throw casesError;

      // 각 사건에 대한 채권자와 채무자 정보 불러오기
      const casesWithParties = [];

      for (const caseItem of casesData) {
        // 채권자 정보 불러오기
        const { data: creditors, error: creditorsError } = await supabase
          .from("test_case_parties")
          .select("*")
          .eq("case_id", caseItem.id)
          .eq("party_type", "creditor");

        if (creditorsError) throw creditorsError;

        // 채무자 정보 불러오기
        const { data: debtors, error: debtorsError } = await supabase
          .from("test_case_parties")
          .select("*")
          .eq("case_id", caseItem.id)
          .eq("party_type", "debtor");

        if (debtorsError) throw debtorsError;

        // 사건과 당사자 정보 합치기
        casesWithParties.push({
          ...caseItem,
          creditors: creditors || [],
          debtors: debtors || [],
        });
      }

      setHandlerCases(casesWithParties);
    } catch (error) {
      console.error("담당 사건 목록 불러오기 오류:", error.message);
      toast.error("담당 사건 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoadingCases(false);
    }
  };

  // 사건 검색
  const searchCases = async () => {
    if (!searchCaseTerm.trim()) {
      setSearchCaseResults([]);
      return;
    }

    try {
      setAddingCase(true);

      // 당사자 이름으로 사건 검색
      const { data: partiesData, error: partiesError } = await supabase
        .from("test_case_parties")
        .select("case_id, name, company_name, party_type")
        .or(`name.ilike.%${searchCaseTerm}%,company_name.ilike.%${searchCaseTerm}%`)
        .limit(20);

      if (partiesError) throw partiesError;

      // 결과가 없거나 결과가 있는 경우 처리
      if (!partiesData || partiesData.length === 0) {
        // 숫자로 변환 가능한 경우 원금으로 검색
        const numericSearch = parseFloat(searchCaseTerm.replace(/,/g, ""));
        if (!isNaN(numericSearch)) {
          const { data: amountData, error: amountError } = await supabase
            .from("test_cases")
            .select("*")
            .eq("principal_amount", numericSearch);

          if (amountError) throw amountError;

          if (amountData && amountData.length > 0) {
            const casesWithParties = await addPartiesInfoToCases(amountData);
            setSearchCaseResults(casesWithParties);
            return;
          }
        }

        // ID 검색 - UUID 형식이면 정확히 일치하는 경우만 검색
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchCaseTerm)
        ) {
          const { data: idData, error: idError } = await supabase
            .from("test_cases")
            .select("*")
            .eq("id", searchCaseTerm);

          if (idError) throw idError;

          if (idData && idData.length > 0) {
            const casesWithParties = await addPartiesInfoToCases(idData);
            setSearchCaseResults(casesWithParties);
            return;
          }
        }

        // 검색 결과 없음
        setSearchCaseResults([]);
        return;
      }

      // 당사자 정보로 사건 ID 목록 얻기
      const uniqueCaseIds = [...new Set(partiesData.map((p) => p.case_id))];

      // 사건 정보 불러오기
      const { data: casesData, error: casesError } = await supabase
        .from("test_cases")
        .select("*")
        .in("id", uniqueCaseIds);

      if (casesError) throw casesError;

      // 사건에 당사자 정보 추가
      const casesWithParties = await addPartiesInfoToCases(casesData || []);
      setSearchCaseResults(casesWithParties);
    } catch (error) {
      console.error("사건 검색 오류:", error.message);
      toast.error("사건 검색에 실패했습니다.");
    } finally {
      setAddingCase(false);
    }
  };

  // 사건 목록에 당사자 정보 추가하는 헬퍼 함수
  const addPartiesInfoToCases = async (casesData) => {
    const casesWithParties = [];

    for (const caseItem of casesData) {
      // 채권자 정보 불러오기
      const { data: creditors, error: creditorsError } = await supabase
        .from("test_case_parties")
        .select("*")
        .eq("case_id", caseItem.id)
        .eq("party_type", "creditor");

      if (creditorsError) throw creditorsError;

      // 채무자 정보 불러오기
      const { data: debtors, error: debtorsError } = await supabase
        .from("test_case_parties")
        .select("*")
        .eq("case_id", caseItem.id)
        .eq("party_type", "debtor");

      if (debtorsError) throw debtorsError;

      // 이미 담당 중인 사건인지 확인
      const isAlreadyHandling = handlerCases.some((hc) => hc.id === caseItem.id);

      // 사건과 당사자 정보 합치기
      casesWithParties.push({
        ...caseItem,
        creditors: creditors || [],
        debtors: debtors || [],
        isAlreadyHandling,
      });
    }

    return casesWithParties;
  };

  // 담당 사건 추가
  const addCaseToHandler = async (caseId) => {
    if (!selectedHandler) {
      toast.error("담당자를 선택해주세요.");
      return;
    }

    try {
      setAddingCase(true);

      // 이미 담당 중인지 확인
      const { data: existing, error: checkError } = await supabase
        .from("test_case_handlers")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", selectedHandler.id);

      if (checkError) throw checkError;

      // 이미 담당 중이면 추가하지 않음
      if (existing && existing.length > 0) {
        toast.info("이미 담당 중인 사건입니다.");
        return;
      }

      // 담당자-사건 연결 추가
      const { error } = await supabase.from("test_case_handlers").insert({
        case_id: caseId,
        user_id: selectedHandler.id,
        role: "담당직원",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // 사건 목록 다시 불러오기
      await fetchHandlerCases(selectedHandler.id);

      // 검색 결과 업데이트
      setSearchCaseResults((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, isAlreadyHandling: true } : c))
      );

      toast.success("담당 사건이 추가되었습니다.");
    } catch (error) {
      console.error("담당 사건 추가 오류:", error.message);
      toast.error("담당 사건 추가에 실패했습니다.");
    } finally {
      setAddingCase(false);
    }
  };

  // 담당 사건 제거
  const removeCaseFromHandler = async (caseId) => {
    if (!selectedHandler) {
      toast.error("담당자를 선택해주세요.");
      return;
    }

    try {
      setRemovingCaseId(caseId);

      // 담당자-사건 연결 제거
      const { error } = await supabase
        .from("test_case_handlers")
        .delete()
        .eq("case_id", caseId)
        .eq("user_id", selectedHandler.id);

      if (error) throw error;

      // 사건 목록 업데이트
      setHandlerCases((prev) => prev.filter((c) => c.id !== caseId));

      // 검색 결과 업데이트
      setSearchCaseResults((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, isAlreadyHandling: false } : c))
      );

      toast.success("담당 사건이 제거되었습니다.");
    } catch (error) {
      console.error("담당 사건 제거 오류:", error.message);
      toast.error("담당 사건 제거에 실패했습니다.");
    } finally {
      setRemovingCaseId(null);
    }
  };

  // 담당자 유형 표시
  const getEmployeeTypeBadge = (type) => {
    switch (type) {
      case "internal":
        return { color: "bg-blue-500 hover:bg-blue-600", text: "내부직원" };
      case "external":
        return { color: "bg-amber-500 hover:bg-amber-600", text: "외부직원" };
      default:
        return { color: "bg-gray-500 hover:bg-gray-600", text: "미지정" };
    }
  };

  // 당사자 정보 포맷
  const formatPartyName = (party) => {
    if (party.entity_type === "corporation") {
      return party.company_name || "-";
    }
    return party.name || "-";
  };

  // 의견 보내기 핸들러
  const handleSendOpinion = async () => {
    if (
      !opinionTitle.trim() ||
      !opinionMessage.trim() ||
      !selectedCase ||
      !user ||
      !creditorName.trim() ||
      !debtorName.trim()
    ) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    try {
      setSendingOpinion(true);

      const { error } = await supabase.from("test_case_opinions").insert({
        case_id: selectedCase.id,
        created_by: user.id,
        receiver_id: selectedHandler.id,
        title: opinionTitle.trim(),
        message: opinionMessage.trim(),
        creditor_name: creditorName.trim(),
        debtor_name: debtorName.trim(),
      });

      if (error) throw error;

      toast.success("의견이 전송되었습니다.");
      setShowOpinionDialog(false);
      setOpinionTitle("");
      setOpinionMessage("");
      setCreditorName("");
      setDebtorName("");
      setSelectedCase(null);
    } catch (error) {
      console.error("의견 전송 오류:", error);
      toast.error("의견 전송에 실패했습니다.");
    } finally {
      setSendingOpinion(false);
    }
  };

  // 의견 보내기 버튼 클릭 핸들러
  const handleOpinionClick = (caseItem) => {
    setSelectedCase(caseItem);
    setOpinionTitle("");
    // 채권자/채무자 정보 자동 설정
    const creditorName = caseItem.creditors?.[0]?.name || "";
    const debtorName = caseItem.debtors?.[0]?.name || "";
    setCreditorName(creditorName);
    setDebtorName(debtorName);
    setShowOpinionDialog(true);
  };

  return (
    <div className="container mx-auto py-6 px-4 lg:px-8">
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>담당자 관리</CardTitle>
                <CardDescription>사건 담당자를 관리하고 사건을 할당할 수 있습니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 담당자 목록 */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>담당자 목록</CardTitle>
              <div className="relative w-full mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 이메일로 검색..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // 엔터키로 검색 적용
                      if (!searchTerm.trim()) {
                        setFilteredHandlers(handlers);
                      } else {
                        const filtered = handlers.filter(
                          (handler) =>
                            handler.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            handler.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        setFilteredHandlers(filtered);
                      }
                    }
                  }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p>데이터를 불러오는 중...</p>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-2">
                    {filteredHandlers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        {searchTerm ? "검색 결과가 없습니다." : "등록된 담당자가 없습니다."}
                      </div>
                    ) : (
                      filteredHandlers.map((handler) => (
                        <div
                          key={handler.id}
                          className={`p-3 rounded-md border transition-colors cursor-pointer ${
                            selectedHandler?.id === handler.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50 border-transparent"
                          }`}
                          onClick={() => handleSelectHandler(handler)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <UserCog className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium">{handler.name || "-"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {handler.email || "-"}
                                </div>
                              </div>
                            </div>
                            <Select
                              value={handler.employee_type || ""}
                              onValueChange={(value) => handleEmployeeTypeChange(handler.id, value)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue placeholder="유형 선택">
                                  {handler.employee_type ? (
                                    <Badge
                                      variant="outline"
                                      className={`${
                                        getEmployeeTypeBadge(handler.employee_type).color
                                      } text-white px-2 py-0.5`}
                                    >
                                      {getEmployeeTypeBadge(handler.employee_type).text}
                                    </Badge>
                                  ) : (
                                    "유형 선택"
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="internal">내부직원</SelectItem>
                                <SelectItem value="external">외부직원</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* 담당 사건 목록 */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {selectedHandler ? `${selectedHandler.name}의 담당 사건` : "담당 사건 목록"}
                </CardTitle>
                {selectedHandler && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSearchCaseDialog(true)}
                    disabled={!selectedHandler}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    사건 추가
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedHandler ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    좌측에서 담당자를 선택하면 담당 사건 목록이 표시됩니다.
                  </p>
                </div>
              ) : loadingCases ? (
                <div className="flex justify-center items-center h-64">
                  <p>사건 목록을 불러오는 중...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {handlerCases.length === 0 ? (
                    <div className="text-center py-10">
                      <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">담당 중인 사건이 없습니다.</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowSearchCaseDialog(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        사건 추가하기
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">채권자</TableHead>
                          <TableHead className="w-[30%]">채무자</TableHead>
                          <TableHead className="w-[20%]">원금</TableHead>
                          <TableHead className="w-[20%] text-right">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {handlerCases.map((caseItem) => (
                          <TableRow key={caseItem.id}>
                            <TableCell>
                              {caseItem.creditors && caseItem.creditors.length > 0 ? (
                                caseItem.creditors.map((creditor, idx) => (
                                  <div
                                    key={`cred-${creditor.id}-${idx}`}
                                    className="flex items-center gap-1 mb-1"
                                  >
                                    {creditor.entity_type === "corporation" ? (
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <User className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">{formatPartyName(creditor)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">정보 없음</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {caseItem.debtors && caseItem.debtors.length > 0 ? (
                                caseItem.debtors.map((debtor, idx) => (
                                  <div
                                    key={`debt-${debtor.id}-${idx}`}
                                    className="flex items-center gap-1 mb-1"
                                  >
                                    {debtor.entity_type === "corporation" ? (
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <User className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">{formatPartyName(debtor)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">정보 없음</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {caseItem.principal_amount ? (
                                <span>
                                  {new Intl.NumberFormat("ko-KR").format(caseItem.principal_amount)}
                                  원
                                </span>
                              ) : (
                                <span className="text-muted-foreground">정보 없음</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpinionClick(caseItem)}
                                >
                                  <MessageSquarePlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeCaseFromHandler(caseItem.id)}
                                  disabled={removingCaseId === caseItem.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 사건 검색 다이얼로그 */}
      <Dialog open={showSearchCaseDialog} onOpenChange={setShowSearchCaseDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>사건 검색</DialogTitle>
            <DialogDescription>
              당사자 이름 또는 원금으로 검색하여 담당자에게 사건을 할당할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="당사자 이름 또는 원금으로 검색..."
                  className="pl-8"
                  value={searchCaseTerm}
                  onChange={(e) => setSearchCaseTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !addingCase) {
                      e.preventDefault();
                      searchCases();
                    }
                  }}
                />
              </div>
              <Button onClick={searchCases} disabled={addingCase}>
                {addingCase ? "검색 중..." : "검색"}
              </Button>
            </div>

            {searchCaseResults.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">채권자</TableHead>
                      <TableHead className="w-[25%]">채무자</TableHead>
                      <TableHead className="w-[20%]">원금</TableHead>
                      <TableHead className="w-[30%] text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchCaseResults.map((caseItem) => (
                      <TableRow key={caseItem.id}>
                        <TableCell>
                          {caseItem.creditors && caseItem.creditors.length > 0 ? (
                            caseItem.creditors.map((creditor, idx) => (
                              <div
                                key={`cred-${creditor.id}-${idx}`}
                                className="flex items-center gap-1 mb-1"
                              >
                                {creditor.entity_type === "corporation" ? (
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <User className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="text-sm">{formatPartyName(creditor)}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">정보 없음</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {caseItem.debtors && caseItem.debtors.length > 0 ? (
                            caseItem.debtors.map((debtor, idx) => (
                              <div
                                key={`debt-${debtor.id}-${idx}`}
                                className="flex items-center gap-1 mb-1"
                              >
                                {debtor.entity_type === "corporation" ? (
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <User className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="text-sm">{formatPartyName(debtor)}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">정보 없음</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {caseItem.principal_amount ? (
                            <span>
                              {new Intl.NumberFormat("ko-KR").format(caseItem.principal_amount)}원
                            </span>
                          ) : (
                            <span className="text-muted-foreground">정보 없음</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {caseItem.isAlreadyHandling ? (
                            <Badge variant="secondary">이미 담당 중</Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addCaseToHandler(caseItem.id)}
                              disabled={addingCase}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              담당 추가
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : searchCaseTerm.trim() && !addingCase ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>검색 결과 없음</AlertTitle>
                <AlertDescription>
                  검색어와 일치하는 사건이 없습니다. 다른 검색어로 시도해보세요.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchCaseDialog(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 의견 보내기 다이얼로그 */}
      <Dialog open={showOpinionDialog} onOpenChange={setShowOpinionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>의견 보내기</DialogTitle>
            <DialogDescription>
              담당자: {selectedHandler?.name} / 사건번호: {selectedCase?.case_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                제목
              </label>
              <Input
                id="title"
                value={opinionTitle}
                onChange={(e) => setOpinionTitle(e.target.value)}
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="creditor" className="text-sm font-medium">
                  채권자
                </label>
                <Input
                  id="creditor"
                  value={creditorName}
                  onChange={(e) => setCreditorName(e.target.value)}
                  placeholder="채권자명을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="debtor" className="text-sm font-medium">
                  채무자
                </label>
                <Input
                  id="debtor"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder="채무자명을 입력하세요"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                내용
              </label>
              <textarea
                id="message"
                value={opinionMessage}
                onChange={(e) => setOpinionMessage(e.target.value)}
                placeholder="내용을 입력하세요"
                className="w-full min-h-[200px] px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOpinionDialog(false)}
              disabled={sendingOpinion}
            >
              취소
            </Button>
            <Button onClick={handleSendOpinion} disabled={sendingOpinion}>
              {sendingOpinion ? "전송 중..." : "전송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
