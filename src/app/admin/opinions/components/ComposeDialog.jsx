import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, RefreshCw } from "lucide-react";

export function ComposeDialog({
  showComposeDialog,
  setShowComposeDialog,
  newMessage,
  setNewMessage,
  receivers,
  receiverCases,
  handleSelectReceiver,
  handleSelectCase,
  handleSendNewMessage,
  sendingReply,
}) {
  return (
    <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
      <DialogContent className="sm:max-w-[600px] dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">새 대화 시작</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            담당자에게 새로운 메시지를 보냅니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="receiver" className="text-right dark:text-gray-300">
              받는 사람
            </label>
            <Select value={newMessage.receiver_id} onValueChange={handleSelectReceiver}>
              <SelectTrigger
                id="receiver"
                className="col-span-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              >
                <SelectValue placeholder="수신자 선택" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                {receivers.length > 0 ? (
                  receivers.map((receiver) => (
                    <SelectItem key={receiver.id} value={receiver.id}>
                      {receiver.name} ({receiver.position ? `${receiver.position} - ` : ""}
                      {receiver.email})
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-2 px-2 text-sm text-center text-muted-foreground dark:text-gray-400">
                    담당자가 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {newMessage.receiver_id && (
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="case" className="text-right dark:text-gray-300">
                담당 사건
              </label>
              <div className="col-span-3">
                <Select value={newMessage.case_id} onValueChange={handleSelectCase}>
                  <SelectTrigger
                    id="case"
                    className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  >
                    <SelectValue placeholder="담당 사건 선택 (선택사항)">
                      {newMessage.case_id && newMessage.case_id !== "none" && (
                        <div className="text-sm">
                          채권자: {newMessage.creditor_name || "정보 없음"} / 채무자:{" "}
                          {newMessage.debtor_name || "정보 없음"}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-80 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                    <SelectItem value="none">선택 안함</SelectItem>
                    {receiverCases.length > 0 ? (
                      receiverCases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id} className="py-3">
                          <div className="text-sm">
                            채권자: {caseItem.creditor_name || "정보 없음"} / 채무자:{" "}
                            {caseItem.debtor_name || "정보 없음"}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 px-2 text-sm text-center text-muted-foreground dark:text-gray-400">
                        담당 사건이 없습니다
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {newMessage.case_id && newMessage.case_id !== "none" && (
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="text-right pt-2 dark:text-gray-300">사건 정보</div>
              <div className="col-span-3 p-4 bg-muted rounded-lg text-sm border dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                <div>
                  <span className="font-medium">채권자:</span>{" "}
                  {newMessage.creditor_name || "정보 없음"}
                </div>
                <div className="mt-2">
                  <span className="font-medium">채무자:</span>{" "}
                  {newMessage.debtor_name || "정보 없음"}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="title" className="text-right dark:text-gray-300">
              제목
            </label>
            <Input
              id="title"
              value={newMessage.title}
              onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
              className="col-span-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              placeholder="메시지 제목을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <label htmlFor="message" className="text-right pt-2 dark:text-gray-300">
              내용
            </label>
            <Textarea
              id="message"
              value={newMessage.message}
              onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
              rows={5}
              className="col-span-3 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              placeholder="메시지 내용을 입력하세요"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowComposeDialog(false)}
            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            취소
          </Button>
          <Button
            onClick={handleSendNewMessage}
            disabled={
              !newMessage.title.trim() ||
              !newMessage.message.trim() ||
              !newMessage.receiver_id ||
              sendingReply
            }
            className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
          >
            {sendingReply ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            보내기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
