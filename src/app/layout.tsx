import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ToastProvider } from '@/components/ui/toast-provider';
import { BRAND } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: BRAND.metadataTitle,
  description: BRAND.metadataDescription
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>{children}</ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
