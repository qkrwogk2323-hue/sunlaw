"use client";

import { useState } from "react";
import { Upload, FileCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function FileUploadDropzone({
  onFileSelect,
  onFileRemove,
  selectedFile,
  existingFileUrl,
  fileUrlLabel = "기존 파일이 있습니다",
  uploadLabel = "파일을 이곳에 끌어서 놓거나 클릭하여 업로드",
  replaceLabel = "파일을 이곳에 끌어서 놓거나 클릭하여 교체",
  id = "file-upload",
  accept,
  maxSizeMB = 10,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    // 파일 사이즈 체크
    if (maxSizeMB > 0 && file.size > maxSizeMB * 1024 * 1024) {
      toast.error("파일 크기 초과", {
        description: `${maxSizeMB}MB 이하의 파일만 업로드할 수 있습니다.`,
      });
      return;
    }

    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // 이미 파일이 선택되어 있는 경우
  if (selectedFile) {
    return (
      <div className="border rounded p-2 flex items-center justify-between">
        <div className="flex items-center">
          <FileCheck className="h-4 w-4 mr-2 text-green-500" />
          <span className="text-sm truncate max-w-[280px]">{selectedFile.name}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onFileRemove}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // 기존 파일 URL이 있는 경우
  if (existingFileUrl) {
    return (
      <div className="border rounded p-2 flex items-center justify-between">
        <div className="flex items-center">
          <FileCheck className="h-4 w-4 mr-2 text-blue-500" />
          <span className="text-sm">
            {fileUrlLabel}{" "}
            <Link href={existingFileUrl} target="_blank" className="text-blue-500 hover:underline">
              보기
            </Link>
          </span>
        </div>
      </div>
    );
  }

  // 드롭존 기본 상태
  return (
    <label htmlFor={id} className="w-full cursor-pointer">
      <div
        className={`
          border border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 
          hover:bg-muted/40 transition-colors
          ${isDragging ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          {existingFileUrl ? replaceLabel : uploadLabel}
        </p>
        <input type="file" id={id} className="hidden" onChange={handleFileChange} accept={accept} />
      </div>
    </label>
  );
}
