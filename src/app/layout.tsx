import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.veinspiral.com'),
  applicationName: 'VEIN SPIRAL',
  title: {
    default: 'VEIN SPIRAL | 전문가 협업 사건 관리',
    template: '%s | VEIN SPIRAL'
  },
  description: '법률, 추심, 보험, 금융, 부동산 전문가가 한 사건 흐름과 의뢰인 소통을 함께 관리하는 협업 플랫폼입니다.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: 'VEIN SPIRAL',
    title: 'VEIN SPIRAL | 전문가 협업 사건 관리',
    description: '법률, 추심, 보험, 금융, 부동산 전문가가 한 사건 흐름과 의뢰인 소통을 함께 관리하는 협업 플랫폼입니다.'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VEIN SPIRAL | 전문가 협업 사건 관리',
    description: '법률, 추심, 보험, 금융, 부동산 전문가가 한 사건 흐름과 의뢰인 소통을 함께 관리하는 협업 플랫폼입니다.'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
