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
import { Trash2 } from "lucide-react";

export function DeleteConfirmDialog({
  showDeleteConfirm,
  setShowDeleteConfirm,
  selectedOpinions,
  handleDeleteOpinions,
}) {
  return (
    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100 flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-destructive" />
            쪽지 삭제
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            선택한 {selectedOpinions.length}개의 쪽지를 삭제하시겠습니까? 이 작업은 되돌릴 수
            없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteOpinions}
            className="bg-destructive hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
          >
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
