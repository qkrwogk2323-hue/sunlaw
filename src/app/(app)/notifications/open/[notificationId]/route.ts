import { NextResponse, type NextRequest } from 'next/server';
import { resolveNotificationOpenTarget } from '@/lib/notification-open';
import { ROUTES } from '@/lib/routes/registry';

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;

  try {
    const targetHref = await resolveNotificationOpenTarget({
      notificationId,
      nextOrganizationId: request.nextUrl.searchParams.get('organizationId'),
      submittedHref: request.nextUrl.searchParams.get('href')
    });

    return NextResponse.redirect(new URL(targetHref, request.url));
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    return NextResponse.redirect(new URL(ROUTES.NOTIFICATIONS, request.url));
  }
}
