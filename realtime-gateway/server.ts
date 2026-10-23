import { config } from "dotenv";
config({ path: ".env.local" });
import http from 'node:http';
import httpProxy from 'http-proxy-3';
import { decodeAccessToken, isExpired, peekToken } from '../src/lib/jwt';
import { decodeLoginOption, IAM_COOKIES, iamCookieName, LOGIN_OPTION_COOKIE } from '../src/lib/loginOption';
import { checkRateLimit, RATE_LIMITS } from '../src/lib/rateLimit';

// Helper to parse cookies from a raw Cookie header
function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx !== -1) {
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key && value) cookies[key] = value;
    }
  }
  return cookies;
}

// We mock CookieReader since we are not in Next.js
// but we reuse the logic from idleSession
import { hasRecentActivity } from '../src/lib/idleSession';

const port = process.env.REALTIME_GATEWAY_PORT ? parseInt(process.env.REALTIME_GATEWAY_PORT, 10) : 3001;
const allowedOrigins = process.env.REALTIME_ALLOWED_ORIGINS ? process.env.REALTIME_ALLOWED_ORIGINS.split(',').map(s => s.trim()) : ['http://localhost:3000'];
const upstreamUrl = process.env.REALTIME_UPSTREAM_URL || 'ws://localhost:9000';
const isFrappe = process.env.REALTIME_UPSTREAM_IS_FRAPPE === 'true';
const frappeSite = process.env.REALTIME_SITE || 'mysite.localhost';

const proxy = httpProxy.createProxyServer({
  target: upstreamUrl,
  ws: true,
  changeOrigin: false,
});

proxy.on('error', (err, _req, res) => {
  console.error('[gateway] Proxy error:', err.message);
  if (res && typeof (res as http.ServerResponse).writeHead === 'function') {
    (res as http.ServerResponse).writeHead(502);
    res.end('Bad Gateway');
  } else if (res && typeof (res as import('net').Socket).write === 'function') {
    (res as import('net').Socket).write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    (res as import('net').Socket).destroy();
  }
});

export const server = http.createServer((_req, res) => {
  res.writeHead(400);
  res.end('WebSocket Upgrade Required');
});

function getFrappeWebUrl(): URL {
  const base = process.env.REALTIME_FRAPPE_WEB_URL || process.env.GRIEVANCE_API_BASE_URL || `http://${frappeSite}:8000`;
  try {
    return new URL(base);
  } catch {
    return new URL(`http://${frappeSite}:8000`);
  }
}

function frappeCompatHeaders(req: http.IncomingMessage) {
  // Frappe socketio requires:
  // 1. Origin == Host (hostnames must match in authenticate.js)
  // 2. X-Frappe-Site-Name: <site>
  // 3. Origin header must point to Frappe's HTTP web server so that
  //    Frappe's authenticate.js (via get_url) can reach /api/method/frappe.realtime.get_user_info
  const webUrl = getFrappeWebUrl();
  req.headers['origin'] = webUrl.origin;
  req.headers['host'] = webUrl.host;
  req.headers['x-frappe-site-name'] = frappeSite;
}

server.on('upgrade', (req, socket, head) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || (socket as import('net').Socket).remoteAddress || '127.0.0.1';
  const limitKey = `gateway-upgrade:${clientIp}`;
  const limit = checkRateLimit(limitKey, RATE_LIMITS.realtimeConfig.limit, RATE_LIMITS.realtimeConfig.windowMs);
  
  if (!limit.allowed) {
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }

  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) {
    console.error(`[gateway] Rejected origin: ${origin}`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  // A local session's `auth_token`, or else the IAM access token of the
  // browser's login option (see src/lib/loginOption.ts). Both are sent to
  // Frappe as a Bearer token; oan_auth_service tells them apart by issuer.
  const loginOption = decodeLoginOption(cookies[LOGIN_OPTION_COOKIE]);
  const iamToken = loginOption ? cookies[iamCookieName(IAM_COOKIES.accessToken, loginOption)] : undefined;
  const token = cookies['auth_token'] || iamToken;

  if (!token) {
    console.error('[gateway] No session token cookie');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Check idle session — a local session only. An IAM session is
  // single sign-on whose idle timeout is IAM's, and may have been opened at
  // another app that never started this app's clock (see
  // src/lib/activeSession.ts).
  const cookieReader = {
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined)
    }
  };

  if (cookies['auth_token'] && !hasRecentActivity(cookieReader)) {
    console.error('[gateway] Session is idle');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // An IAM session counts only for the account `/auth/me` gave a role here —
  // same rule as `hasAppAccess` in src/lib/iamSession.ts.
  const claims = cookies['auth_token'] ? decodeAccessToken(token) : peekToken(token);
  const iamAccess =
    !!cookies['auth_token'] || (!!loginOption?.roles?.length && !!claims && claims.sub === loginOption.sub);
  if (!claims || isExpired(claims, 0) || !iamAccess) {
    console.error('[gateway] Token invalid or expired');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  req.headers['authorization'] = `Bearer ${token}`;
  delete req.headers['cookie'];

  if (isFrappe) {
    frappeCompatHeaders(req);
  }

  proxy.ws(req, socket, head);

  // Schedule close at token expiry
  const msUntilExpiry = (claims.exp * 1000) - Date.now();
  if (msUntilExpiry > 0) {
    setTimeout(() => {
      // The socket might already be closed, but if not, destroy it
      if (!socket.destroyed) {
        socket.destroy();
      }
    }, msUntilExpiry);
  }
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`[gateway] Listening on port ${port}, upstream: ${upstreamUrl}`);
  });
}
