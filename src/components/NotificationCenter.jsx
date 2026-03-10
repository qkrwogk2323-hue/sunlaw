"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";
import { Bell, CheckCircle2, Clock, FileText, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function NotificationCenter() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // 알림이 열릴 때마다 알림 목록을 새로고침
  useEffect(() => {
    if (open && user) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 최신 알림 30개 가져오기
      const { data, error } = await supabase
        .from("test_individual_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      setNotifications(data || []);

      // 읽지 않은 알림 개수 계산
      const unreadNotifications = data ? data.filter((n) => !n.is_read).length : 0;
      setUnreadCount(unreadNotifications);
    } catch (error) {
      console.error("알림 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // 상태 업데이트
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      // 읽지 않은 알림 개수 업데이트
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("알림 읽음 처리 실패:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      // 상태 업데이트
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast.success("모든 알림을 읽음으로 표시했습니다");
    } catch (error) {
      console.error("모든 알림 읽음 처리 실패:", error);
      toast.error("알림 읽음 처리 실패");
    }
  };

  // 알림 종류에 따른 아이콘 반환
  const getNotificationIcon = (notification) => {
    switch (notification.notification_type) {
      case "lawsuit":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "lawsuit_update":
        return <Clock className="h-4 w-4 text-indigo-500" />;
      case "recovery_activity":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getRelatedPath = (notification) => {
    // 관련 사건 페이지로 이동하는 경로 반환
    return `/cases/${notification.case_id}`;
  };

  const handleNotificationClick = async (notification) => {
    // 읽지 않은 알림이면 읽음으로 표시
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // 알림 팝오버 닫기
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="알림">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] bg-red-500 border-red-500 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        ref={popoverRef}
        side="bottom"
        sideOffset={5}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={markAllAsRead}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50 rounded-none h-10 p-0">
            <TabsTrigger value="all" className="rounded-none data-[state=active]:bg-background">
              전체
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-none data-[state=active]:bg-background">
              읽지 않음 {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[400px] px-1">
              {loading ? (
                <div className="space-y-3 p-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex p-3 gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>알림이 없습니다</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50",
                        !notification.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className={cn("text-sm", !notification.is_read && "font-medium")}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ko,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[400px] px-1">
              {loading ? (
                <div className="space-y-3 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex p-3 gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.filter((n) => !n.is_read).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>읽지 않은 알림이 없습니다</p>
                </div>
              ) : (
                <div>
                  {notifications
                    .filter((notification) => !notification.is_read)
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 bg-blue-50/50 dark:bg-blue-900/10"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5">{getNotificationIcon(notification)}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
