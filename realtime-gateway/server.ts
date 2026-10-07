import { config } from "dotenv";
config({ path: ".env.local" });
import http from 'node:http';
import httpProxy from 'http-proxy-3';
import { decodeAccessToken, isExpired } from '../src/lib/jwt';

// Helper to parse cookies from a raw Cookie header
function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  const parts = header.split(';');
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) cookies[key.trim()] = value.trim();
  }
  return cookies;
}

// We mock CookieReader since we are not in Next.js
// but we reuse the logic from idleSession
import { hasRecentActivity } from '../src/lib/idleSession';

const port = process.env.REALTIME_GATEWAY_PORT ? parseInt(process.env.REALTIME_GATEWAY_PORT, 10) : 3001;
const allowedOrigins = process.env.REALTIME_ALLOWED_ORIGINS ? process.env.REALTIME_ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
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
  if (res && (res as http.ServerResponse).writeHead) {
    (res as http.ServerResponse).writeHead(502);
    res.end('Bad Gateway');
  }
});

export const server = http.createServer((_req, res) => {
  res.writeHead(400);
  res.end('WebSocket Upgrade Required');
});

function getFrappeWebUrl(): URL {
  const base = process.env.REALTIME_FRAPPE_WEB_URL || process.env.AUTH_API_BASE_URL || `http://${frappeSite}:8000`;
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
  // 4. No Cookie (avoids duplicate/stale cookie parsing upstream)
  const webUrl = getFrappeWebUrl();
  req.headers['origin'] = webUrl.origin;
  req.headers['host'] = webUrl.host;
  req.headers['x-frappe-site-name'] = frappeSite;
  delete req.headers['cookie'];
}

server.on('upgrade', (req, socket, head) => {
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) {
    console.error(`[gateway] Rejected origin: ${origin}`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['auth_token'];
  
  if (!token) {
    console.error('[gateway] No auth_token cookie');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Check idle session
  const cookieReader = {
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined)
    }
  };
  
  if (!hasRecentActivity(cookieReader)) {
    console.error('[gateway] Session is idle');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const claims = decodeAccessToken(token);
  if (!claims || isExpired(claims, 0)) {
    console.error('[gateway] Token invalid or expired');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  req.headers['authorization'] = `Bearer ${token}`;

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
