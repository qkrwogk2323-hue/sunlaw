import { NextResponse } from 'next/server';

const TEMPLATE = [
  '이름,이메일,연락처,관계,메모,사건번호',
  '"홍길동","hong@example.com","010-1234-5678","의뢰인","VIP 고객","2024가단12345"',
  '"이순신","lee@example.com","010-9876-5432","의뢰인","","2024타채56789"',
].join('\n');

export function GET() {
  return new NextResponse('\uFEFF' + TEMPLATE, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients-template.csv"',
    },
  });
}
