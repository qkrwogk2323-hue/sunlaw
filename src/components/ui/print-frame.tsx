'use client';

import { useCallback, useRef, useEffect } from 'react';

const PRINT_STYLES = `
@media print {
  @page {
    size: A4;
    margin: 45mm 20mm 30mm 20mm;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: '휴먼명조', 'Batang', serif;
    font-size: 12pt;
    line-height: 200%;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-break {
    page-break-before: always;
  }
  table { page-break-inside: avoid; font-size: 10pt; line-height: 160%; border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #333; padding: 6px 4px; }
  th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
  h1, h2, h3 { page-break-after: avoid; }
  h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 20mm; }
  @page { @bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; color: #666; } }
}
@media screen {
  body {
    font-family: '휴먼명조', 'Batang', serif;
    font-size: 12pt;
    line-height: 200%;
    color: #000;
    max-width: 210mm;
    margin: 0 auto;
    padding: 45mm 20mm 30mm 20mm;
  }
  table { font-size: 10pt; line-height: 160%; border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #333; padding: 6px 4px; }
  th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
  h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 20mm; }
}
`;

interface PrintFrameProps {
  html: string;
  onClose?: () => void;
}

export function PrintFrame({ html, onClose }: PrintFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const wrappedHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>${PRINT_STYLES}</style>
</head>
<body>${html}</body>
</html>`;

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, []);

  // 자동 인쇄: iframe 로드 후 print 트리거
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      // 브라우저가 렌더링 완료할 때까지 약간 대기
      setTimeout(() => handlePrint(), 300);
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [handlePrint]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="인쇄 미리보기">
      <div className="relative flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">인쇄 미리보기</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              onClick={handlePrint}
              aria-label="인쇄 / PDF 저장"
            >
              인쇄 / PDF 저장
            </button>
            {onClose && (
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                onClick={onClose}
                aria-label="닫기"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            srcDoc={wrappedHtml}
            className="h-full w-full border-0"
            title="인쇄 미리보기"
            sandbox="allow-same-origin allow-modals"
          />
        </div>
      </div>
    </div>
  );
}
