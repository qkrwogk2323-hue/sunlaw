"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell,
  FileText as FileTextIcon,
  Gavel,
  CreditCard,
  CalendarIcon,
  CheckCircle2,
  ChevronRight,
  CheckSquare,
  ChevronDown,
} from "lucide-react";

export default function NotificationSummary({ notifications, loading }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("unread");
  const [displayCount, setDisplayCount] = useState(5);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);

  // 알림 데이터가 변경될 때마다 상태 업데이트
  useEffect(() => {
    if (notifications) {
      console.log("NotificationSummary - 알림 데이터 업데이트:", notifications.length);
      setAllNotifications(notifications);
    }
  }, [notifications]);

  const filterNotifications = (tab) => {
    // 읽음/읽지 않음 상태에 따라 필터링
    if (tab === "unread") {
      const unreadNotifs = allNotifications.filter((n) => !n.is_read);
      console.log("읽지 않은 알림 필터링:", unreadNotifs.length);
      setFilteredNotifications(unreadNotifs);
    } else {
      console.log("전체 알림 표시:", allNotifications.length);
      setFilteredNotifications(allNotifications);
    }
  };

  // 탭이나 알림 목록이 변경될 때 필터링
  useEffect(() => {
    if (allNotifications.length > 0) {
      console.log("NotificationSummary - 필터링 실행:", activeTab, allNotifications.length);
      filterNotifications(activeTab);
    }
  }, [activeTab, allNotifications]);

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    console.log("탭 변경:", tab);
    setActiveTab(tab);
    setDisplayCount(5); // 탭 변경 시 표시 개수 초기화
  };

  // 알림 유형에 따른 아이콘 반환
  const getNotificationIcon = (type) => {
    switch (type) {
      case "lawsuit":
        return <FileTextIcon className="h-4 w-4 text-blue-500" />;
      case "lawsuit_update":
        return <Gavel className="h-4 w-4 text-purple-500" />;
      case "recovery_activity":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case "deadline":
        return <CalendarIcon className="h-4 w-4 text-red-500" />;
      case "document":
        return <FileTextIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification) => {
    // 알림을 읽음으로 표시
    updateNotificationReadStatus(notification.id);

    // 로컬 상태 업데이트
    const updatedNotifications = allNotifications.map((n) =>
      n.id === notification.id ? { ...n, is_read: true } : n
    );
    setAllNotifications(updatedNotifications);

    // 사건 상세 페이지로 이동
    router.push(`/cases/${notification.case_id}`);
  };

  const updateNotificationReadStatus = async (notificationId) => {
    try {
      await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
    } catch (error) {
      console.error("알림 상태 업데이트 실패:", error);
    }
  };

  const markAsRead = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      // 로컬 상태 업데이트
      const updatedNotifications = allNotifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );

      setAllNotifications(updatedNotifications);
    } catch (error) {
      console.error("알림 상태 업데이트 실패:", error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = allNotifications.filter((n) => !n.is_read);
      if (unreadNotifications.length === 0) {
        toast.info("읽지 않은 알림이 없습니다.");
        return;
      }

      const unreadIds = unreadNotifications.map((n) => n.id);
      await supabase
        .from("test_individual_notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      // 로컬 상태 업데이트
      const updatedNotifications = allNotifications.map((n) => ({ ...n, is_read: true }));
      setAllNotifications(updatedNotifications);

      toast.success(`${unreadNotifications.length}개의 알림을 읽음 처리했습니다.`);
    } catch (error) {
      console.error("알림 전체 읽음 처리 실패:", error);
      toast.error("알림 읽음 처리 중 오류가 발생했습니다.");
    }
  };

  // 더 보기 핸들러
  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 3);
  };

  // 읽지 않은 알림 수 계산
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Bell className="h-5 w-5 mr-2 text-amber-500" /> 최근 알림
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{unreadCount}</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs flex items-center"
            onClick={markAllAsRead}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1" /> 전체 읽음
          </Button>
        </div>
        <div className="flex justify-between items-center mb-2">
          <CardDescription>사건과 관련된 최신 알림</CardDescription>
          <Tabs
            defaultValue="unread"
            value={activeTab}
            onValueChange={handleTabChange}
            className="h-8"
          >
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="unread" className="text-xs h-7 px-2 py-0">
                읽지 않은 알림
                {unreadCount > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white text-[10px] min-w-4 h-4">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs h-7 px-2 py-0">
                전체 알림
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>{activeTab === "unread" ? "읽지 않은 알림이 없습니다." : "알림이 없습니다."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.slice(0, displayCount).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 border rounded-md cursor-pointer transition-colors",
                  notification.is_read
                    ? "bg-background hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    : "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4
                        className={cn(
                          "font-medium text-sm",
                          !notification.is_read && "font-semibold"
                        )}
                      >
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 mt-1"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 mb-1">
                      {notification.message}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={(e) => markAsRead(e, notification.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> 읽음
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/cases/${notification.case_id}`);
                          }}
                        >
                          <ChevronRight className="h-3 w-3 mr-1" /> 보기
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {displayCount < filteredNotifications.length && (
              <div className="text-center pt-1">
                <Button variant="outline" size="sm" className="text-xs" onClick={handleLoadMore}>
                  <ChevronDown className="h-3 w-3 mr-1" /> 더보기 (
                  {filteredNotifications.length - displayCount}개)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
