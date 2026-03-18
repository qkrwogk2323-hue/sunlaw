import { NextResponse, type NextRequest } from 'next/server';
import { resolveNotificationOpenTarget } from '@/lib/notification-open';

export async function GET(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;

  try {
    const targetHref = await resolveNotificationOpenTarget({
      notificationId,
      nextOrganizationId: request.nextUrl.searchParams.get('organizationId'),
      submittedHref: request.nextUrl.searchParams.get('href')
    });

    return NextResponse.redirect(new URL(targetHref, request.url));
  } catch {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
