"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FileUploadDropzone from "@/components/ui/file-upload-dropzone";
import { ChevronLeft, Save, Trash2, MapPin, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DaumPostcode from "react-daum-postcode";
import { toast } from "sonner";

export default function ClientEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const isNewClient = id === "new";

  const [client, setClient] = useState({
    name: "",
    email: "",
    phone_number: "",
    resident_number: "",
    address: "",
    role: "client", // 기본값은 의뢰인
  });

  const [loading, setLoading] = useState(!isNewClient);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [idCardFile, setIdCardFile] = useState(null);

  // 주소 검색 관련 상태
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [zonecode, setZonecode] = useState("");
  const detailAddressRef = useRef(null);

  // 의뢰인 정보 불러오기
  useEffect(() => {
    if (isNewClient) return;

    async function fetchClientData() {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", id).single();

        if (error) throw error;

        setClient(data || {});
      } catch (error) {
        console.error("의뢰인 정보 불러오기 오류:", error.message);
        toast.error("의뢰인 정보를 불러오는데 실패했습니다.");
        router.push("/admin/clients");
      } finally {
        setLoading(false);
      }
    }

    fetchClientData();
  }, [id, isNewClient, router]);

  // 입력 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  // 주민등록번호 포맷팅
  const formatResidentNumber = (value) => {
    if (!value) return "";

    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 6) {
      return numbers;
    } else {
      return `${numbers.slice(0, 6)}-${numbers.slice(6, 13)}`;
    }
  };

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";

    // 숫자만 추출
    const numbers = phone.replace(/\D/g, "");

    // 길이에 따라 포맷팅
    if (numbers.length >= 3 && numbers.length <= 6) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length >= 7 && numbers.length <= 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length >= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }

    return numbers;
  };

  // 주민등록번호 입력 처리
  const handleResidentNumberChange = (e) => {
    const formatted = formatResidentNumber(e.target.value);
    setClient((prev) => ({ ...prev, resident_number: formatted }));
  };

  // 전화번호 입력 처리
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setClient((prev) => ({ ...prev, phone_number: formatted }));
  };

  // 신분증 파일 선택 처리
  const handleFileSelect = (file) => {
    setIdCardFile(file);
  };

  // 신분증 파일 제거
  const handleFileRemove = () => {
    setIdCardFile(null);
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
    const fullAddress = detailAddress ? `${selectedAddress}, ${detailAddress}` : selectedAddress;

    setClient((prev) => ({
      ...prev,
      address: fullAddress,
    }));

    // 다이얼로그 닫기
    setIsAddressDialogOpen(false);
    toast.success("주소가 저장되었습니다");
  };

  // 의뢰인 정보 저장
  const handleSave = async () => {
    // 필수 필드 검증
    if (!client.name) {
      toast.error("이름은 필수 입력 항목입니다.");
      return;
    }

    if (!client.email) {
      toast.error("이메일은 필수 입력 항목입니다.");
      return;
    }

    try {
      setSaving(true);

      // 신분증 이미지 업로드 (있는 경우)
      let id_card_url = client.id_card_url;
      if (idCardFile) {
        const fileExt = idCardFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${isNewClient ? "new" : id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("client-id-cards")
          .upload(filePath, idCardFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 파일 공개 URL 가져오기
        const { data: urlData } = await supabase.storage
          .from("client-id-cards")
          .getPublicUrl(filePath);

        id_card_url = urlData.publicUrl;
      }

      const clientData = {
        name: client.name,
        email: client.email,
        phone_number: client.phone_number,
        resident_number: client.resident_number,
        address: client.address,
        role: client.role,
        id_card_url,
        id_card_verified: false,
        // 새 의뢰인인 경우 생성 시간 추가
        ...(isNewClient && { created_at: new Date().toISOString() }),
      };

      let result;
      if (isNewClient) {
        // 새 의뢰인 생성
        result = await supabase.from("users").insert(clientData).select();
      } else {
        // 기존 의뢰인 수정
        result = await supabase.from("users").update(clientData).eq("id", id).select();
      }

      if (result.error) throw result.error;

      toast.success(`의뢰인이 ${isNewClient ? "등록" : "수정"}되었습니다.`);
      router.push("/admin/clients");
    } catch (error) {
      console.error("의뢰인 저장 오류:", error.message);
      toast.error(`의뢰인 ${isNewClient ? "등록" : "수정"} 중 오류가 발생했습니다.`);
    } finally {
      setSaving(false);
    }
  };

  // 의뢰인 삭제
  const handleDelete = async () => {
    if (isNewClient) return;

    try {
      setSaving(true);

      // 의뢰인 삭제
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) throw error;

      toast.success("의뢰인이 삭제되었습니다.");
      router.push("/admin/clients");
    } catch (error) {
      console.error("의뢰인 삭제 오류:", error.message);
      toast.error("의뢰인 삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-64">
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push("/admin/clients")} className="mr-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          뒤로 가기
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">
          {isNewClient ? "새 사용자 등록" : "사용자 정보 수정"}
        </h1>
        {!isNewClient && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={saving}
            className="ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>사용자의 기본 정보를 입력해주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                value={client.name}
                onChange={handleChange}
                placeholder="이름 입력"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">역할</Label>
              <Select
                value={client.role}
                onValueChange={(value) => setClient({ ...client, role: value })}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">의뢰인</SelectItem>
                  <SelectItem value="staff">직원</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={client.email}
                onChange={handleChange}
                placeholder="이메일 주소 입력"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">연락처</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={client.phone_number}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          {/* 주민등록번호 & 신분증 업로드 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resident_number">주민등록번호</Label>
              <Input
                id="resident_number"
                name="resident_number"
                value={client.resident_number || ""}
                onChange={handleResidentNumberChange}
                placeholder="예: 000000-0000000"
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label>주소</Label>
              <div className="flex gap-2">
                <Input
                  value={client.address || ""}
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

            <div className="space-y-2">
              <Label>신분증 이미지</Label>
              <FileUploadDropzone
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                selectedFile={idCardFile}
                existingFileUrl={client.id_card_url}
                fileUrlLabel="등록된 신분증 이미지가 있습니다"
                uploadLabel="신분증 이미지를 이곳에 끌어서 놓거나 클릭하여 업로드"
                replaceLabel="새 신분증 이미지를 이곳에 끌어서 놓거나 클릭하여 교체"
                accept="image/*"
                maxSizeMB={5}
                id="id-card-upload"
              />
              {client.id_card_verified && (
                <div className="mt-1 flex items-center text-sm text-green-600">
                  <Check className="h-4 w-4 mr-1" />
                  <span>인증 완료</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/admin/clients")} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        </CardFooter>
      </Card>

      {/* 주소 검색 다이얼로그 */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>주소 검색</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedAddress ? (
              <DaumPostcode onComplete={handleAddressComplete} />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="selected_address">선택한 주소</Label>
                  <Input id="selected_address" value={selectedAddress} readOnly />
                </div>
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>의뢰인 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 의뢰인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between space-x-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
