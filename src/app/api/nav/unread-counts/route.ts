import { NextResponse } from 'next/server';
import { getNavUnreadCounts } from '@/lib/queries/notifications';

export async function GET() {
  const counts = await getNavUnreadCounts();
  return NextResponse.json(counts, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
