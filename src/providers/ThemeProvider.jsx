"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  // useEffect는 클라이언트 사이드에서만 실행됩니다
  useEffect(() => {
    setMounted(true);
  }, []);

  // 컴포넌트가 마운트되기 전에는 아무것도 렌더링하지 않습니다
  // 이렇게 하면 서버 사이드 렌더링과 클라이언트 사이드 렌더링 간의 불일치를 방지할 수 있습니다
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
