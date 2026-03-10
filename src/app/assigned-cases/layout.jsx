"use client";

import { FileText } from "lucide-react";

export default function AssignedCasesLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
