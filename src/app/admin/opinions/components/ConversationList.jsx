import React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, RefreshCw, User, Clock } from "lucide-react";

export function ConversationList({
  opinions,
  loading,
  refreshing,
  fetchOpinions,
  selectedOpinion,
  handleSelectOpinion,
  searchQuery,
  setSearchQuery,
  user,
}) {
  // 대화 스레드로 그룹화하는 함수
  const getConversationThreads = () => {
    // 부모 메시지가 없는 최상위 메시지만 필터링
    return Array.from(
      new Set(
        opinions
          .filter((op) => !op.parent_id)
          // 시간순으로 정렬
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          // 검색어 필터링
          .filter(
            (op) =>
              !searchQuery ||
              op.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              op.creditor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              op.debtor_name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          // 자신이 보냈거나 받은 메시지만 표시
          .filter((op) => op.created_by === user.id || op.receiver_id === user.id)
          .map((op) => op.id)
      )
    );
  };

  // 대화 스레드를 렌더링하는 함수
  const renderConversationThreads = () => {
    const threadIds = getConversationThreads();

    if (threadIds.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
          {searchQuery ? "검색 결과가 없습니다." : "대화 내역이 없습니다."}
        </div>
      );
    }

    return threadIds.map((threadId) => {
      // 대화 스레드의 최상위 메시지
      const rootMessage = opinions.find((op) => op.id === threadId);
      if (!rootMessage) return null;

      // 이 스레드의 모든 메시지 (최상위 메시지의 ID가 root_id인 메시지들)
      const threadMessages = opinions.filter(
        (op) =>
          op.id === threadId ||
          op.parent_id === threadId ||
          (op.parent_id &&
            opinions.find((parent) => parent.id === op.parent_id)?.parent_id === threadId)
      );

      // 가장 최근 메시지
      const latestMessage = threadMessages.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0];

      // 읽지 않은 메시지 수
      const unreadCount = threadMessages.filter(
        (op) => op.receiver_id === user.id && !op.is_read
      ).length;

      // 상대방 정보
      const otherParty =
        rootMessage.created_by === user.id ? rootMessage.receiver : rootMessage.created_by_user;

      // 현재 선택된 대화인지 확인
      const isSelected =
        selectedOpinion &&
        (selectedOpinion.id === threadId ||
          selectedOpinion.parent_id === threadId ||
          (selectedOpinion.parent_id &&
            opinions.find((parent) => parent.id === selectedOpinion.parent_id)?.parent_id ===
              threadId));

      return (
        <div
          key={threadId}
          className={`p-4 rounded-lg border transition-colors cursor-pointer ${
            isSelected
              ? "bg-primary/10 border-primary dark:bg-primary/20 dark:border-primary/70"
              : "hover:bg-muted/50 dark:hover:bg-gray-800 dark:border-gray-700"
          }`}
          onClick={() => handleSelectOpinion(latestMessage)}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* 대화방 제목 (원래 메시지의 제목) */}
              <div
                className={`font-medium truncate mb-1 ${
                  isSelected ? "text-primary dark:text-primary-foreground" : "dark:text-gray-100"
                }`}
              >
                {rootMessage.title.replace(/^(Re: )+/, "")}
              </div>

              {/* 상대방 정보 */}
              <div className="text-sm text-muted-foreground mb-1 flex items-center dark:text-gray-300">
                <User className="h-3 w-3 mr-1 inline" />
                {otherParty?.name || "알 수 없음"}
              </div>

              {/* 채권자/채무자 정보 */}
              <div className="text-xs mb-1 flex flex-wrap gap-1">
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded flex items-center">
                  <span className="font-semibold mr-1">채권자:</span>
                  {rootMessage.creditor_name || "정보 없음"}
                </span>
                <span className="bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 px-1.5 py-0.5 rounded flex items-center">
                  <span className="font-semibold mr-1">채무자:</span>
                  {rootMessage.debtor_name || "정보 없음"}
                </span>
              </div>

              {/* 최근 메시지 미리보기 */}
              <div className="text-xs text-muted-foreground truncate dark:text-gray-400">
                {latestMessage.message?.split("\n")[0]}
              </div>

              {/* 날짜 정보 */}
              <div className="text-xs text-muted-foreground mt-1 flex items-center dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1 inline" />
                {format(new Date(latestMessage.created_at), "yy. M. d HH:mm", {
                  locale: ko,
                })}
              </div>
            </div>

            {/* 읽지 않은 메시지 표시 */}
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <Card className="md:col-span-1 h-[calc(100vh-180px)] flex flex-col dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-3 space-y-4 flex-shrink-0">
        <div className="flex items-center gap-2 justify-between">
          <h3 className="text-lg font-medium dark:text-gray-100">대화 목록</h3>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchOpinions}
            disabled={refreshing}
            className="dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:border-gray-600"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {loading ? (
            <div className="space-y-3 mt-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-3 border rounded-lg dark:border-gray-700">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-4/5 mb-2 dark:bg-gray-700" />
                      <Skeleton className="h-4 w-3/5 mb-1 dark:bg-gray-700" />
                      <Skeleton className="h-3 w-2/5 dark:bg-gray-700" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded-full dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 mt-3">{renderConversationThreads()}</div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
