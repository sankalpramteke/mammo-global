import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter — per IP, per route
// For production with multiple instances, replace with Redis (e.g. @upstash/ratelimit)
const _store = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX       = 8;       // max attempts per window

const PROTECTED_PREFIXES = [
  '/api/auth/login',
  '/api/hospital-auth/login',
];

function getRateLimitKey(req: NextRequest): string | null {
  const path = req.nextUrl.pathname;
  if (!PROTECTED_PREFIXES.some(p => path.startsWith(p))) return null;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  return `${ip}:${path}`;
}

export function middleware(req: NextRequest) {
  if (req.method !== 'POST') return NextResponse.next();

  const key = getRateLimitKey(req);
  if (!key) return NextResponse.next();

  const now  = Date.now();
  const entry = _store.get(key);

  if (!entry || entry.resetAt < now) {
    _store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return NextResponse.next();
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      {
        status: 429,
        headers: {
          'Retry-After':      String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/hospital-auth/login'],
};
