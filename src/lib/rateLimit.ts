import { NextResponse } from 'next/server';

// Fixed-window rate limiter for the authentication routes. State lives in
// this process's memory — right for a single Next container, and bounded by
// the sweep below so a flood of distinct IPs can't grow the map without limit.

interface Window {
  count: number;
  /** Epoch ms at which this window ends and the count resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweptAt = 0;

function sweep(now: number): void {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  window.count += 1;

  if (window.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** The 429 every rate-limited route returns, worded identically regardless of which limit was hit. */
export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { message: 'Too many attempts. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 60_000 },
  register: { limit: 5, windowMs: 60_000 },
  refresh: { limit: 20, windowMs: 60_000 },
  logout: { limit: 10, windowMs: 60_000 },
} as const;
