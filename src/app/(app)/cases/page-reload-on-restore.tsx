'use client';

import { useEffect } from 'react';

/**
 * bfcache(뒤로가기/앞으로가기 캐시)에서 페이지가 복원될 때
 * 서버에서 최신 데이터를 다시 불러오도록 강제 새로고침한다.
 */
export function PageReloadOnRestore() {
  useEffect(() => {
    const handler = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);
  return null;
}
