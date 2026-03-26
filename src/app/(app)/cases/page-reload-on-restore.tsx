'use client';

import { useEffect } from 'react';

/**
 * bfcache(뒤로가기/앞으로가기 캐시)에서 페이지가 복원될 때
 * 서버에서 최신 데이터를 다시 불러오도록 강제 새로고침한다.
 * 또한 ?highlight= 파라미터가 있으면 해당 사건으로 스크롤한다.
 */
export function PageReloadOnRestore() {
  useEffect(() => {
    // bfcache 복원 시 강제 새로고침
    const handler = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handler);

    // 새 사건 강조 표시 스크롤
    const el = document.getElementById('newly-created-case');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => window.removeEventListener('pageshow', handler);
  }, []);
  return null;
}
