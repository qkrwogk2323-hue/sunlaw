import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ToastProvider } from '@/components/ui/toast-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vein Spiral v2',
  description: '멀티테넌트 법률 SaaS 재설계 코드베이스'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>
          {children}
          <footer className="border-t border-slate-200 bg-white px-6 py-6 text-sm text-slate-600">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>AI 어시스턴트가 부정확한 답변을 제공할 수 있으니, 답변을 꼭 확인해 주세요.</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/terms" className="underline underline-offset-4">이용약관</Link>
                <Link href="/privacy-policy" className="underline underline-offset-4">개인정보처리방침</Link>
              </div>
            </div>
          </footer>
        </ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
