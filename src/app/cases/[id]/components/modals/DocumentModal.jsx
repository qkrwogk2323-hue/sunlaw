import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { formatFileSize } from "@/utils/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DocumentModal({ caseId, open, onOpenChange, onSuccess }) {
  const { user } = useUser();
  const [lawsuits, setLawsuits] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    document_type: "",
    description: "",
    file: null,
    lawsuit_id: "",
    document_category: "general",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (open && user) {
      fetchLawsuits();
    }
  }, [open, user, caseId]);

  useEffect(() => {
    // 모달이 닫힐 때 폼 초기화
    if (!open) {
      resetForm();
    }
  }, [open]);

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

      resetForm();
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("문서 추가 실패:", error);
      toast.error("문서 추가 실패", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
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
    setFormErrors({});
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              {formErrors.title && <p className="text-sm text-red-500">{formErrors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_type">문서 유형</Label>
              <Select value={formData.document_type} onValueChange={handleDocumentTypeChange}>
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
              <Input id="file" type="file" onChange={handleFileChange} className="cursor-pointer" />
              <p className="text-xs text-muted-foreground">최대 파일 크기: 10MB</p>
              {formErrors.file && <p className="text-sm text-red-500">{formErrors.file}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
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
  );
}
