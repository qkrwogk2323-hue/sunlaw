"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, formatDistanceToNow } from "date-fns";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Plus,
  RefreshCw,
  Trash2,
  CalendarIcon,
  CheckCircle,
  XCircle,
  Mail,
  MessageSquare,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function CaseNotifications({ caseId, limit, isDashboard = false }) {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    notification_type: "general",
    is_read: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const notificationTypes = [
    { value: "general", label: "일반 공지", icon: <MessageSquare size={16} /> },
    { value: "important", label: "중요 공지", icon: <AlertCircle size={16} /> },
    { value: "deadline", label: "기한 안내", icon: <CalendarIcon size={16} /> },
    { value: "email", label: "이메일 알림", icon: <Mail size={16} /> },
  ];

  useEffect(() => {
    fetchNotifications();
  }, [caseId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_case_notifications")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      setNotifications(data || []);
    } catch (error) {
      console.error("알림 로드 실패:", error);
      toast.error("알림을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
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

  const handleTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, notification_type: value }));

    if (formErrors.notification_type) {
      setFormErrors((prev) => ({ ...prev, notification_type: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) errors.title = "제목을 입력해주세요";
    if (!formData.message.trim()) errors.message = "내용을 입력해주세요";
    if (!formData.notification_type) errors.notification_type = "알림 유형을 선택해주세요";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || (user.role !== "staff" && user.role !== "admin")) {
      toast.error("권한 없음", {
        description: "알림을 추가할 권한이 없습니다.",
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const newNotification = {
        case_id: caseId,
        title: formData.title.trim(),
        message: formData.message.trim(),
        notification_type: formData.notification_type,
        is_read: false,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("test_case_notifications")
        .insert(newNotification)
        .select();

      if (error) throw error;

      toast.success("알림 추가 성공", {
        description: "알림이 성공적으로 추가되었습니다.",
      });

      // 폼 초기화 및 모달 닫기
      setFormData({
        title: "",
        message: "",
        notification_type: "general",
        is_read: false,
      });
      setShowAddModal(false);

      // 목록 다시 불러오기
      fetchNotifications();
    } catch (error) {
      console.error("알림 추가 실패:", error);
      toast.error("알림 추가 실패", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말로 이 알림을 삭제하시겠습니까?")) return;

    try {
      // 사용자 권한 확인 (스태프 또는 관리자만 삭제 가능)
      if (!user || (user.role !== "staff" && user.role !== "admin")) {
        toast.error("권한 없음", {
          description: "알림을 삭제할 권한이 없습니다.",
        });
        return;
      }

      const { error } = await supabase.from("test_case_notifications").delete().eq("id", id);

      if (error) throw error;

      toast.success("알림 삭제 성공", {
        description: "알림이 성공적으로 삭제되었습니다.",
      });

      // 목록 다시 불러오기
      fetchNotifications();
    } catch (error) {
      console.error("알림 삭제 실패:", error);
      toast.error("알림 삭제 실패", {
        description: error.message,
      });
    }
  };

  const handleToggleReadStatus = async (id, currentReadStatus) => {
    try {
      // 사용자 권한 확인
      if (!user || (user.role !== "staff" && user.role !== "admin")) {
        toast.error("권한 없음", {
          description: "알림 상태를 변경할 권한이 없습니다.",
        });
        return;
      }

      const { error } = await supabase
        .from("test_case_notifications")
        .update({
          is_read: !currentReadStatus,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("알림 상태 변경 성공", {
        description: !currentReadStatus
          ? "알림이 읽음으로 표시되었습니다."
          : "알림이 읽지 않음으로 표시되었습니다.",
      });

      // 목록 다시 불러오기
      fetchNotifications();
    } catch (error) {
      console.error("알림 상태 변경 실패:", error);
      toast.error("알림 상태 변경 실패", {
        description: error.message,
      });
    }
  };

  const handleViewDetail = async (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);

    // 읽지 않은 알림인 경우 읽음으로 표시
    if (!notification.is_read) {
      try {
        const { error } = await supabase
          .from("test_case_notifications")
          .update({ is_read: true })
          .eq("id", notification.id);

        if (error) {
          console.error("알림 읽음 상태 업데이트 실패:", error);
        } else {
          // 목록 다시 불러오기 (상태 변경되었으므로)
          fetchNotifications();
        }
      } catch (err) {
        console.error("알림 읽음 상태 업데이트 중 오류:", err);
      }
    }
  };

  // 알림 유형에 따른 아이콘 및 텍스트 반환
  const getNotificationTypeInfo = (type) => {
    const found = notificationTypes.find((item) => item.value === type);
    return found || { label: type, icon: <MessageSquare size={16} /> };
  };

  return (
    <Card className="w-full">
      {!isDashboard && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">사건 알림</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
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
                    알림 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>알림 추가</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">알림 유형</label>
                      <Select value={formData.notification_type} onValueChange={handleTypeChange}>
                        <SelectTrigger
                          className={formErrors.notification_type ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="알림 유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {notificationTypes.map((type) => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              className="flex items-center"
                            >
                              <div className="flex items-center">
                                {type.icon}
                                <span className="ml-2">{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.notification_type && (
                        <p className="text-xs text-red-500">{formErrors.notification_type}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">제목</label>
                      <Input
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="알림 제목"
                        className={formErrors.title ? "border-red-500" : ""}
                      />
                      {formErrors.title && (
                        <p className="text-xs text-red-500">{formErrors.title}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">내용</label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="알림 내용을 입력하세요"
                        className={formErrors.message ? "border-red-500" : ""}
                        rows={4}
                      />
                      {formErrors.message && (
                        <p className="text-xs text-red-500">{formErrors.message}</p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddModal(false)}
                      >
                        취소
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "저장 중..." : "저장"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>등록된 알림이 없습니다.</p>
            {user && (user.role === "staff" || user.role === "admin") && !isDashboard && (
              <Button variant="outline" className="mt-4" onClick={() => setShowAddModal(true)}>
                알림 추가하기
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 border rounded-md",
                  notification.is_read ? "bg-background" : "bg-primary/5"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getNotificationTypeInfo(notification.notification_type).icon}
                    <div>
                      <h4
                        className={cn(
                          "font-medium text-sm leading-none",
                          !notification.is_read && "font-semibold"
                        )}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </div>
                  </div>

                  {!isDashboard && user && (user.role === "staff" || user.role === "admin") && (
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          handleToggleReadStatus(notification.id, notification.is_read)
                        }
                      >
                        {notification.is_read ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>알림 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 알림을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(notification.id)}>
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <p className="text-sm whitespace-pre-line">{notification.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* 알림 상세보기 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>알림 상세 내용</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getNotificationTypeInfo(selectedNotification.notification_type).icon}
                <span className="text-sm font-medium">
                  {getNotificationTypeInfo(selectedNotification.notification_type).label}
                </span>
                <Badge
                  variant={selectedNotification.is_read ? "success" : "outline"}
                  className="ml-auto"
                >
                  {selectedNotification.is_read ? "읽음" : "읽지 않음"}
                </Badge>
              </div>

              <div>
                <h3 className="text-lg font-medium">{selectedNotification.title}</h3>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(selectedNotification.created_at), "yyyy. MM. dd HH:mm", {
                    locale: ko,
                  })}
                </div>
              </div>

              <div className="mt-2 p-4 border rounded-md bg-muted/40">
                <p className="whitespace-pre-line">{selectedNotification.message}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
