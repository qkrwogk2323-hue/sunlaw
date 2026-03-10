"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Download,
  File,
  FileText,
  Upload,
  Plus,
  RefreshCw,
  Trash2,
  FileCheck,
  Copy,
  FilePlus,
  FileQuestion,
  Filter,
  Search,
} from "lucide-react";

export default function DocumentManager({ caseId }) {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    document_type_id: "",
    document_date: new Date(),
    description: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // 문서 종류별 아이콘 설정
  const documentTypeIcons = {
    legal: <FileText size={18} />,
    submission: <FileCheck size={18} />,
    receipt: <Copy size={18} />,
    contract: <FilePlus size={18} />,
    other: <FileQuestion size={18} />,
  };

  useEffect(() => {
    fetchDocuments();
    fetchDocumentTypes();
  }, [caseId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_case_documents")
        .select(
          `
          *,
          document_type:document_type_id(id, name, document_category)
        `
        )
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("문서 조회 실패:", error);
      toast.error("문서 조회 실패", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("test_document_types")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setDocumentTypes(data || []);
    } catch (error) {
      console.error("문서 유형 조회 실패:", error);
      toast.error("문서 유형 조회 실패", {
        description: error.message,
      });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // 파일 크기 제한 (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("파일 크기 제한", {
          description: "10MB 이하의 파일만 업로드 가능합니다.",
        });
        return;
      }

      setFile(selectedFile);

      // 자동으로 파일명을 제목으로 설정 (확장자 제외)
      const fileName = selectedFile.name;
      const fileTitle = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
      setFormData((prev) => ({ ...prev, title: fileTitle }));

      if (fileName && !formErrors.file) {
        toast.info("파일 선택 완료", {
          description: `${fileName} 파일이 선택되었습니다.`,
        });
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 에러 상태 초기화
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, document_date: date }));

    if (formErrors.document_date) {
      setFormErrors((prev) => ({ ...prev, document_date: "" }));
    }
  };

  const handleTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, document_type_id: value }));

    if (formErrors.document_type_id) {
      setFormErrors((prev) => ({ ...prev, document_type_id: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!file) errors.file = "파일을 선택해주세요";
    if (!formData.title.trim()) errors.title = "제목을 입력해주세요";
    if (!formData.document_type_id) errors.document_type_id = "문서 유형을 선택해주세요";
    if (!formData.document_date) errors.document_date = "문서 날짜를 선택해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setUploading(true);

    try {
      // 사용자 권한 확인
      if (!user || (user.role !== "staff" && user.role !== "admin")) {
        toast.error("권한 없음", {
          description: "문서를 업로드할 권한이 없습니다.",
        });
        return;
      }

      // 1. 파일 업로드
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `cases/${caseId}/documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("case-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. 문서 정보 저장
      const newDocument = {
        case_id: caseId,
        title: formData.title.trim(),
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        document_type_id: formData.document_type_id,
        document_date: formData.document_date,
        description: formData.description.trim() || null,
        uploaded_by: user.id,
        created_at: new Date(),
      };

      const { error: insertError } = await supabase.from("test_case_documents").insert(newDocument);

      if (insertError) throw insertError;

      toast.success("문서 업로드 성공", {
        description: "문서가 성공적으로 업로드되었습니다.",
      });

      // 폼 초기화 및 모달 닫기
      setFile(null);
      setFormData({
        title: "",
        document_type_id: "",
        document_date: new Date(),
        description: "",
      });
      setShowAddModal(false);

      // 목록 다시 불러오기
      fetchDocuments();
    } catch (error) {
      console.error("문서 업로드 실패:", error);
      toast.error("문서 업로드 실패", {
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, filePath) => {
    if (!confirm("정말로 이 문서를 삭제하시겠습니까?")) return;

    try {
      // 사용자 권한 확인
      if (!user || (user.role !== "staff" && user.role !== "admin")) {
        toast.error("권한 없음", {
          description: "문서를 삭제할 권한이 없습니다.",
        });
        return;
      }

      // 1. 데이터베이스에서 문서 정보 삭제
      const { error: deleteError } = await supabase
        .from("test_case_documents")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // 2. 스토리지에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from("case-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      toast.success("문서 삭제 성공", {
        description: "문서가 성공적으로 삭제되었습니다.",
      });

      // 목록 다시 불러오기
      fetchDocuments();
    } catch (error) {
      console.error("문서 삭제 실패:", error);
      toast.error("문서 삭제 실패", {
        description: error.message,
      });
    }
  };

  const handleDownload = async (filePath, fileName) => {
    try {
      // URL 가져오기
      const { data, error } = await supabase.storage
        .from("case-documents")
        .createSignedUrl(filePath, 60); // 60초 동안 유효한 URL 생성

      if (error) throw error;

      // URL을 사용하여 다운로드
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 사용자에게 알림
      toast.success("다운로드 시작", {
        description: `${fileName} 다운로드가 시작됩니다.`,
      });
    } catch (error) {
      console.error("문서 다운로드 실패:", error);
      toast.error("문서 다운로드 실패", {
        description: error.message,
      });
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 문서 유형 아이콘 가져오기
  const getDocumentTypeIcon = (document) => {
    if (!document.document_type) return documentTypeIcons.other;

    const category = document.document_type.document_category;
    return documentTypeIcons[category] || documentTypeIcons.other;
  };

  // 필터링된 문서 목록
  const filteredDocuments = documents.filter((doc) => {
    // 탭 필터
    const tabFilter =
      activeTab === "all" ||
      (doc.document_type && doc.document_type.document_category === activeTab);

    // 유형 필터
    const typeFilter =
      !selectedType || (doc.document_type_id && doc.document_type_id.toString() === selectedType);

    // 검색어 필터
    const searchFilter =
      !searchTerm ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.file_name && doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return tabFilter && typeFilter && searchFilter;
  });

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
                <Button size="sm" className="flex items-center gap-1">
                  <Plus size={14} />
                  문서 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>문서 추가</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">파일 선택</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className={formErrors.file ? "border-red-500" : ""}
                    />
                    {formErrors.file && <p className="text-xs text-red-500">{formErrors.file}</p>}
                    {file && (
                      <p className="text-xs text-gray-500">
                        {file.name} ({formatFileSize(file.size)})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="문서 제목"
                      className={formErrors.title ? "border-red-500" : ""}
                    />
                    {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document_type_id">문서 유형</Label>
                    <Select value={formData.document_type_id} onValueChange={handleTypeChange}>
                      <SelectTrigger
                        className={formErrors.document_type_id ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="문서 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.document_type_id && (
                      <p className="text-xs text-red-500">{formErrors.document_type_id}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document_date">문서 날짜</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${
                            formErrors.document_date ? "border-red-500" : ""
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.document_date ? (
                            format(formData.document_date, "PPP", { locale: ko })
                          ) : (
                            <span>날짜 선택</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.document_date}
                          onSelect={handleDateChange}
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
                    {formErrors.document_date && (
                      <p className="text-xs text-red-500">{formErrors.document_date}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">설명 (선택사항)</Label>
                    <Input
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="문서에 대한 간단한 설명"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                      취소
                    </Button>
                    <Button type="submit" disabled={uploading}>
                      {uploading ? "업로드 중..." : "업로드"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-1">
                <File size={14} />
                <span>전체</span>
              </TabsTrigger>
              <TabsTrigger value="legal" className="flex items-center gap-1">
                <FileText size={14} />
                <span>법적 문서</span>
              </TabsTrigger>
              <TabsTrigger value="submission" className="flex items-center gap-1">
                <FileCheck size={14} />
                <span>제출 문서</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-1">
                <FilePlus size={14} />
                <span>계약서</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="문서 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="유형별 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">모든 유형</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            {renderDocumentsTable(filteredDocuments)}
          </TabsContent>
          <TabsContent value="legal" className="mt-0">
            {renderDocumentsTable(filteredDocuments)}
          </TabsContent>
          <TabsContent value="submission" className="mt-0">
            {renderDocumentsTable(filteredDocuments)}
          </TabsContent>
          <TabsContent value="contract" className="mt-0">
            {renderDocumentsTable(filteredDocuments)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  // 문서 테이블 렌더링 함수
  function renderDocumentsTable(docs) {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      );
    }

    if (docs.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <p>등록된 문서가 없습니다.</p>
          {user && (user.role === "staff" || user.role === "admin") && (
            <Button
              variant="outline"
              className="mt-4 flex items-center gap-2"
              onClick={() => setShowAddModal(true)}
            >
              <Upload size={16} />
              문서 추가하기
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목 / 유형</TableHead>
              <TableHead>파일명</TableHead>
              <TableHead>문서 날짜</TableHead>
              <TableHead>크기</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium flex items-center gap-2">
                      {getDocumentTypeIcon(doc)}
                      <span>{doc.title}</span>
                    </div>
                    <Badge variant="outline" className="w-fit mt-1">
                      {doc.document_type ? doc.document_type.name : "미분류"}
                    </Badge>
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap max-w-xs truncate">
                  {doc.file_name}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(doc.document_date), "yyyy. MM. dd", { locale: ko })}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatFileSize(doc.file_size)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(doc.created_at), "yyyy. MM. dd", { locale: ko })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.file_path, doc.file_name)}
                      className="h-8 w-8"
                      title="다운로드"
                    >
                      <Download size={16} />
                    </Button>
                    {user && (user.role === "staff" || user.role === "admin") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        className="h-8 w-8"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
