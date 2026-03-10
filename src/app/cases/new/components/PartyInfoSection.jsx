import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Search,
  MapPin,
  PlusCircle,
  User,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DaumPostcode from "react-daum-postcode";

export default function PartyInfoSection({ formData, setFormData }) {
  // 주소 검색 관련 상태
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [currentEditingPartyIndex, setCurrentEditingPartyIndex] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [zonecode, setZonecode] = useState("");
  const detailAddressRef = useRef(null);

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";

    // 숫자만 추출
    const numbers = phone.replace(/\D/g, "");

    // 길이에 따라 포맷팅 (입력 중에도 하이픈 추가)
    if (numbers.length >= 3 && numbers.length <= 6) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length >= 7 && numbers.length <= 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length >= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }

    // 3자리 미만은 그대로 반환
    return numbers;
  };

  // 주민등록번호 포맷팅 함수
  const formatResidentNumber = (number) => {
    if (!number) return "";

    // 숫자만 추출
    const numbers = number.replace(/\D/g, "");

    // 주민등록번호 포맷팅 (000000-0000000)
    if (numbers.length <= 6) {
      return numbers;
    } else {
      return `${numbers.slice(0, 6)}-${numbers.slice(6, 13)}`;
    }
  };

  // 법인번호 포맷팅 함수
  const formatCorporateNumber = (number) => {
    if (!number) return "";

    // 숫자만 추출
    const numbers = number.replace(/\D/g, "");

    // 법인번호 포맷팅 (000000-0000000)
    if (numbers.length <= 6) {
      return numbers;
    } else {
      return `${numbers.slice(0, 6)}-${numbers.slice(6, 13)}`;
    }
  };

  const handlePartyChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedParties = [...prev.parties];

      // 전화번호 자동 하이픈 추가
      if (field === "phone") {
        value = formatPhoneNumber(value);
      }

      // 주민등록번호 자동 하이픈 추가
      if (field === "resident_number") {
        value = formatResidentNumber(value);
      }

      // 법인번호 자동 하이픈 추가
      if (field === "corporate_number") {
        value = formatCorporateNumber(value);
      }

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

    const fieldName =
      field === "resident_number"
        ? "주민등록번호"
        : field === "phone"
        ? "전화번호"
        : field === "address"
        ? "주소"
        : "이메일";

    toast.info(`${fieldName} 필드가 '모름'으로 설정되었습니다`);
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
          resident_number: "",
          unknown_resident_number: false,
          company_name: "",
          corporate_number: "",
          position: "",
          phone: "",
          unknown_phone: false,
          address: "",
          unknown_address: false,
          email: "",
          unknown_email: false,
        },
      ],
    }));

    toast.success("당사자가 추가되었습니다");
  };

  const removeParty = (index) => {
    if (formData.parties.length <= 2) {
      toast.error("최소 2명의 당사자가 필요합니다");
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

    toast.info("당사자가 삭제되었습니다");
  };

  // 당사자 유형 레이블
  const getPartyTypeLabel = (caseType, partyType) => {
    if (caseType === "lawsuit") {
      return partyType === "plaintiff" ? "원고" : "피고";
    } else {
      return partyType === "creditor" ? "채권자" : "채무자";
    }
  };

  // 당사자 유형에 따른 배지 색상 가져오기
  const getPartyTypeBadgeColors = (caseType, partyType) => {
    if (caseType === "lawsuit") {
      if (partyType === "plaintiff") {
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200";
      } else {
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200";
      }
    } else {
      if (partyType === "creditor") {
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200";
      } else {
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200";
      }
    }
  };

  // 주소 검색 다이얼로그 열기
  const openAddressDialog = (index) => {
    if (!formData.parties[index].unknown_address) {
      setCurrentEditingPartyIndex(index);
      setSelectedAddress("");
      setDetailAddress("");
      setZonecode("");
      setIsAddressDialogOpen(true);
    }
  };

  // 주소 선택 완료 핸들러
  const handleAddressComplete = (data) => {
    // 선택한 주소 정보 저장
    setSelectedAddress(data.address);
    setZonecode(data.zonecode);

    // 상세 주소 입력 필드에 포커스
    setTimeout(() => {
      if (detailAddressRef.current) {
        detailAddressRef.current.focus();
      }
    }, 100);
  };

  // 상세 주소 입력 핸들러
  const handleDetailAddressChange = (e) => {
    setDetailAddress(e.target.value);
  };

  // 주소 저장 핸들러
  const saveAddress = () => {
    // 선택한 주소와 상세 주소를 합쳐서 폼 데이터에 반영
    const fullAddress = detailAddress
      ? `(${zonecode}) ${selectedAddress}, ${detailAddress}`
      : `(${zonecode}) ${selectedAddress}`;

    handlePartyChange(currentEditingPartyIndex, "address", fullAddress);

    // 다이얼로그 닫기
    setIsAddressDialogOpen(false);
    toast.success("주소가 저장되었습니다");
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent">
          당사자 정보
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addParty}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
          당사자 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {formData.parties.map((party, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 relative bg-gray-50/50 dark:bg-gray-800/50 transition-all hover:border-gray-300 dark:hover:border-gray-600"
          >
            {formData.parties.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 h-8 w-8 p-0 text-gray-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                onClick={() => removeParty(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* 당사자 유형 뱃지 */}
            <div className="mb-4 flex space-x-2">
              <Badge
                className={`border-0 ${getPartyTypeBadgeColors(
                  formData.case_type,
                  party.party_type
                )}`}
              >
                {party.party_type === "plaintiff" || party.party_type === "creditor" ? (
                  <User className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {getPartyTypeLabel(formData.case_type, party.party_type)}
              </Badge>

              <Badge
                className={`border-0 ${
                  party.entity_type === "individual"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200"
                }`}
              >
                {party.entity_type === "individual" ? (
                  <>
                    <User className="mr-1 h-3 w-3" />
                    개인
                  </>
                ) : (
                  <>
                    <Building2 className="mr-1 h-3 w-3" />
                    법인/단체
                  </>
                )}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  당사자 유형
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={party.party_type}
                  onValueChange={(value) => handlePartyChange(index, "party_type", value)}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.case_type === "lawsuit" ? (
                      <>
                        <SelectItem value="plaintiff">
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 border-0">
                              <User className="mr-1 h-3 w-3" />
                              원고
                            </Badge>
                            원고
                          </div>
                        </SelectItem>
                        <SelectItem value="defendant">
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 border-0">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              피고
                            </Badge>
                            피고
                          </div>
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="creditor">
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 border-0">
                              <User className="mr-1 h-3 w-3" />
                              채권자
                            </Badge>
                            채권자
                          </div>
                        </SelectItem>
                        <SelectItem value="debtor">
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 border-0">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              채무자
                            </Badge>
                            채무자
                          </div>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  개인/법인 구분
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={party.entity_type}
                  onValueChange={(value) => handlePartyChange(index, "entity_type", value)}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="구분 선택" />
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
                    <SelectItem value="corporation">
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
            </div>

            {party.entity_type === "individual" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label
                    htmlFor={`name-${index}`}
                    className="text-sm font-medium flex items-center"
                  >
                    이름
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id={`name-${index}`}
                    value={party.name || ""}
                    onChange={(e) => handlePartyChange(index, "name", e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">주민등록번호</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-resident-number-${index}`}
                        checked={party.unknown_resident_number}
                        onCheckedChange={() => handleUnknownToggle(index, "resident_number")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-resident-number-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="주민등록번호를 입력하세요"
                    value={party.resident_number}
                    onChange={(e) => handlePartyChange(index, "resident_number", e.target.value)}
                    disabled={party.unknown_resident_number}
                    maxLength={14}
                    className={`bg-white dark:bg-gray-800 ${
                      party.unknown_resident_number ? "opacity-50" : ""
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">전화번호</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-phone-${index}`}
                        checked={party.unknown_phone}
                        onCheckedChange={() => handleUnknownToggle(index, "phone")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-phone-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="전화번호를 입력하세요"
                    value={party.phone}
                    onChange={(e) => handlePartyChange(index, "phone", e.target.value)}
                    disabled={party.unknown_phone}
                    className={`bg-white dark:bg-gray-800 ${
                      party.unknown_phone ? "opacity-50" : ""
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">이메일(선택)</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-email-${index}`}
                        checked={party.unknown_email}
                        onCheckedChange={() => handleUnknownToggle(index, "email")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-email-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="이메일을 입력하세요"
                    value={party.email}
                    onChange={(e) => handlePartyChange(index, "email", e.target.value)}
                    disabled={party.unknown_email}
                    className={`bg-white dark:bg-gray-800 ${
                      party.unknown_email ? "opacity-50" : ""
                    }`}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">주소</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-address-${index}`}
                        checked={party.unknown_address}
                        onCheckedChange={() => handleUnknownToggle(index, "address")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-address-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="주소를 검색하세요"
                      value={party.address}
                      disabled={true}
                      className={`flex-1 bg-white dark:bg-gray-800 ${
                        party.unknown_address ? "opacity-50" : ""
                      }`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openAddressDialog(index)}
                      disabled={party.unknown_address}
                      className="shrink-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MapPin className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label
                    htmlFor={`company-name-${index}`}
                    className="text-sm font-medium flex items-center"
                  >
                    회사명
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id={`company-name-${index}`}
                    value={party.company_name || ""}
                    onChange={(e) => handlePartyChange(index, "company_name", e.target.value)}
                    placeholder="회사명을 입력하세요"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">법인등록번호</Label>
                  <Input
                    placeholder="법인등록번호를 입력하세요"
                    value={party.corporate_number}
                    onChange={(e) => handlePartyChange(index, "corporate_number", e.target.value)}
                    maxLength={14}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">담당자 이름</Label>
                  <Input
                    placeholder="담당자 이름을 입력하세요"
                    value={party.name}
                    onChange={(e) => handlePartyChange(index, "name", e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">담당자 직위</Label>
                  <Input
                    placeholder="직위를 입력하세요"
                    value={party.position}
                    onChange={(e) => handlePartyChange(index, "position", e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">전화번호</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-phone-${index}`}
                        checked={party.unknown_phone}
                        onCheckedChange={() => handleUnknownToggle(index, "phone")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-phone-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="전화번호를 입력하세요"
                    value={party.phone}
                    onChange={(e) => handlePartyChange(index, "phone", e.target.value)}
                    disabled={party.unknown_phone}
                    className={`bg-white dark:bg-gray-800 ${
                      party.unknown_phone ? "opacity-50" : ""
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">이메일</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-email-${index}`}
                        checked={party.unknown_email}
                        onCheckedChange={() => handleUnknownToggle(index, "email")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-email-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="이메일을 입력하세요"
                    value={party.email}
                    onChange={(e) => handlePartyChange(index, "email", e.target.value)}
                    disabled={party.unknown_email}
                    className={`bg-white dark:bg-gray-800 ${
                      party.unknown_email ? "opacity-50" : ""
                    }`}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">주소</Label>
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        id={`unknown-address-${index}`}
                        checked={party.unknown_address}
                        onCheckedChange={() => handleUnknownToggle(index, "address")}
                        className="text-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor={`unknown-address-${index}`}
                        className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        모름
                      </label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="주소를 검색하세요"
                      value={party.address}
                      disabled={true}
                      className={`flex-1 bg-white dark:bg-gray-800 ${
                        party.unknown_address ? "opacity-50" : ""
                      }`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openAddressDialog(index)}
                      disabled={party.unknown_address}
                      className="shrink-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MapPin className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      {/* 주소 검색 다이얼로그 */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 border-0 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">주소 검색</DialogTitle>
          </DialogHeader>
          {!selectedAddress ? (
            <div className="h-[400px] overflow-hidden border border-gray-200 dark:border-gray-700 rounded-md">
              <DaumPostcode
                onComplete={handleAddressComplete}
                style={{ height: "100%", width: "100%" }}
                theme={{ bgColor: "#fff" }}
              />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">기본 주소</Label>
                <Input
                  value={`(${zonecode}) ${selectedAddress}`}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">상세 주소</Label>
                <Input
                  placeholder="상세 주소를 입력하세요"
                  value={detailAddress}
                  onChange={handleDetailAddressChange}
                  ref={detailAddressRef}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          )}
          {selectedAddress && (
            <DialogFooter>
              <Button
                type="button"
                onClick={saveAddress}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-sm"
              >
                <MapPin className="mr-2 h-4 w-4" />
                주소 저장
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
