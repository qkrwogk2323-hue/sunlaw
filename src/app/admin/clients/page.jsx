"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Edit,
  UserPlus,
  Eye,
  User,
  FileText,
  RotateCw,
  RotateCcw,
  UserCog,
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
  DialogDescription,
  DialogClose,
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
import { use } from "react";

export default function ClientManagementPage() {
  const router = useRouter();
  const { user } = useUser();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);

  // 의뢰인 목록 불러오기
  useEffect(() => {
    // 관리자 권한 확인
    if (user && user.role !== "admin") {
      toast.error("접근 권한이 없습니다");
      router.push("/");
      return;
    }

    async function fetchClients() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setClients(data || []);
        setFilteredClients(data || []);
      } catch (error) {
        console.error("사용자 목록 불러오기 오류:", error.message);
        toast.error("사용자 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [user, router]);

  // 검색 기능
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(
      (client) =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  // 신분증 이미지 보기
  const handleViewIdCard = (client) => {
    setSelectedClient(client);
    setShowImageDialog(true);
    setImageRotation(0); // 이미지 회전 상태 초기화
  };

  // 이미지 시계 방향으로 90도 회전
  const rotateClockwise = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

  // 이미지 반시계 방향으로 90도 회전
  const rotateCounterClockwise = () => {
    setImageRotation((prev) => (prev - 90 + 360) % 360);
  };

  // 편집 페이지로 이동
  const handleEditClient = (id) => {
    router.push(`/admin/clients/${id}`);
  };

  // 새 의뢰인 추가
  const handleAddClient = () => {
    router.push("/admin/clients/new");
  };

  // 주민등록번호 마스킹 처리
  const maskResidentNumber = (number) => {
    if (!number) return "-";

    // 주민등록번호가 이미 포맷팅되어 있는 경우 (000000-0000000)
    if (number.includes("-")) {
      const parts = number.split("-");
      return `${parts[0]}-${parts[1].substring(0, 1)}******`;
    }

    // 포맷팅되지 않은 경우
    if (number.length >= 7) {
      return `${number.substring(0, 6)}-${number.substring(6, 7)}******`;
    }

    return number;
  };

  // 사용자 역할 변경 처리
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);

      if (error) throw error;

      // 클라이언트 상태 업데이트
      setClients((prevClients) =>
        prevClients.map((client) => (client.id === userId ? { ...client, role: newRole } : client))
      );

      toast.success("사용자 역할이 변경되었습니다.");
    } catch (error) {
      console.error("역할 변경 오류:", error);
      toast.error("역할 변경에 실패했습니다.");
    }
  };

  // 역할에 따른 배지 색상과 텍스트
  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return { color: "bg-red-500 hover:bg-red-600", text: "관리자" };
      case "staff":
        return { color: "bg-blue-500 hover:bg-blue-600", text: "직원" };
      case "client":
      default:
        return { color: "bg-green-500 hover:bg-green-600", text: "의뢰인" };
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>사용자 관리</CardTitle>
            <CardDescription>사용자 정보를 관리하고 수정할 수 있습니다.</CardDescription>
          </div>
          <Button onClick={handleAddClient}>
            <UserPlus className="mr-2 h-4 w-4" />새 사용자 등록
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 전화번호로 검색..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">이름</TableHead>
                    <TableHead className="w-[15%]">이메일</TableHead>
                    <TableHead className="w-[12%]">연락처</TableHead>
                    <TableHead className="w-[12%]">주민등록번호</TableHead>
                    <TableHead className="w-[15%]">주소</TableHead>
                    <TableHead className="w-[10%]">역할</TableHead>
                    <TableHead className="w-[10%]">신분증</TableHead>
                    <TableHead className="text-right w-[11%]">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        {searchTerm ? "검색 결과가 없습니다." : "등록된 사용자가 없습니다."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{client.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="truncate">{client.email || "-"}</TableCell>
                        <TableCell>{client.phone_number || "-"}</TableCell>
                        <TableCell>
                          {client.resident_number
                            ? maskResidentNumber(client.resident_number)
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={client.address}>
                          {client.address || "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={client.role || "client"}
                            onValueChange={(value) => handleRoleChange(client.id, value)}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue>
                                <Badge
                                  variant="outline"
                                  className={`${
                                    getRoleBadge(client.role).color
                                  } text-white px-2 py-0.5`}
                                >
                                  {getRoleBadge(client.role).text}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">의뢰인</SelectItem>
                              <SelectItem value="staff">직원</SelectItem>
                              <SelectItem value="admin">관리자</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {client.id_card_url ? (
                            <Badge
                              className="cursor-pointer hover:bg-primary/90"
                              onClick={() => handleViewIdCard(client)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              보기
                            </Badge>
                          ) : (
                            <Badge variant="outline">미등록</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClient(client.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            편집
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신분증 이미지 보기 다이얼로그 */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>신분증 이미지 - {selectedClient?.name}</DialogTitle>
            <DialogDescription>업로드된 신분증 이미지입니다.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-center items-center p-2 border rounded-md">
            {selectedClient?.id_card_url ? (
              <div className="relative">
                <img
                  src={selectedClient.id_card_url}
                  alt="신분증"
                  className="max-w-full max-h-[300px] object-contain transition-transform duration-300"
                  style={{ transform: `rotate(${imageRotation}deg)` }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2" />
                <p>이미지를 불러올 수 없습니다.</p>
              </div>
            )}
          </div>

          <div className="flex justify-center mt-4 space-x-4">
            <Button variant="outline" size="sm" onClick={rotateCounterClockwise}>
              <RotateCcw className="h-4 w-4 mr-1" />
              반시계 방향 회전
            </Button>
            <Button variant="outline" size="sm" onClick={rotateClockwise}>
              <RotateCw className="h-4 w-4 mr-1" />
              시계 방향 회전
            </Button>
          </div>

          <div className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button variant="outline">닫기</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
