import { describe, expect, it, vi } from 'vitest';
import { middleware } from '../middleware';

vi.mock('next/server', () => ({
  NextResponse: {
    next: ({ request }: { request: { nextUrl: URL } }) => ({
      type: 'next',
      url: request.nextUrl.toString()
    }),
    redirect: (url: URL, status = 307) => ({
      type: 'redirect',
      status,
      url: url.toString()
    })
  }
}));

function createRequest(url: string) {
  const nextUrl = new URL(url) as URL & { clone: () => URL };
  nextUrl.clone = () => new URL(nextUrl.toString());

  return {
    url,
    nextUrl
  } as any;
}

describe('root middleware', () => {
  it('redirects legacy apex domain to canonical www domain', async () => {
    const response = await middleware(createRequest('https://veinspiral.com/start'));

    expect(response).toMatchObject({
      type: 'redirect',
      status: 308,
      url: 'https://www.veinspiral.com/start'
    });
  });

  it('keeps oauth code callback redirect behavior', async () => {
    const response = await middleware(createRequest('https://www.veinspiral.com/?code=test-code'));

    expect(response).toMatchObject({
      type: 'redirect',
      status: 307,
      url: 'https://www.veinspiral.com/auth/callback?code=test-code'
    });
  });
});
