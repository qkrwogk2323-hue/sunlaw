"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, MapPin, User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import DaumPostcode from "react-daum-postcode";

export default function PartyManageModal({
  open,
  onOpenChange,
  partyType,
  setPartyType,
  entityType,
  setEntityType,
  name,
  setName,
  companyName,
  setCompanyName,
  phone,
  setPhone,
  email,
  setEmail,
  handleAddParty,
  handleEditParty,
  editMode = false,
  editPartyId = null,
  address,
  setAddress,
  clients = [],
}) {
  // 주소 검색 관련 상태
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [zonecode, setZonecode] = useState("");
  const detailAddressRef = useRef(null);

  // 추가 정보 상태
  const [residentNumber, setResidentNumber] = useState(""); // 주민등록번호
  const [corporateNumber, setCorporateNumber] = useState(""); // 법인등록번호
  const [position, setPosition] = useState(""); // 직위 (법인의 경우 담당자 직책)

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

  // 법인등록번호 포맷팅 함수
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

  // 전화번호 입력 처리
  const handlePhoneChange = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhone(formattedPhone);
  };

  // 주민등록번호 입력 처리
  const handleResidentNumberChange = (e) => {
    const formattedNumber = formatResidentNumber(e.target.value);
    setResidentNumber(formattedNumber);
  };

  // 법인등록번호 입력 처리
  const handleCorporateNumberChange = (e) => {
    const formattedNumber = formatCorporateNumber(e.target.value);
    setCorporateNumber(formattedNumber);
  };

  // 주소 검색 다이얼로그 열기
  const openAddressDialog = () => {
    setSelectedAddress("");
    setDetailAddress("");
    setZonecode("");
    setIsAddressDialogOpen(true);
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

    setAddress(fullAddress);

    // 다이얼로그 닫기
    setIsAddressDialogOpen(false);
    toast.success("주소가 저장되었습니다");
  };

  // 의뢰인 정보로 당사자 정보 복사 핸들러
  const copyFromClient = (client) => {
    console.log("복사 대상 의뢰인 데이터:", client);

    // 의뢰인 종류에 따라 당사자 구분 설정
    const newEntityType = client.client_type === "individual" ? "individual" : "corporation";
    setEntityType(newEntityType);

    if (client.client_type === "individual") {
      // 개인 의뢰인 정보
      setName(client.individual_name || "");
      setCompanyName("");
      setCorporateNumber("");
      setResidentNumber(client.resident_number || ""); // 주민등록번호 복사
      setPosition("");
    } else {
      // 법인/단체 의뢰인 정보
      setCompanyName(client.organization_name || "");
      setName(client.representative_name || ""); // 대표자명
      setCorporateNumber(client.business_number || ""); // 사업자등록번호를 법인번호에 설정
      setPosition(client.representative_position || ""); // 대표자 직위
    }

    // 공통 정보 설정
    setPhone(client.phone || "");
    setEmail(client.email || "");
    setAddress(client.address || "");

    // 디버깅 정보: 복사 후 상태 확인
    setTimeout(() => {
      console.log("복사 후 당사자 데이터:", {
        entityType: newEntityType,
        name,
        companyName,
        phone,
        email,
        address,
        residentNumber,
        corporateNumber,
        position,
      });
    }, 100);

    toast.success("의뢰인 정보가 복사되었습니다");
  };

  // 당사자 추가/수정 전 데이터 수집
  const collectAndSaveParty = () => {
    // 당사자 데이터 수집
    const partyData = {
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
    };

    console.log("저장할 당사자 데이터:", partyData);

    // 당사자 추가 또는 수정 처리
    if (editMode && editPartyId) {
      handleEditParty(editPartyId, partyData);
    } else {
      handleAddParty(partyData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editMode ? "당사자 수정" : "당사자 추가"}</DialogTitle>
          <DialogDescription>
            {editMode
              ? "이 사건의 당사자 정보를 수정합니다."
              : "이 사건의 당사자 정보를 추가합니다."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
            <div className="space-y-2">
              <Label htmlFor="party_type">당사자 유형</Label>
              <Select value={partyType} onValueChange={setPartyType}>
                <SelectTrigger>
                  <SelectValue placeholder="당사자 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plaintiff">원고</SelectItem>
                  <SelectItem value="defendant">피고</SelectItem>
                  <SelectItem value="creditor">채권자</SelectItem>
                  <SelectItem value="debtor">채무자</SelectItem>
                  <SelectItem value="applicant">신청인</SelectItem>
                  <SelectItem value="respondent">피신청인</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity_type">개인/법인 구분</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="개인/법인 구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">개인</SelectItem>
                  <SelectItem value="corporation">법인/단체</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 의뢰인 정보 복사 버튼 */}
          {clients && clients.length > 0 && (
            <div className="mb-4 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    의뢰인 정보 복사하기
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {clients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => copyFromClient(client)}
                      className="cursor-pointer"
                    >
                      {client.client_type === "individual" ? (
                        <User className="h-4 w-4 mr-2 text-blue-500" />
                      ) : (
                        <Building2 className="h-4 w-4 mr-2 text-amber-500" />
                      )}
                      {client.client_type === "individual"
                        ? client.individual_name
                        : client.organization_name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* 개인 정보 */}
          {entityType === "individual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름 입력"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resident_number">주민등록번호</Label>
                  <Input
                    id="resident_number"
                    value={residentNumber}
                    onChange={handleResidentNumberChange}
                    placeholder="000000-0000000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 법인/단체 정보 */}
          {entityType === "corporation" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="company_name">법인/단체명</Label>
                  <Input
                    id="company_name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="법인/단체명 입력"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corporate_number">법인등록번호</Label>
                  <Input
                    id="corporate_number"
                    value={corporateNumber}
                    onChange={handleCorporateNumberChange}
                    placeholder="000000-0000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name">대표자 이름</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="대표자 이름 입력"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">대표자 직위</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="예: 대표이사, 이사장 등"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 공통 정보 */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="010-0000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={address}
                  readOnly
                  placeholder="주소 검색을 눌러주세요"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={openAddressDialog}>
                  <MapPin className="h-4 w-4 mr-2" />
                  주소 검색
                </Button>
              </div>
            </div>

            <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>주소 검색</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <DaumPostcode onComplete={handleAddressComplete} />
                  {selectedAddress && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="detail_address">상세 주소</Label>
                        <Input
                          id="detail_address"
                          ref={detailAddressRef}
                          value={detailAddress}
                          onChange={handleDetailAddressChange}
                          placeholder="상세 주소 입력"
                        />
                      </div>
                      <Button onClick={saveAddress} className="w-full">
                        주소 저장
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={collectAndSaveParty}>{editMode ? "수정" : "추가"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
