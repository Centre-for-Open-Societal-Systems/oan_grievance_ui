import { logger } from '@/lib/logger';

// Derives the caller's IP from a request that reached us through a reverse
// proxy. `X-Forwarded-For` is client-writable and each hop appends its own
// view of the peer, so the trustworthy entries are the rightmost ones — one
// per proxy this app actually sits behind.
const DEFAULT_TRUSTED_PROXY_HOPS = 1;
const MAX_TRUSTED_PROXY_HOPS = 4;

export const UNKNOWN_CLIENT_IP = 'unknown';

function trustedProxyHops(): number {
  const raw = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '', 10);
  if (!Number.isInteger(raw) || raw < 1) return DEFAULT_TRUSTED_PROXY_HOPS;
  return Math.min(raw, MAX_TRUSTED_PROXY_HOPS);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const chain = forwardedFor
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (chain.length > 0) {
      const hops = trustedProxyHops();

      if (chain.length < hops) {
        logger.security(
          `X-Forwarded-For has ${chain.length} entr${chain.length === 1 ? 'y' : 'ies'} but ` +
            `TRUSTED_PROXY_HOPS is ${hops}; falling back to the nearest hop.`
        );
        return chain[chain.length - 1] as string;
      }

      const ip = chain[chain.length - hops];
      if (ip) return ip;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return UNKNOWN_CLIENT_IP;
}
