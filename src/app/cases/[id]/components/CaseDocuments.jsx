"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Download,
  FileUp,
  File,
  ChevronDown,
  Filter,
  Copy,
  Eye,
  ExternalLink,
  Clock,
  Gavel,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFileSize } from "@/utils/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export default function CaseDocuments({ caseId }) {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [lawsuits, setLawsuits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    document_type: "",
    description: "",
    file: null,
    lawsuit_id: "", // 소송 ID 추가
    document_category: "general", // 문서 분류 (일반/소송)
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const documentTypes = [
    // 일반 문서
    { value: "contract", label: "계약서", category: "general" },
    { value: "receipt", label: "영수증", category: "general" },
    { value: "invoice", label: "청구서", category: "general" },
    { value: "id", label: "신분증", category: "general" },
    { value: "communication", label: "내용증명", category: "general" },
    // 소송 문서
    { value: "complaint", label: "소장", category: "lawsuit" },
    { value: "answer", label: "답변서", category: "lawsuit" },
    { value: "submission", label: "준비서면", category: "lawsuit" },
    { value: "evidence", label: "증거자료", category: "lawsuit" },
    { value: "ruling", label: "판결문", category: "lawsuit" },
    { value: "order", label: "명령서", category: "lawsuit" },
    { value: "delivery", label: "송달문서", category: "lawsuit" },
    { value: "other", label: "기타", category: "both" },
  ];

  // 문서 분류
  const documentCategories = [
    { value: "general", label: "일반 문서" },
    { value: "lawsuit", label: "소송 문서" },
  ];

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchLawsuits();
    }
  }, [user, caseId]);

  const fetchLawsuits = async () => {
    try {
      const { data, error } = await supabase
        .from("test_case_lawsuits")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLawsuits(data || []);
    } catch (error) {
      console.error("소송 정보 불러오기 실패:", error);
      toast.error("소송 정보를 불러오지 못했습니다");
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_case_documents")
        .select(
          `
          *,
          uploaded_by_user:users(id, name, email),
          lawsuit:test_case_lawsuits(id, lawsuit_type, case_number, court_name)
        `
        )
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("문서 목록 조회 실패:", error);
      toast.error("문서 목록 조회 실패", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    // 입력 시 오류 초기화
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: null,
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFileToUpload(null);
      setFilePreview(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기 초과", {
        description: "10MB 이하의 파일만 업로드할 수 있습니다.",
      });
      e.target.value = "";
      return;
    }

    setFileToUpload(file);
    setFormData({
      ...formData,
      file: file.name,
    });

    if (formErrors.file) {
      setFormErrors({
        ...formErrors,
        file: null,
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) errors.title = "제목을 입력해주세요";
    if (!formData.document_type) errors.document_type = "문서 유형을 선택해주세요";
    if (!fileToUpload) errors.file = "파일을 선택해주세요";

    // 소송 문서인 경우 소송 ID 필수
    if (formData.document_category === "lawsuit" && !formData.lawsuit_id) {
      errors.lawsuit_id = "관련 소송을 선택해주세요";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadFile = async (file, docId) => {
    // 파일 이름에 타임스탬프 추가하여 중복 방지
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${docId}.${fileExt}`;
    const filePath = `cases/${caseId}/documents/${fileName}`;

    const { data, error } = await supabase.storage.from("case-documents").upload(filePath, file);

    if (error) throw error;

    // 파일 URL 생성
    const { data: urlData } = supabase.storage.from("case-documents").getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleDocumentTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, document_type: value }));

    // 문서 유형에 따라 카테고리 자동 설정
    const selectedType = documentTypes.find((type) => type.value === value);
    if (selectedType && selectedType.category !== "both") {
      setFormData((prev) => ({ ...prev, document_category: selectedType.category }));
    }

    if (formErrors.document_type) {
      setFormErrors((prev) => ({ ...prev, document_type: "" }));
    }
  };

  const handleDocumentCategoryChange = (value) => {
    // 카테고리 변경 시 해당 카테고리에 맞는 첫번째 문서 유형으로 기본값 설정
    setFormData((prev) => ({
      ...prev,
      document_category: value,
      document_type: "", // 카테고리 변경 시 타입 초기화
      lawsuit_id: value === "general" ? "" : prev.lawsuit_id, // 일반 문서면 소송 ID 초기화
    }));
  };

  const handleLawsuitChange = (value) => {
    setFormData((prev) => ({ ...prev, lawsuit_id: value }));

    if (formErrors.lawsuit_id) {
      setFormErrors((prev) => ({ ...prev, lawsuit_id: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 문서를 추가할 수 있습니다",
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // 파일 정보
      const fileExt = fileToUpload.name.split(".").pop();

      // 문서 정보 데이터베이스에 저장
      const docData = {
        case_id: caseId,
        title: formData.title.trim(),
        document_type: formData.document_type,
        description: formData.description.trim() || null,
        file_name: fileToUpload.name,
        file_size: fileToUpload.size,
        file_type: fileExt,
        document_date: new Date().toISOString(),
        uploaded_by: user.id,
        lawsuit_id: formData.document_category === "lawsuit" ? formData.lawsuit_id : null,
      };

      const { data, error } = await supabase.from("test_case_documents").insert(docData).select();

      if (error) throw error;

      // 파일 업로드
      try {
        const fileUrl = await uploadFile(fileToUpload, data[0].id);

        // file_url 필드 업데이트
        if (fileUrl) {
          const { error: updateError } = await supabase
            .from("test_case_documents")
            .update({ file_url: fileUrl })
            .eq("id", data[0].id);

          if (updateError) throw updateError;
        }
      } catch (fileError) {
        console.error("파일 업로드 실패:", fileError);
        toast.error("파일 업로드 실패", {
          description: "문서는 추가되었지만, 파일 업로드에 실패했습니다.",
        });
      }

      toast.success("문서가 추가되었습니다", {
        description: "문서가 성공적으로 추가되었습니다.",
      });

      // 폼 초기화 및 다이얼로그 닫기
      setFormData({
        title: "",
        document_type: "",
        description: "",
        file: null,
        lawsuit_id: "",
        document_category: "general",
      });
      setFileToUpload(null);
      setFilePreview(null);
      setShowAddModal(false);

      // 새로운 문서 목록 가져오기
      fetchDocuments();
    } catch (error) {
      console.error("문서 추가 실패:", error);
      toast.error("문서 추가 실패", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", {
        description: "관리자 또는 직원만 문서를 삭제할 수 있습니다",
      });
      return;
    }

    try {
      const { error } = await supabase.from("test_case_documents").delete().eq("id", docId);

      if (error) throw error;

      toast.success("문서가 삭제되었습니다", {
        description: "문서가 성공적으로 삭제되었습니다.",
      });

      // 업데이트된 목록 가져오기
      fetchDocuments();
    } catch (error) {
      console.error("문서 삭제 실패:", error);
      toast.error("문서 삭제 실패", {
        description: error.message,
      });
    }
  };

  // 문서 유형에 따른 텍스트 반환
  const getDocumentTypeText = (type) => {
    const found = documentTypes.find((item) => item.value === type);
    return found ? found.label : type;
  };

  // 소송 유형 표시
  const getLawsuitTypeText = (type) => {
    const types = {
      civil: "민사소송",
      payment_order: "지급명령",
      property_disclosure: "재산명시",
      execution: "강제집행",
    };
    return types[type] || type;
  };

  // 카테고리에 맞는 문서 유형 필터링
  const getFilteredDocumentTypes = () => {
    if (formData.document_category === "general") {
      return documentTypes.filter(
        (type) => type.category === "general" || type.category === "both"
      );
    } else if (formData.document_category === "lawsuit") {
      return documentTypes.filter(
        (type) => type.category === "lawsuit" || type.category === "both"
      );
    }
    return documentTypes;
  };

  // 현재 필터에 맞는 문서 리스트
  const getFilteredDocuments = () => {
    if (filter === "all") return documents;
    if (filter === "general") return documents.filter((doc) => !doc.lawsuit_id);

    // 소송별 필터링
    return documents.filter((doc) => doc.lawsuit_id === filter);
  };

  // 외부 링크 열기
  const openFileInNewTab = (url) => {
    if (!url) return;
    window.open(url, "_blank");
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">문서 관리</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            className="flex items-center gap-1"
          >
            <RefreshCw size={14} />
            새로고침
          </Button>

          {user && (user.role === "staff" || user.role === "admin") && (
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-1" data-open-modal="document">
                  <Plus size={14} />
                  문서 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>문서 추가</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    {/* 문서 카테고리 선택 */}
                    <div className="space-y-2">
                      <Label htmlFor="document_category">문서 분류</Label>
                      <Select
                        value={formData.document_category}
                        onValueChange={handleDocumentCategoryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="문서 분류 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 소송 문서인 경우 소송 선택 */}
                    {formData.document_category === "lawsuit" && (
                      <div className="space-y-2">
                        <Label htmlFor="lawsuit_id">관련 소송</Label>
                        <Select value={formData.lawsuit_id} onValueChange={handleLawsuitChange}>
                          <SelectTrigger id="lawsuit_id">
                            <SelectValue placeholder="관련 소송 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {lawsuits.length > 0 ? (
                              lawsuits.map((lawsuit) => (
                                <SelectItem key={lawsuit.id} value={lawsuit.id}>
                                  {getLawsuitTypeText(lawsuit.lawsuit_type)} - {lawsuit.case_number}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                등록된 소송이 없습니다
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {formErrors.lawsuit_id && (
                          <p className="text-sm text-red-500">{formErrors.lawsuit_id}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="title">문서 제목</Label>
                      <Input
                        id="title"
                        placeholder="문서 제목을 입력하세요"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                      />
                      {formErrors.title && (
                        <p className="text-sm text-red-500">{formErrors.title}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document_type">문서 유형</Label>
                      <Select
                        value={formData.document_type}
                        onValueChange={handleDocumentTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="문서 유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredDocumentTypes().map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.document_type && (
                        <p className="text-sm text-red-500">{formErrors.document_type}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">설명 (선택사항)</Label>
                      <Textarea
                        id="description"
                        placeholder="문서에 대한 설명을 입력하세요"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">파일 업로드</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">최대 파일 크기: 10MB</p>
                      {formErrors.file && <p className="text-sm text-red-500">{formErrors.file}</p>}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false);
                        setFileToUpload(null);
                        setFilePreview(null);
                      }}
                    >
                      취소
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "업로드 중..." : "업로드"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 필터 탭 */}
        <div className="mb-4">
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="grid grid-cols-2 md:flex md:w-auto gap-1">
              <TabsTrigger value="all" className="text-xs md:text-sm">
                전체 문서
              </TabsTrigger>
              <TabsTrigger value="general" className="text-xs md:text-sm">
                일반 문서
              </TabsTrigger>
              {lawsuits.length > 0 &&
                lawsuits.map((lawsuit) => (
                  <TabsTrigger
                    key={lawsuit.id}
                    value={lawsuit.id}
                    className="text-xs md:text-sm flex items-center gap-1"
                  >
                    <Gavel className="h-3 w-3" />
                    <span className="hidden md:inline">
                      {getLawsuitTypeText(lawsuit.lawsuit_type)} -
                    </span>{" "}
                    {lawsuit.case_number}
                  </TabsTrigger>
                ))}
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : getFilteredDocuments().length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>등록된 문서가 없습니다.</p>
            {user && (user.role === "staff" || user.role === "admin") && (
              <Button variant="outline" className="mt-4" onClick={() => setShowAddModal(true)}>
                문서 추가하기
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">문서 제목</TableHead>
                  <TableHead>문서 유형</TableHead>
                  <TableHead>관련 소송</TableHead>
                  <TableHead>업로드일</TableHead>
                  <TableHead>파일 크기</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredDocuments().map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="font-medium">{doc.title}</div>
                      {doc.description && (
                        <div className="text-xs text-gray-500 truncate">{doc.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <FileText className="h-3 w-3" />
                        {getDocumentTypeText(doc.document_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.lawsuit_id ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Gavel className="h-3 w-3" />
                          {doc.lawsuit?.court_name} {doc.lawsuit?.case_number}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">일반 문서</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-gray-500" />
                        <span className="text-xs">
                          {format(new Date(doc.created_at), "yyyy-MM-dd", { locale: ko })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openFileInNewTab(doc.file_url)}
                        disabled={!doc.file_url}
                        title="파일 보기"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(doc.file_url);
                          toast.success("링크가 복사되었습니다");
                        }}
                        disabled={!doc.file_url}
                        title="링크 복사"
                      >
                        <Copy size={16} />
                      </Button>
                      {user && (user.role === "admin" || user.role === "staff") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 작업은 되돌릴 수 없습니다. 문서가 영구적으로 삭제됩니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
