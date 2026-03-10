import React, { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageSquare, Send, Check, CheckCheck, Trash2, MoreHorizontal } from "lucide-react";

export function ChatView({
  selectedOpinion,
  opinions,
  user,
  replyMessage,
  setReplyMessage,
  sendingReply,
  handleSendReply,
  setSelectedOpinions,
  setShowDeleteConfirm,
  replyInputRef,
}) {
  const scrollEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 메시지 선택 시 스크롤 위치 조정
  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedOpinion, opinions]);

  // 메시지 전송 후 스크롤 위치 조정
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollEndRef.current) {
        scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [replyMessage]);

  // 키보드 이벤트 처리 - Enter 키로 메시지 전송 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (replyMessage.trim()) {
        handleSendReply();
      }
    }
  };

  // 현재 대화에 속한 모든 메시지 찾기
  const getConversationMessages = () => {
    if (!selectedOpinion) return [];

    // 최상위 메시지 ID 찾기
    let rootId = selectedOpinion.id;
    if (selectedOpinion.parent_id) {
      const parent = opinions.find((op) => op.id === selectedOpinion.parent_id);
      rootId = parent?.parent_id || parent?.id || selectedOpinion.id;
    }

    // 현재 대화에 속한 모든 메시지
    return opinions
      .filter(
        (op) =>
          op.id === rootId ||
          op.parent_id === rootId ||
          (op.parent_id && opinions.find((p) => p.id === op.parent_id)?.parent_id === rootId)
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  // 날짜별로 메시지 그룹화
  const groupMessagesByDate = (messages) => {
    return messages.reduce((acc, message) => {
      const date = new Date(message.created_at).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(message);
      return acc;
    }, {});
  };

  // 대화방 제목 구하기
  const getConversationTitle = () => {
    if (!selectedOpinion) return "";

    // 최상위 메시지 제목 찾기
    let title = selectedOpinion.title.replace(/^(Re: )+/, "");
    if (selectedOpinion.parent_id) {
      const parent = opinions.find((op) => op.id === selectedOpinion.parent_id);
      if (parent) {
        title = parent.title.replace(/^(Re: )+/, "");
      }
    }
    return title;
  };

  if (!selectedOpinion) {
    return (
      <div className="md:col-span-2 flex items-center justify-center h-[calc(100vh-180px)] bg-white border rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>메시지를 선택해주세요</p>
        </div>
      </div>
    );
  }

  const conversationMessages = getConversationMessages();
  const messagesByDate = groupMessagesByDate(conversationMessages);

  return (
    <div className="md:col-span-2 flex flex-col h-[calc(100vh-180px)] bg-white border rounded-lg shadow overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      {/* 대화 헤더 */}
      <div className="p-4 border-b flex items-center justify-between dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg truncate text-gray-900 dark:text-gray-100">
            {getConversationTitle()}
          </h3>

          {/* 채권자/채무자 정보 */}
          <div className="text-xs flex gap-1 mt-1">
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded">
              <span className="font-semibold">채권자:</span>{" "}
              {selectedOpinion.creditor_name || "정보 없음"}
            </span>
            <span className="bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 px-1.5 py-0.5 rounded">
              <span className="font-semibold">채무자:</span>{" "}
              {selectedOpinion.debtor_name || "정보 없음"}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            className="p-2 rounded-md border bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
            onClick={() => {
              setSelectedOpinions([selectedOpinion]);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div
        className="flex-1 p-4 overflow-y-auto"
        ref={chatContainerRef}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#4b5563 transparent" }}
      >
        <div className="space-y-6">
          {Object.entries(messagesByDate).map(([date, messages], dateIndex) => (
            <div key={date} className="space-y-4">
              <div className="relative my-4 flex items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
                <span className="flex-shrink mx-4 text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(date), "yyyy년 M월 d일", { locale: ko })}
                </span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
              </div>

              {messages.map((message) => {
                const isMine = message.created_by === user.id;
                const senderName = isMine ? "나" : message.created_by_user?.name || "알 수 없음";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] ${isMine ? "text-right" : "text-left"}`}>
                      {/* 발신자 정보 */}
                      <div
                        className={`flex items-center mb-1 text-xs text-gray-500 dark:text-gray-400 ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isMine && <span className="font-medium mr-2">{senderName}</span>}
                        <span>
                          {format(new Date(message.created_at), "HH:mm", {
                            locale: ko,
                          })}
                        </span>
                        {isMine && <span className="font-medium ml-2">{senderName}</span>}
                      </div>

                      {/* 메시지 내용 */}
                      <div
                        className={`px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm ${
                          isMine
                            ? "bg-blue-500 text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 rounded-tl-none"
                        }`}
                      >
                        {message.message}
                      </div>

                      {/* 읽음 상태 표시 */}
                      {isMine && (
                        <div className="text-xs mt-1">
                          {message.is_read ? (
                            <span className="flex items-center justify-end">
                              <CheckCheck className="h-3 w-3 text-blue-500 mr-1 dark:text-blue-400" />
                              <span className="text-blue-600 dark:text-blue-400">읽음</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-end">
                              <Check className="h-3 w-3 text-gray-500 mr-1" />
                              <span className="text-gray-600 dark:text-gray-400">전송됨</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* 스크롤 위치 조정을 위한 참조 */}
          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* 메시지 입력 영역 */}
      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 min-h-[60px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            ref={replyInputRef}
          />
          <button
            onClick={handleSendReply}
            disabled={!replyMessage.trim() || sendingReply}
            className={`p-2 rounded-md ${
              !replyMessage.trim() || sendingReply
                ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
