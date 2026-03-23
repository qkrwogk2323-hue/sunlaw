/**
 * DEPRECATED: This endpoint is no longer in use.
 * Returns 410 Gone unconditionally to eliminate any account-existence oracle surface.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: '\uc774 \uacbd\ub85c\ub294 \ub354 \uc774\uc0c1 \uc0ac\uc6a9\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.' },
    { status: 410 }
  );
}
