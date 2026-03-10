import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, User, Building2, Search, PlusCircle, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ClientInfoSection({ formData, setFormData, users, organizations }) {
  // 검색 관련 상태 추가
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null); // 수정 중인 의뢰인 인덱스
  const [clientTypeChanged, setClientTypeChanged] = useState(false); // 클라이언트 유형 변경 감지용

  const addClient = () => {
    setFormData((prev) => ({
      ...prev,
      clients: [
        ...prev.clients,
        {
          client_type: "individual",
          individual_id: "",
          organization_id: "",
          position: "",
        },
      ],
    }));
    // 새로 추가된 의뢰인을 수정 모드로 설정
    setEditingIndex(formData.clients.length);
    toast.success("의뢰인이 추가되었습니다");
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
    // 수정 중이던 의뢰인이 삭제되면 수정 모드 해제
    if (editingIndex === index) {
      setEditingIndex(null);
      setSearchTerm("");
      setSearchResults([]);
    }
    toast.info("의뢰인이 삭제되었습니다");
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
        updatedClients[index].position = "";
        // 렌더링 중 setState 호출 대신 플래그 설정
        setClientTypeChanged(true);
      }

      return {
        ...prev,
        clients: updatedClients,
      };
    });
  };

  // 클라이언트 유형 변경 감지 및 처리
  useEffect(() => {
    if (clientTypeChanged) {
      setSearchResults([]);
      setSearchTerm("");
      setClientTypeChanged(false);
    }
  }, [clientTypeChanged]);

  // 실시간 검색 처리
  useEffect(() => {
    if (!searchTerm.trim() || editingIndex === null) {
      setSearchResults([]);
      return;
    }

    const client = formData.clients[editingIndex];
    const type = client.client_type;

    if (type === "individual") {
      // 개인 검색 - 이름, 이메일로만 검색
      const filteredUsers = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(filteredUsers);
    } else {
      // 법인/단체 검색 - 이름으로만 검색
      const filteredOrgs = organizations.filter((org) =>
        org.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filteredOrgs);
    }
  }, [searchTerm, editingIndex, formData.clients, users, organizations]);

  // 검색어 변경 핸들러
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // 검색 결과에서 선택 처리
  const handleSelectSearchResult = (index, id) => {
    const client = formData.clients[index];
    const field = client.client_type === "individual" ? "individual_id" : "organization_id";

    // 선택한 항목의 정보 가져오기
    let selectedEntity;
    if (client.client_type === "individual") {
      selectedEntity = users.find((user) => user.id === id);
    } else {
      selectedEntity = organizations.find((org) => org.id === id);
    }

    // 직위 정보 설정 (개인인 경우 position, 조직인 경우 representative_position)
    let position = "";
    if (client.client_type === "individual" && selectedEntity?.position) {
      position = selectedEntity.position;
    } else if (client.client_type === "organization" && selectedEntity?.representative_position) {
      position = selectedEntity.representative_position;
    }

    // ID와 직위 설정
    handleClientChange(index, field, id);
    handleClientChange(index, "position", position);

    // 검색 상태 초기화 및 수정 모드 종료
    setSearchResults([]);
    setSearchTerm("");
    setEditingIndex(null);

    toast.success(
      client.client_type === "individual"
        ? `${selectedEntity?.name || "사용자"} 의뢰인이 선택되었습니다`
        : `${selectedEntity?.name || "기업"} 의뢰인이 선택되었습니다`
    );
  };

  // 수정 모드 전환
  const handleEdit = (index) => {
    setEditingIndex(index);
    setSearchTerm("");
    setSearchResults([]);
  };

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";

    // 숫자만 추출
    const numbers = phone.replace(/\D/g, "");

    // 길이에 따라 포맷팅
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }

    return phone;
  };

  // 생년월일 포맷팅 함수
  const formatBirthDate = (birthDate) => {
    if (!birthDate) return "";

    // ISO 형식(YYYY-MM-DD)이면 YYYY년 MM월 DD일 형식으로 변환
    if (birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = birthDate.split("-");
      return `${year}년 ${month}월 ${day}일`;
    }

    return birthDate;
  };

  // 사용자 이니셜 가져오기
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent">
          의뢰인 정보
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addClient}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
          의뢰인 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {formData.clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-500 dark:text-blue-300 mb-4">
              <User className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
              등록된 의뢰인이 없습니다
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
              의뢰인 추가 버튼을 클릭하여 의뢰인을 등록해주세요
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addClient}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
              의뢰인 추가
            </Button>
          </div>
        ) : (
          formData.clients.map((client, index) => (
            <div
              key={index}
              className={`border border-gray-200 dark:border-gray-700 rounded-lg p-5 relative bg-gray-50/50 dark:bg-gray-800/50 transition-all ${
                editingIndex === index
                  ? "border-blue-300 dark:border-blue-600 shadow-md"
                  : "hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {/* 삭제 버튼 */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 h-8 w-8 p-0 text-gray-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                onClick={() => removeClient(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              {/* 의뢰인 유형 배지 - 항상 표시 */}
              <div className="mb-4">
                {client.client_type === "individual" ? (
                  <Badge className="border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200">
                    <User className="mr-1 h-3 w-3" />
                    개인
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200">
                    <Building2 className="mr-1 h-3 w-3" />
                    법인/단체
                  </Badge>
                )}
              </div>

              {/* 수정 모드이거나 선택된 항목이 없는 경우 검색 UI 표시 */}
              {editingIndex === index ||
              (client.client_type === "individual" && !client.individual_id) ||
              (client.client_type === "organization" && !client.organization_id) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">의뢰인 유형</Label>
                      <Select
                        value={client.client_type}
                        onValueChange={(value) => handleClientChange(index, "client_type", value)}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800">
                          <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">
                            <div className="flex items-center">
                              <Badge className="mr-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 border-0">
                                <User className="mr-1 h-3 w-3" />
                                개인
                              </Badge>
                              개인
                            </div>
                          </SelectItem>
                          <SelectItem value="organization">
                            <div className="flex items-center">
                              <Badge className="mr-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 border-0">
                                <Building2 className="mr-1 h-3 w-3" />
                                법인/단체
                              </Badge>
                              법인/단체
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 space-y-2 relative">
                      <Label className="text-sm font-medium">
                        {client.client_type === "individual" ? "이름/이메일 검색" : "회사명 검색"}
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <Input
                          placeholder={
                            client.client_type === "individual"
                              ? "이름 또는 이메일로 검색"
                              : "회사명으로 검색"
                          }
                          value={searchTerm}
                          onChange={handleSearchChange}
                          className="pl-9 pr-4 bg-white dark:bg-gray-800"
                        />
                      </div>

                      {/* 검색 결과 표시 - 스타일 개선 */}
                      {searchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full max-w-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
                          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            {searchResults.length}개의 검색 결과
                          </div>
                          <ScrollArea className="max-h-[200px]">
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                              {searchResults.map((result) => (
                                <li
                                  key={result.id}
                                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                  onClick={() => handleSelectSearchResult(index, result.id)}
                                >
                                  {client.client_type === "individual" ? (
                                    <div className="flex items-start gap-3">
                                      <Avatar className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                        <AvatarFallback>{getInitials(result.name)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                          {result.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2 mt-1">
                                          {result.email && (
                                            <span className="inline-flex items-center">
                                              {result.email}
                                            </span>
                                          )}
                                          {result.birth_date && (
                                            <span className="inline-flex items-center">
                                              {formatBirthDate(result.birth_date)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-3">
                                      <Avatar className="h-10 w-10 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                        <AvatarFallback>{getInitials(result.name)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                          {result.name}
                                        </div>
                                        {result.business_number && (
                                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            법인 번호: {result.business_number}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // 선택된 의뢰인 정보 표시 (편집 모드 아닐 때)
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {client.client_type === "individual"
                        ? users.find((u) => u.id === client.individual_id)?.name || "이름 없음"
                        : organizations.find((o) => o.id === client.organization_id)?.name ||
                          "이름 없음"}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full"
                      onClick={() => handleEdit(index)}
                      title="의뢰인 정보 수정"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {client.client_type === "individual" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {users.find((u) => u.id === client.individual_id)?.email && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            이메일:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {users.find((u) => u.id === client.individual_id)?.email}
                          </span>
                        </div>
                      )}
                      {users.find((u) => u.id === client.individual_id)?.birth_date && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            생년월일:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatBirthDate(
                              users.find((u) => u.id === client.individual_id)?.birth_date
                            )}
                          </span>
                        </div>
                      )}
                      {users.find((u) => u.id === client.individual_id)?.phone_number && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            전화번호:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatPhoneNumber(
                              users.find((u) => u.id === client.individual_id)?.phone_number
                            )}
                          </span>
                        </div>
                      )}
                      {client.position && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            직위:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {client.position}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {organizations.find((o) => o.id === client.organization_id)
                        ?.business_number && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            법인번호:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {
                              organizations.find((o) => o.id === client.organization_id)
                                ?.business_number
                            }
                          </span>
                        </div>
                      )}
                      {organizations.find((o) => o.id === client.organization_id)?.phone && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            전화번호:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatPhoneNumber(
                              organizations.find((o) => o.id === client.organization_id)?.phone
                            )}
                          </span>
                        </div>
                      )}
                      {client.position && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">
                            담당자 직위:
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {client.position}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
