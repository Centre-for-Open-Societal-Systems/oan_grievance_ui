import { isLocale, LOCALE_COOKIE } from '@/i18n/locales';
import { NextResponse } from 'next/server';

/**
 * Sets the UI-language cookie `src/i18n/request.ts` reads on every request.
 * Not session/auth state — doesn't go through session.ts — so it's fine for
 * this to be a plain unauthenticated cookie write, readable before login too
 * (the login/register pages should honour the chosen language as well).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = body?.locale;

  if (typeof locale !== 'string' || !isLocale(locale)) {
    return NextResponse.json({ message: 'Unsupported locale' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}
