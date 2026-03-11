"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import FileUploadDropzone from "@/components/ui/file-upload-dropzone";

const BUCKET_NAME = "case-files";

export default function ScheduleFormModal({
  open,
  onOpenChange,
  lawsuit: initialLawsuit, // 💡 Props로 넘어온 소송 (없을 수도 있음)
  onSuccess,
  editingSchedule,
  caseDetails = null,
  clients = null,
  defaultDate = null, // 💡 달력에서 클릭한 날짜
  caseId = null,      // 💡 소송 정보가 없을 때를 대비한 사건 ID
}) {
  const { user } = useUser();
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [availableLawsuits, setAvailableLawsuits] = useState([]);
  const [selectedLawsuitId, setSelectedLawsuitId] = useState("none");

  const [scheduleFormData, setScheduleFormData] = useState({
    title: "",
    event_type: "",
    event_date: new Date(),
    location: "",
    description: "",
  });
  const [fileToUpload, setFileToUpload] = useState(null);

  const isEditMode = !!editingSchedule;

  // 💡 현재 선택된 소송 객체 계산
  const currentLawsuit =
    initialLawsuit || availableLawsuits.find((l) => l.id === selectedLawsuitId) || null;

  // 모달이 열릴 때 폼 초기화 및 소송 목록 불러오기
  useEffect(() => {
    if (open) {
      if (editingSchedule && editingSchedule.id) {
        // 수정 모드
        setScheduleFormData({
          title: editingSchedule.title || "",
          event_type: editingSchedule.event_type || "",
          event_date: editingSchedule.event_date ? new Date(editingSchedule.event_date) : new Date(),
          location: editingSchedule.location || "",
          description: editingSchedule.description || "",
        });
        setSelectedLawsuitId(editingSchedule.lawsuit_id || "none");
        setFileToUpload(null);
      } else {
        // 추가 모드
        const initialDate = defaultDate ? new Date(defaultDate) : new Date();
        const defaultTitle = initialLawsuit?.case_number ? `${initialLawsuit.case_number} ` : "";
        
        setScheduleFormData({
          title: defaultTitle,
          event_type: "",
          event_date: initialDate,
          location: "",
          description: "",
        });
        setSelectedLawsuitId("none");
        setFileToUpload(null);
        setFormErrors({});

        // 소송 정보가 명시적으로 없지만 사건 ID가 있는 경우, 해당 사건의 소송 목록을 가져옴
        if (!initialLawsuit && caseId) {
          (async () => {
            const { data } = await supabase
              .from("test_case_lawsuits")
              .select("*")
              .eq("case_id", caseId);
            if (data) {
              setAvailableLawsuits(data);
              // 소송이 딱 1개만 있으면 자동으로 선택해줌
              if (data.length === 1 && !editingSchedule) {
                setSelectedLawsuitId(data[0].id);
              }
            }
          })();
        }
      }
    }
  }, [open, initialLawsuit, editingSchedule, defaultDate, caseId]);

  // 입력 처리
  const handleScheduleInputChange = (field, value) => {
    let updatedFormData = { ...scheduleFormData, [field]: value };

    // event_type이 변경될 때 제목에 자동으로 기일 유형 추가
    if (field === "event_type" && value) {
      const currentTitle = scheduleFormData.title || "";
      const caseNum = currentLawsuit?.case_number || "";
      
      if (caseNum && (currentTitle.trim() === caseNum.trim() || currentTitle.trim() === "")) {
        updatedFormData.title = `${caseNum} ${value}`;
      } else if (currentTitle.trim() === "") {
        updatedFormData.title = value;
      }
    }

    setScheduleFormData(updatedFormData);

    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: null });
    }
  };

  const validateScheduleForm = () => {
    const errors = {};
    if (!scheduleFormData.title) errors.title = "제목을 입력해주세요";
    if (!scheduleFormData.event_type) errors.event_type = "기일 유형을 입력해주세요";
    if (!scheduleFormData.event_date) errors.event_date = "날짜를 선택해주세요";
    if (!scheduleFormData.location) errors.location = "장소를 입력해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPartyTypeLabel = (type) => {
    const labels = {
      plaintiff: "원고", defendant: "피고", creditor: "채권자",
      debtor: "채무자", applicant: "신청인", respondent: "피신청인",
    };
    return labels[type] || type;
  };

  // 일반 사건의 당사자 정보 가져오기 (소송이 선택 안 된 경우)
  const getCaseParties = async (targetCaseId) => {
    if (!targetCaseId) return { creditor: null, debtor: null };
    const { data } = await supabase.from("test_case_parties").select("*").eq("case_id", targetCaseId);
    if (!data) return { creditor: null, debtor: null };
    
    const creditor = data.find((p) => ["plaintiff", "creditor", "applicant"].includes(p.party_type));
    const debtor = data.find((p) => ["defendant", "debtor", "respondent"].includes(p.party_type));
    return { creditor, debtor };
  };

  const getLawsuitParties = async (lawsuitId) => {
    try {
      if (!lawsuitId) return { creditor: null, debtor: null };
      const { data: lawsuitParties } = await supabase.from("test_lawsuit_parties").select("party_id, party_type").eq("lawsuit_id", lawsuitId);
      if (!lawsuitParties || lawsuitParties.length === 0) return { creditor: null, debtor: null };

      const partyIds = lawsuitParties.map((p) => p.party_id);
      const { data: partiesData } = await supabase.from("test_case_parties").select("*").in("id", partyIds);
      if (!partiesData) return { creditor: null, debtor: null };

      const parties = partiesData.map((party) => {
        const lawsuitParty = lawsuitParties.find((lp) => lp.party_id === party.id);
        return { ...party, party_type: lawsuitParty?.party_type };
      });

      let creditor = null;
      let debtor = null;
      parties.forEach((party) => {
        if (["plaintiff", "creditor", "applicant"].includes(party.party_type)) creditor = party;
        else if (["defendant", "debtor", "respondent"].includes(party.party_type)) debtor = party;
      });
      return { creditor, debtor };
    } catch (error) {
      return { creditor: null, debtor: null };
    }
  };

  const createNotificationsForSchedule = async (scheduleData) => {
    const targetCaseId = currentLawsuit?.case_id || caseId;
    if (!targetCaseId) return;

    try {
      const userIds = new Set();
      
      // 담당자 수집
      if (caseDetails && caseDetails.handlers) {
        caseDetails.handlers.forEach((h) => { if (h.user_id) userIds.add(h.user_id); });
      } else {
        const { data: handlersData } = await supabase.from("test_case_handlers").select("*").eq("case_id", targetCaseId);
        if (handlersData) handlersData.forEach((h) => { if (h.user_id) userIds.add(h.user_id); });
      }

      // 의뢰인 수집
      const { data: clientsData } = await supabase.from("test_case_clients").select("client_type, individual_id, organization_id").eq("case_id", targetCaseId);
      if (clientsData) {
        clientsData.forEach((client) => {
          if (client.client_type === "individual" && client.individual_id) {
            userIds.add(typeof client.individual_id === "object" ? client.individual_id.id : client.individual_id);
          }
        });

        const orgIds = clientsData.filter((c) => c.client_type === "organization").map((c) => typeof c.organization_id === "object" ? c.organization_id.id : c.organization_id).filter(Boolean);
        if (orgIds.length > 0) {
          const { data: membersData } = await supabase.from("test_organization_members").select("user_id").in("organization_id", orgIds);
          if (membersData) membersData.forEach((m) => { if (m.user_id) userIds.add(m.user_id); });
        }
      }

      const uniqueUserIds = Array.from(userIds);
      let finalUserIds = [];
      if (uniqueUserIds.length > 0) {
        const { data: validUsers } = await supabase.from("users").select("id").in("id", uniqueUserIds);
        finalUserIds = validUsers ? validUsers.map((u) => u.id) : uniqueUserIds;
      }

      let creditorName = "미지정";
      let debtorName = "미지정";
      
      const { creditor, debtor } = currentLawsuit 
        ? await getLawsuitParties(currentLawsuit.id)
        : await getCaseParties(targetCaseId);

      if (creditor) creditorName = creditor.entity_type === "individual" ? creditor.name : creditor.company_name || "미지정";
      if (debtor) debtorName = debtor.entity_type === "individual" ? debtor.name : debtor.company_name || "미지정";

      const title = `${scheduleData.event_type} 일정이 등록되었습니다.`;
      const prefix = currentLawsuit?.case_number ? `${currentLawsuit.case_number}_` : "";
      const message = `${prefix}${creditorName}(${debtorName})`;

      // 사건 알림
      await supabase.from("test_case_notifications").insert({
        case_id: targetCaseId, title, message, notification_type: "schedule", created_at: new Date().toISOString(), related_id: scheduleData.id,
      });

      // 개인 알림
      if (finalUserIds.length > 0) {
        const individualNotifications = finalUserIds.map((userId) => ({
          id: uuidv4(), user_id: userId, case_id: targetCaseId, title, message, notification_type: "schedule",
          is_read: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), related_id: scheduleData.id,
        }));
        await supabase.from("test_individual_notifications").insert(individualNotifications);
      }
    } catch (error) {
      console.error("알림 생성 중 오류 발생:", error);
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기 초과", { description: "10MB 이하의 파일만 업로드할 수 있습니다." });
      return;
    }
    setFileToUpload(file);
  };

  const resetFileUpload = () => setFileToUpload(null);

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast.error("권한이 없습니다", { description: "관리자 또는 직원만 일정을 추가할 수 있습니다" });
      return;
    }

    if (!validateScheduleForm()) return;
    setIsSubmitting(true);

    try {
      // 💡 에러의 핵심이었던 부분 수정! (소송이 없어도 사건 ID만 있으면 통과)
      const targetCaseId = currentLawsuit?.case_id || caseId;
      if (!targetCaseId) {
        throw new Error("유효한 사건 정보가 없습니다.");
      }

      let fileUrl = isEditMode ? editingSchedule?.file_url || null : null;

      if (fileToUpload) {
        const fileExt = fileToUpload.name.split(".").pop();
        const lawsuitPath = currentLawsuit ? `${currentLawsuit.id}/` : "general/";
        const fileName = `${targetCaseId}/${lawsuitPath}${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `schedule-files/${fileName}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, fileToUpload);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      if (isEditMode && editingSchedule && editingSchedule.id) {
        const updatedSchedule = {
          title: scheduleFormData.title,
          event_type: scheduleFormData.event_type,
          event_date: scheduleFormData.event_date.toISOString(),
          end_date: scheduleFormData.event_date.toISOString(),
          lawsuit_id: selectedLawsuitId !== "none" ? selectedLawsuitId : null,
          location: scheduleFormData.location,
          description: scheduleFormData.description.trim() || null,
          file_url: fileUrl === editingSchedule.file_url ? undefined : fileUrl,
          updated_at: new Date().toISOString(),
        };

        if (updatedSchedule.file_url === undefined) delete updatedSchedule.file_url;

        const { data, error } = await supabase.from("test_schedules").update(updatedSchedule).eq("id", editingSchedule.id).select().single();
        if (error) throw error;

        toast.success("일정이 수정되었습니다");
        if (onSuccess) onSuccess(data);
        onOpenChange(false);
      } else {
        const newSchedule = {
          title: scheduleFormData.title,
          event_type: scheduleFormData.event_type,
          event_date: scheduleFormData.event_date.toISOString(),
          end_date: scheduleFormData.event_date.toISOString(),
          case_id: targetCaseId,
          lawsuit_id: currentLawsuit?.id || null, // 💡 소송이 없으면 null 허용
          location: scheduleFormData.location,
          description: scheduleFormData.description.trim() || null,
          is_important: !!currentLawsuit, // 소송 기일이면 중요
          court_name: currentLawsuit?.court_name || null,
          case_number: currentLawsuit?.case_number || null,
          file_url: fileUrl,
          created_by: user.id,
        };

        const { data, error } = await supabase.from("test_schedules").insert(newSchedule).select().single();
        if (error) throw error;

        createNotificationsForSchedule(data);
        toast.success("일정이 추가되었습니다");
        if (onSuccess) onSuccess(data);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("일정 저장 중 오류 발생:", error);
      toast.error("일정 저장 중 오류가 발생했습니다.", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "일정 수정" : "일정 추가"}</DialogTitle>
          <DialogDescription>일정 정보를 입력하고 저장 버튼을 클릭하세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitSchedule} className="space-y-4 py-2">
          {/* 💡 관련 소송 선택 (대시보드 달력에서 띄웠을 때만 보임) */}
          {!initialLawsuit && availableLawsuits.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="lawsuit_select">관련 소송 (선택)</Label>
              <Select value={selectedLawsuitId} onValueChange={setSelectedLawsuitId}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="관련 소송을 선택하세요 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안 함 (사건 일반 일정)</SelectItem>
                  {availableLawsuits.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.court_name} {l.case_number} ({l.lawsuit_type === "civil" ? "민사" : "기타"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              placeholder="예: 감정기일, 조정기일, 서류 제출 마감"
              value={scheduleFormData.title}
              onChange={(e) => handleScheduleInputChange("title", e.target.value)}
              required
            />
            {formErrors.title && <p className="text-sm text-red-500">{formErrors.title}</p>}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="event_type">일정 유형</Label>
              <Input
                id="event_type"
                placeholder="예: 변론, 선고, 미팅, 서류제출"
                value={scheduleFormData.event_type}
                onChange={(e) => handleScheduleInputChange("event_type", e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {["변론", "선고", "감정", "조정", "심문", "미팅", "제출마감", "기타"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 h-auto"
                    onClick={() => handleScheduleInputChange("event_type", type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              {formErrors.event_type && <p className="text-sm text-red-500">{formErrors.event_type}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="event_date">날짜 및 시간</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" id="event_date">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleFormData.event_date ? format(new Date(scheduleFormData.event_date), "PPP", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleFormData.event_date}
                        onSelect={(date) => {
                          const currentDate = scheduleFormData.event_date || new Date();
                          const newDate = new Date(date);
                          newDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                          handleScheduleInputChange("event_date", newDate);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-1">
                  <Input
                    type="time"
                    value={
                      scheduleFormData.event_date
                        ? `${String(scheduleFormData.event_date.getHours()).padStart(2, "0")}:${String(scheduleFormData.event_date.getMinutes()).padStart(2, "0")}`
                        : "09:00"
                    }
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":").map(Number);
                      const newDate = new Date(scheduleFormData.event_date || new Date());
                      newDate.setHours(hours, minutes);
                      handleScheduleInputChange("event_date", newDate);
                    }}
                  />
                </div>
              </div>
              {formErrors.event_date && <p className="text-sm text-red-500">{formErrors.event_date}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="location">장소</Label>
            <Input
              id="location"
              placeholder="예: 서울중앙지방법원 507호 법정, 법무법인 회의실"
              value={scheduleFormData.location}
              onChange={(e) => handleScheduleInputChange("location", e.target.value)}
              required
            />
            {formErrors.location && <p className="text-sm text-red-500">{formErrors.location}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
              placeholder="일정에 대한 추가 정보를 입력하세요"
              value={scheduleFormData.description}
              onChange={(e) => handleScheduleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>첨부 파일</Label>
            {fileToUpload ? (
              <div className="flex items-center justify-between border rounded-md p-2 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm truncate max-w-[200px]">{fileToUpload.name}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetFileUpload} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                  <span className="sr-only">파일 삭제</span>
                  ✕
                </Button>
              </div>
            ) : (
              <FileUploadDropzone
                onFileChange={handleFileChange}
                accept={{
                  "application/pdf": [".pdf"],
                  "application/msword": [".doc"],
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                  "application/vnd.ms-excel": [".xls"],
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                  "image/jpeg": [".jpg", ".jpeg"],
                  "image/png": [".png"],
                }}
                maxFiles={1}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "수정하기" : "저장하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}