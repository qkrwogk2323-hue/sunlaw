import { NextResponse } from 'next/server';

// 사건유형 가능 값: 민사 | 채권 | 집행 | 가처분 | 형사 | 자문 | 기타
const TEMPLATE = [
  '사건명,사건유형,사건번호,법원명,의뢰금액,개시일,의뢰인,상대방,요약',
  '"홍길동 손해배상 청구",민사,"2024가단12345","서울중앙지방법원","50000000","2024-03-01","홍길동","ABC주식회사","계약 불이행으로 인한 손해배상"',
  '"이순신 채권회수",채권,"2024타채56789","수원지방법원","30000000","2024-02-15","이순신","박씨","대여금 미반환"',
].join('\n');

export function GET() {
  return new NextResponse('\uFEFF' + TEMPLATE, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cases-template.csv"',
    },
  });
}
