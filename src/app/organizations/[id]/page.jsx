"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { format } from "date-fns";
import ko from "date-fns/locale/ko";
import { toast } from "sonner";
import Link from "next/link";
import DaumPostcode from "react-daum-postcode";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  ChevronLeft,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Users,
  Mail,
  Phone,
  MapPin,
  ClipboardList,
  Star,
  User,
  UserRoundCog,
  CircleCheck,
  ChevronRight,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAdmin } = useUser();
  const organizationId = params.id;

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [isEditOrgDialogOpen, setIsEditOrgDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberFormData, setMemberFormData] = useState({
    user_id: "",
    position: "",
    role: "member",
    is_primary: false,
  });

  // 주소 검색 관련 상태
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [zonecode, setZonecode] = useState("");
  const detailAddressRef = useRef(null);

  const [orgFormData, setOrgFormData] = useState({
    name: "",
    business_number: "",
    address: "",
    phone: "",
    email: "",
    representative_name: "",
    representative_position: "",
  });

  const [tab, setTab] = useState("members");

  // 페이지 접근 제한 - 관리자만 접근 가능
  useEffect(() => {
    if (user && !isAdmin()) {
      toast.error("관리자만 접근할 수 있는 페이지입니다");
      router.push("/");
    }
  }, [user, isAdmin, router]);

  // 조직 정보 및 구성원 불러오기
  useEffect(() => {
    if (user && isAdmin() && organizationId) {
      fetchOrganizationDetails();
      fetchAllUsers();
    }
  }, [user, isAdmin, organizationId]);

  const fetchOrganizationDetails = async () => {
    setLoading(true);
    try {
      // 조직 정보 가져오기
      const { data: orgData, error: orgError } = await supabase
        .from("test_organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (orgError) throw orgError;

      // 구성원 정보 가져오기
      const { data: membersData, error: membersError } = await supabase
        .from("test_organization_members")
        .select(
          `
          *,
          user:user_id(
            id, 
            name, 
            email, 
            phone_number,
            profile_image,
            role
          )
        `
        )
        .eq("organization_id", organizationId)
        .order("is_primary", { ascending: false });

      if (membersError) throw membersError;

      setOrganization(orgData);
      setOrgFormData({
        name: orgData.name || "",
        business_number: orgData.business_number || "",
        address: orgData.address || "",
        phone: orgData.phone || "",
        email: orgData.email || "",
        representative_name: orgData.representative_name || "",
        representative_position: orgData.representative_position || "",
      });
      setMembers(membersData || []);
    } catch (error) {
      console.error("조직 정보 로딩 중 오류 발생:", error);
      toast.error("조직 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, phone_number, profile_image, role")
        .order("name");

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("사용자 정보 로딩 중 오류 발생:", error);
      toast.error("사용자 정보를 불러오는데 실패했습니다");
    }
  };

  // 멤버 추가 핸들러
  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!memberFormData.user_id) {
      toast.error("사용자를 선택해주세요");
      return;
    }

    try {
      // 이미 멤버인지 확인
      const existingMember = members.find((m) => m.user_id === memberFormData.user_id);
      if (existingMember) {
        toast.error("이미 조직에 등록된 사용자입니다");
        return;
      }

      const { data, error } = await supabase.from("test_organization_members").insert([
        {
          organization_id: organizationId,
          user_id: memberFormData.user_id,
          position: memberFormData.position || null,
          role: memberFormData.role || "member",
          is_primary: memberFormData.is_primary || false,
        },
      ]).select(`
          *,
          user:user_id(
            id, 
            name, 
            email, 
            phone_number,
            profile_image,
            role
          )
        `);

      if (error) throw error;

      toast.success("구성원이 성공적으로 추가되었습니다");
      setIsMemberDialogOpen(false);
      setMembers([...members, ...data]);
      setMemberFormData({
        user_id: "",
        position: "",
        role: "member",
        is_primary: false,
      });
    } catch (error) {
      console.error("구성원 추가 중 오류 발생:", error);
      toast.error("구성원 추가에 실패했습니다");
    }
  };

  // 멤버 수정 핸들러
  const handleEditMember = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("test_organization_members")
        .update({
          position: memberFormData.position,
          role: memberFormData.role,
          is_primary: memberFormData.is_primary,
        })
        .eq("id", selectedMember.id).select(`
          *,
          user:user_id(
            id, 
            name, 
            email, 
            phone_number,
            profile_image,
            role
          )
        `);

      if (error) throw error;

      toast.success("구성원 정보가 성공적으로 수정되었습니다");
      setIsEditMemberDialogOpen(false);

      // 멤버 목록 업데이트
      const updatedMembers = members.map((m) => (m.id === selectedMember.id ? data[0] : m));
      setMembers(updatedMembers);
    } catch (error) {
      console.error("구성원 정보 수정 중 오류 발생:", error);
      toast.error("구성원 정보 수정에 실패했습니다");
    }
  };

  // 멤버 삭제 핸들러
  const handleRemoveMember = async (memberId) => {
    try {
      const { error } = await supabase
        .from("test_organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("구성원이 성공적으로 제거되었습니다");

      // 멤버 목록 업데이트
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error("구성원 제거 중 오류 발생:", error);
      toast.error("구성원 제거에 실패했습니다");
    }
  };

  // 폼 데이터 변경 핸들러
  const handleMemberFormChange = (name, value) => {
    setMemberFormData({
      ...memberFormData,
      [name]: value,
    });
  };

  // 멤버 수정 다이얼로그 열기
  const openEditMemberDialog = (member) => {
    setSelectedMember(member);
    setMemberFormData({
      user_id: member.user_id,
      position: member.position || "",
      role: member.role || "member",
      is_primary: member.is_primary || false,
    });
    setIsEditMemberDialogOpen(true);
  };

  // 사용자 검색 필터링
  const filteredUsers = allUsers.filter(
    (user) =>
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 조직 정보 수정 다이얼로그 열기
  const openEditOrgDialog = () => {
    setIsEditOrgDialogOpen(true);
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

    setOrgFormData({
      ...orgFormData,
      address: fullAddress,
    });

    // 다이얼로그 닫기
    setIsAddressDialogOpen(false);
    toast.success("주소가 저장되었습니다");
  };

  // 조직 정보 변경 핸들러
  const handleOrgFormChange = (e) => {
    const { name, value } = e.target;
    setOrgFormData({
      ...orgFormData,
      [name]: value,
    });
  };

  // 조직 정보 수정 핸들러
  const handleEditOrg = async (e) => {
    e.preventDefault();

    if (!orgFormData.name.trim()) {
      toast.error("조직명은 필수 입력항목입니다");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("test_organizations")
        .update({
          name: orgFormData.name,
          business_number: orgFormData.business_number,
          address: orgFormData.address,
          phone: orgFormData.phone,
          email: orgFormData.email,
          representative_name: orgFormData.representative_name,
          representative_position: orgFormData.representative_position,
        })
        .eq("id", organizationId)
        .select();

      if (error) throw error;

      toast.success("조직 정보가 성공적으로 수정되었습니다");
      setIsEditOrgDialogOpen(false);
      setOrganization({
        ...organization,
        ...orgFormData,
      });
    } catch (error) {
      console.error("조직 정보 수정 중 오류 발생:", error);
      toast.error("조직 정보 수정에 실패했습니다");
    }
  };

  // 로딩 중 UI
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex items-center mb-6">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-8 w-40 ml-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-[270px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          조직을 찾을 수 없습니다
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          요청하신 조직 정보를 찾을 수 없습니다. 삭제되었거나 잘못된 접근입니다.
        </p>
        <Button asChild>
          <Link href="/organizations">
            <ChevronLeft className="mr-2 h-4 w-4" />
            조직 목록으로 돌아가기
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-6">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Button variant="outline" size="sm" asChild className="mr-4">
              <Link href="/organizations">
                <ChevronLeft className="mr-2 h-4 w-4" />
                뒤로가기
              </Link>
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent">
              {organization.name}
            </h1>
            {organization.business_number && (
              <Badge variant="secondary" className="ml-2 bg-gray-100 dark:bg-gray-800">
                법인번호: {organization.business_number}
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              onClick={() => router.push(`/organizations`)}
            >
              조직 목록
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-sm"
              onClick={openEditOrgDialog}
            >
              <Edit className="mr-2 h-4 w-4" />
              조직 정보 수정
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 조직 정보 카드 */}
          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">조직 정보</CardTitle>
              <CardDescription>기본 정보 및 연락처</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">조직명</p>
                    <p className="font-medium">{organization.name}</p>
                  </div>
                </div>

                {organization.representative_name && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">대표자</p>
                      <p className="font-medium">
                        {organization.representative_name}
                        {organization.representative_position && (
                          <span className="text-sm text-gray-500 ml-1">
                            ({organization.representative_position})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {organization.business_number && (
                  <div className="flex items-center">
                    <ClipboardList className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">법인번호</p>
                      <p className="font-medium">{organization.business_number}</p>
                    </div>
                  </div>
                )}

                {organization.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">전화번호</p>
                      <p className="font-medium">{organization.phone}</p>
                    </div>
                  </div>
                )}

                {organization.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">이메일</p>
                      <p className="font-medium">{organization.email}</p>
                    </div>
                  </div>
                )}

                {organization.address && (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">주소</p>
                      <p className="font-medium">{organization.address}</p>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">구성원</p>
                    <p className="font-medium">{members.length}명</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">등록일</p>
                    <p className="font-medium">
                      {format(new Date(organization.created_at), "yyyy년 MM월 dd일", {
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 구성원 목록 */}
          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">구성원 관리</CardTitle>
                  <CardDescription>조직의 구성원을 관리합니다</CardDescription>
                </div>
                <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-sm"
                    >
                      <Plus className="mr-2 h-4 w-4" /> 구성원 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>구성원 추가</DialogTitle>
                      <DialogDescription>조직에 새 구성원을 추가합니다.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMember}>
                      <div className="py-4">
                        <div className="mb-4">
                          <Label className="mb-2 block">사용자 선택</Label>
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="이름 또는 이메일로 검색"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto border rounded-md">
                            {filteredUsers.length === 0 ? (
                              <div className="p-3 text-center text-gray-500">
                                검색 결과가 없습니다
                              </div>
                            ) : (
                              <div className="divide-y">
                                {filteredUsers.map((u) => (
                                  <div
                                    key={u.id}
                                    className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                                      memberFormData.user_id === u.id
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : ""
                                    }`}
                                    onClick={() => handleMemberFormChange("user_id", u.id)}
                                  >
                                    <Avatar className="h-9 w-9 mr-3">
                                      <AvatarImage src={u.profile_image} />
                                      <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        {u.name
                                          ?.split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()
                                          .substring(0, 2) || "??"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-medium">{u.name}</p>
                                      <p className="text-xs text-gray-500">{u.email}</p>
                                    </div>
                                    {memberFormData.user_id === u.id && (
                                      <BadgeCheck className="h-5 w-5 text-blue-500" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="position" className="mb-2 block">
                            직위
                          </Label>
                          <Input
                            id="position"
                            value={memberFormData.position}
                            onChange={(e) => handleMemberFormChange("position", e.target.value)}
                            placeholder="직위 (예: 대리, 과장)"
                          />
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="role" className="mb-2 block">
                            역할
                          </Label>
                          <Select
                            value={memberFormData.role}
                            onValueChange={(value) => handleMemberFormChange("role", value)}
                          >
                            <SelectTrigger id="role">
                              <SelectValue placeholder="역할 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">관리자</SelectItem>
                              <SelectItem value="staff">직원</SelectItem>
                              <SelectItem value="member">일반 구성원</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_primary"
                            checked={memberFormData.is_primary}
                            onChange={(e) => handleMemberFormChange("is_primary", e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                          />
                          <Label htmlFor="is_primary" className="cursor-pointer">
                            주 담당자로 지정
                          </Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsMemberDialogOpen(false)}
                        >
                          취소
                        </Button>
                        <Button type="submit" disabled={!memberFormData.user_id}>
                          추가
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                    등록된 구성원이 없습니다
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                    상단의 '구성원 추가' 버튼을 클릭하여 조직 구성원을 등록해보세요
                  </p>
                  <Button onClick={() => setIsMemberDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> 구성원 추가
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <TableHead style={{ width: "40%" }}>사용자</TableHead>
                        <TableHead style={{ width: "20%" }}>직위</TableHead>
                        <TableHead style={{ width: "20%" }}>역할</TableHead>
                        <TableHead style={{ width: "10%" }}>상태</TableHead>
                        <TableHead style={{ width: "10%" }} className="text-right">
                          관리
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow
                          key={member.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-9 w-9 mr-3">
                                <AvatarImage src={member.user?.profile_image} />
                                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  {member.user?.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .substring(0, 2) || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.user?.name}</p>
                                <p className="text-xs text-gray-500">{member.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.position || <span className="text-gray-400">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                member.role === "admin"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
                                  : member.role === "staff"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                              }
                            >
                              {member.role === "admin"
                                ? "관리자"
                                : member.role === "staff"
                                ? "직원"
                                : "구성원"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.is_primary && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50">
                                <Star className="mr-1 h-3 w-3" /> 주담당자
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-50 hover:opacity-100 transition-opacity rounded-full w-8 h-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  className="cursor-pointer flex items-center"
                                  onClick={() => openEditMemberDialog(member)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  수정
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer flex items-center text-red-500 dark:text-red-400"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  제거
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 구성원 수정 다이얼로그 */}
      <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>구성원 정보 수정</DialogTitle>
            <DialogDescription>
              {selectedMember?.user?.name} 님의 조직 내 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditMember}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-position">직위</Label>
                <Input
                  id="edit-position"
                  value={memberFormData.position}
                  onChange={(e) => handleMemberFormChange("position", e.target.value)}
                  placeholder="직위 (예: 대리, 과장)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">역할</Label>
                <Select
                  value={memberFormData.role}
                  onValueChange={(value) => handleMemberFormChange("role", value)}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="staff">직원</SelectItem>
                    <SelectItem value="member">일반 구성원</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_primary"
                  checked={memberFormData.is_primary}
                  onChange={(e) => handleMemberFormChange("is_primary", e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <Label htmlFor="edit-is_primary" className="cursor-pointer">
                  주 담당자로 지정
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditMemberDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit">수정</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 조직 정보 수정 다이얼로그 */}
      <Dialog open={isEditOrgDialogOpen} onOpenChange={setIsEditOrgDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>조직 정보 수정</DialogTitle>
            <DialogDescription>
              조직의 정보를 수정합니다. 조직명은 필수 입력 항목입니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditOrg}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-name" className="text-right">
                  조직명 *
                </Label>
                <Input
                  id="org-name"
                  name="name"
                  className="col-span-3"
                  value={orgFormData.name}
                  onChange={handleOrgFormChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-business_number" className="text-right">
                  법인번호
                </Label>
                <Input
                  id="org-business_number"
                  name="business_number"
                  className="col-span-3"
                  value={orgFormData.business_number}
                  onChange={handleOrgFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-address" className="text-right">
                  주소
                </Label>
                <div className="col-span-3 flex space-x-2">
                  <Input
                    id="org-address"
                    name="address"
                    value={orgFormData.address}
                    onChange={handleOrgFormChange}
                    className="flex-1"
                    placeholder="주소 검색을 클릭하세요"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={openAddressDialog}
                    className="shrink-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <MapPin className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-phone" className="text-right">
                  전화번호
                </Label>
                <Input
                  id="org-phone"
                  name="phone"
                  className="col-span-3"
                  value={orgFormData.phone}
                  onChange={handleOrgFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-email" className="text-right">
                  이메일
                </Label>
                <Input
                  id="org-email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  value={orgFormData.email}
                  onChange={handleOrgFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-representative_name" className="text-right">
                  대표자명
                </Label>
                <Input
                  id="org-representative_name"
                  name="representative_name"
                  className="col-span-3"
                  value={orgFormData.representative_name}
                  onChange={handleOrgFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org-representative_position" className="text-right">
                  대표자 직위
                </Label>
                <Input
                  id="org-representative_position"
                  name="representative_position"
                  className="col-span-3"
                  value={orgFormData.representative_position}
                  onChange={handleOrgFormChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOrgDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit">수정</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
