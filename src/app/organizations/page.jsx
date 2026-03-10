"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { format } from "date-fns";
import ko from "date-fns/locale/ko";
import { toast } from "sonner";
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
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Users,
  ChevronRight,
  AlertCircle,
  MapPin,
} from "lucide-react";

export default function OrganizationsPage() {
  const router = useRouter();
  const { user, isAdmin } = useUser();

  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentOrganization, setCurrentOrganization] = useState(null);

  // 주소 검색 관련 상태
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isEditingCreate, setIsEditingCreate] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [zonecode, setZonecode] = useState("");
  const detailAddressRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    business_number: "",
    address: "",
    phone: "",
    email: "",
    representative_name: "",
    representative_position: "",
  });

  // 페이지 접근 제한 - 관리자만 접근 가능
  useEffect(() => {
    if (user && !isAdmin()) {
      toast.error("관리자만 접근할 수 있는 페이지입니다");
      router.push("/");
    }
  }, [user, isAdmin, router]);

  // 조직 목록 불러오기
  useEffect(() => {
    if (user && isAdmin()) {
      fetchOrganizations();
    }
  }, [user, isAdmin]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_organizations")
        .select(
          `
          *,
          members:test_organization_members(
            id,
            user_id,
            position,
            role,
            is_primary
          )
        `
        )
        .order("name");

      if (error) throw error;

      setOrganizations(data || []);
    } catch (error) {
      console.error("조직 정보 로딩 중 오류 발생:", error);
      toast.error("조직 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.business_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.representative_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 폼 데이터 변경 핸들러
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // 주소 검색 다이얼로그 열기
  const openAddressDialog = (isCreate = true) => {
    setIsEditingCreate(isCreate);
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

    setFormData({
      ...formData,
      address: fullAddress,
    });

    // 다이얼로그 닫기
    setIsAddressDialogOpen(false);
    toast.success("주소가 저장되었습니다");
  };

  // 폼 제출 핸들러 - 생성
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("조직명은 필수 입력항목입니다");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("test_organizations")
        .insert([
          {
            name: formData.name,
            business_number: formData.business_number,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            representative_name: formData.representative_name,
            representative_position: formData.representative_position,
          },
        ])
        .select();

      if (error) throw error;

      toast.success("조직이 성공적으로 생성되었습니다");
      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        business_number: "",
        address: "",
        phone: "",
        email: "",
        representative_name: "",
        representative_position: "",
      });
      fetchOrganizations();
    } catch (error) {
      console.error("조직 생성 중 오류 발생:", error);
      toast.error("조직 생성에 실패했습니다");
    }
  };

  // 폼 제출 핸들러 - 수정
  const handleEdit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("조직명은 필수 입력항목입니다");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("test_organizations")
        .update({
          name: formData.name,
          business_number: formData.business_number,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          representative_name: formData.representative_name,
          representative_position: formData.representative_position,
        })
        .eq("id", currentOrganization.id)
        .select();

      if (error) throw error;

      toast.success("조직 정보가 성공적으로 수정되었습니다");
      setIsEditDialogOpen(false);
      fetchOrganizations();
    } catch (error) {
      console.error("조직 정보 수정 중 오류 발생:", error);
      toast.error("조직 정보 수정에 실패했습니다");
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    try {
      // 먼저 조직 멤버를 모두 삭제
      const { error: memberError } = await supabase
        .from("test_organization_members")
        .delete()
        .eq("organization_id", currentOrganization.id);

      if (memberError) throw memberError;

      // 그 다음 조직 삭제
      const { error } = await supabase
        .from("test_organizations")
        .delete()
        .eq("id", currentOrganization.id);

      if (error) throw error;

      toast.success("조직이 성공적으로 삭제되었습니다");
      setIsDeleteDialogOpen(false);
      fetchOrganizations();
    } catch (error) {
      console.error("조직 삭제 중 오류 발생:", error);
      toast.error("조직 삭제에 실패했습니다");
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (org) => {
    setCurrentOrganization(org);
    setFormData({
      name: org.name || "",
      business_number: org.business_number || "",
      address: org.address || "",
      phone: org.phone || "",
      email: org.email || "",
      representative_name: org.representative_name || "",
      representative_position: org.representative_position || "",
    });
    setIsEditDialogOpen(true);
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (org) => {
    setCurrentOrganization(org);
    setIsDeleteDialogOpen(true);
  };

  // 조직 상세 페이지로 이동
  const goToDetail = (id) => {
    router.push(`/organizations/${id}`);
  };

  // 로딩 중 UI
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-6 w-1/3" />

          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-24" />
          </div>

          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent mb-2">
            조직 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            총 {organizations.length}개의 조직을 관리하고 있습니다
          </p>
        </div>

        {/* 검색 및 생성 버튼 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-1/2 lg:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="조직명, 법인 번호, 대표자명으로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-md">
                <Plus className="mr-2 h-4 w-4" /> 새 조직 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>새 조직 추가</DialogTitle>
                <DialogDescription>
                  새로운 조직의 정보를 입력해주세요. 조직명은 필수 입력 항목입니다.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      조직명 *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      className="col-span-3"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="business_number" className="text-right">
                      법인번호
                    </Label>
                    <Input
                      id="business_number"
                      name="business_number"
                      className="col-span-3"
                      value={formData.business_number}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="address" className="text-right">
                      주소
                    </Label>
                    <div className="col-span-3 flex space-x-2">
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                        className="flex-1"
                        placeholder="주소 검색을 클릭하세요"
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openAddressDialog(true)}
                        className="shrink-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MapPin className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                      전화번호
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      className="col-span-3"
                      value={formData.phone}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      이메일
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      className="col-span-3"
                      value={formData.email}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="representative_name" className="text-right">
                      대표자명
                    </Label>
                    <Input
                      id="representative_name"
                      name="representative_name"
                      className="col-span-3"
                      value={formData.representative_name}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="representative_position" className="text-right">
                      대표자 직위
                    </Label>
                    <Input
                      id="representative_position"
                      name="representative_position"
                      className="col-span-3"
                      value={formData.representative_position}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit">추가</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 조직 목록 */}
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
          <CardContent className="p-0">
            {filteredOrganizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchTerm ? "검색 결과가 없습니다" : "등록된 조직이 없습니다"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  {searchTerm
                    ? "검색어를 변경하거나 새 조직을 추가해보세요"
                    : "오른쪽 상단의 '새 조직 추가' 버튼을 클릭하여 첫 조직을 등록해보세요"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <TableHead>조직명</TableHead>
                      <TableHead>대표자</TableHead>
                      <TableHead>법인번호</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>구성원</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead className="w-[80px]">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizations.map((org) => (
                      <TableRow
                        key={org.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                        onClick={() => goToDetail(org.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Building2 className="mr-2 h-4 w-4 text-gray-500" />
                            {org.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.representative_name ? (
                            <div className="flex items-center">
                              {org.representative_name}
                              {org.representative_position && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({org.representative_position})
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{org.business_number || "-"}</TableCell>
                        <TableCell>{org.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="mr-1 h-3 w-3 text-gray-500" />
                            <span>{org.members?.length || 0}명</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {format(new Date(org.created_at), "yyyy.MM.dd", {
                            locale: ko,
                          })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(org);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer flex items-center text-red-500 dark:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(org);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
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

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>조직 정보 수정</DialogTitle>
            <DialogDescription>
              조직의 정보를 수정합니다. 조직명은 필수 입력 항목입니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  조직명 *
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  className="col-span-3"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-business_number" className="text-right">
                  법인번호
                </Label>
                <Input
                  id="edit-business_number"
                  name="business_number"
                  className="col-span-3"
                  value={formData.business_number}
                  onChange={handleFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-address" className="text-right">
                  주소
                </Label>
                <div className="col-span-3 flex space-x-2">
                  <Input
                    id="edit-address"
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    className="flex-1"
                    placeholder="주소 검색을 클릭하세요"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openAddressDialog(false)}
                    className="shrink-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <MapPin className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">
                  전화번호
                </Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  className="col-span-3"
                  value={formData.phone}
                  onChange={handleFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  이메일
                </Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  value={formData.email}
                  onChange={handleFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-representative_name" className="text-right">
                  대표자명
                </Label>
                <Input
                  id="edit-representative_name"
                  name="representative_name"
                  className="col-span-3"
                  value={formData.representative_name}
                  onChange={handleFormChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-representative_position" className="text-right">
                  대표자 직위
                </Label>
                <Input
                  id="edit-representative_position"
                  name="representative_position"
                  className="col-span-3"
                  value={formData.representative_position}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit">수정</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>조직 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 조직을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 해당 조직에 소속된 모든
              구성원 정보도 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg my-2">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {currentOrganization?.name || "이 조직"}을(를) 삭제하면 관련된 모든 데이터가
              영구적으로 제거됩니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
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
