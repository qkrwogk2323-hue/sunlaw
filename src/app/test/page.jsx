"use client";
import React, { useState } from "react";

export default function ImportCasesPage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("파일을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-cases", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      setMessage(result.message);
    } catch (err) {
      setMessage("업로드 중 에러가 발생했습니다.");
    }
  };

  return (
    <div>
      <h1>사건 엑셀 업로드</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit">업로드</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
