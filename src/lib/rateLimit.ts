import { envInt } from '@/lib/envInt';
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

// Every limit is env-overridable so a deployment can retune throughput
// (behind a CDN with a shared IP, say, or under a load test) without a
// redeploy. Falling back to today's literals keeps default behavior
// unchanged when nothing is set.
function limitFromEnv(name: string, defaultLimit: number, defaultWindowMs: number) {
  return {
    limit: envInt(`RATE_LIMIT_${name}_MAX`, defaultLimit),
    windowMs: envInt(`RATE_LIMIT_${name}_WINDOW_MS`, defaultWindowMs),
  };
}

export const RATE_LIMITS = {
  login: limitFromEnv('LOGIN', 5, 60_000),
  register: limitFromEnv('REGISTER', 5, 60_000),
  refresh: limitFromEnv('REFRESH', 20, 60_000),
  logout: limitFromEnv('LOGOUT', 10, 60_000),
  // Fired on real user activity while a session is open (see
  // `/api/auth/heartbeat`); throttled client-side to roughly once a minute
  // per open tab. Unlike login/register, this is keyed by IP alone with no
  // per-account scoping (a heartbeat carries no stable session identifier to
  // scope by — tokens rotate), so the default has to comfortably cover many
  // genuinely active users — and their multiple open tabs — sharing one
  // office/NAT IP, not just one person. A heartbeat is a cheap cookie touch,
  // so a generous budget here costs little.
  heartbeat: limitFromEnv('HEARTBEAT', 120, 60_000),
} as const;
