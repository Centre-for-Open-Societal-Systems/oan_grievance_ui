import { checkCsrf } from '@/lib/csrf';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildClientResponse, buildUpstreamHeaders } from '@/lib/proxyHeaders';
import { AUTH_TOKEN_COOKIE } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return handleProxy(request, path);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };

async function handleProxy(request: NextRequest, pathArray: string[]) {
  const isMutating = !['GET', 'HEAD'].includes(request.method);

  if (isMutating) {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;
  }

  const targetPath = pathArray.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${env.AUTH_API_BASE_URL}/${targetPath}${search}`;

  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const headers = buildUpstreamHeaders(request, authToken);

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (isMutating) {
      fetchOptions.body = await request.blob();
    }

    const response = await fetch(targetUrl, fetchOptions);

    const { body, init } = await buildClientResponse(response, targetUrl, { proxyPrefix: '/api/proxy' });
    return new NextResponse(body, init);
  } catch (error) {
    logger.error(`Proxy error for ${targetUrl}:`, error);
    return NextResponse.json({ message: 'Proxy request failed' }, { status: 502 });
  }
}
