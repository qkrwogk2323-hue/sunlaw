const DEFAULT_AUTH_COOKIE_NAME = 'sb-hyfdebinoirtluwpfmqx-auth-token';

function normalizeHostname(hostname: string) {
  return hostname.trim().replace(/^www\./, '');
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

export function resolveCanonicalAuthOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredOrigin) {
    return null;
  }

  try {
    const parsed = new URL(configuredOrigin);
    if (parsed.protocol === 'https:' || parsed.hostname === 'localhost') {
      return parsed.origin;
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveSupabaseCookieDomain(hostname?: string | null) {
  const candidate = hostname?.trim()
    || (resolveCanonicalAuthOrigin() ? new URL(resolveCanonicalAuthOrigin()!).hostname : '');
  if (!candidate) return undefined;

  const normalized = normalizeHostname(candidate);
  if (!normalized || isLocalHost(normalized)) return undefined;

  // Keep auth cookies host-only to avoid PKCE verifier loss on cross-host transitions.
  return undefined;
}

function shouldUseSecureCookies(hostname?: string | null, protocol?: string | null) {
  const normalizedHostname = hostname?.trim() ?? '';
  if (normalizedHostname && isLocalHost(normalizedHostname)) {
    return false;
  }
  if (protocol) {
    return protocol === 'https:';
  }

  const canonicalOrigin = resolveCanonicalAuthOrigin();
  return canonicalOrigin?.startsWith('https://') ?? false;
}

export function getSupabaseCookieOptions(hostname?: string | null, protocol?: string | null) {
  const canonicalOrigin = resolveCanonicalAuthOrigin();
  return {
    name: DEFAULT_AUTH_COOKIE_NAME,
    path: '/',
    sameSite: 'lax' as const,
    secure: shouldUseSecureCookies(hostname, protocol),
    domain: resolveSupabaseCookieDomain(hostname)
  };
}
