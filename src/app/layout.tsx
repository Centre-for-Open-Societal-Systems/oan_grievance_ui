import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Providers } from "./providers";
import { isProtectedRoute } from "@/features/auth/rbac";
import { loadInitialUser } from "@/lib/initialUser";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grievance Management Portal",
  description: "Ethiopia OpenAgriNet",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading a header here (the CSP nonce `proxy.ts` sets on the forwarded
  // request) is what opts this layout into dynamic rendering. Without it,
  // Next may statically optimize the shell at build time, when no per-request
  // nonce exists yet — the CSP's `script-src 'nonce-...'` would then never
  // match what actually got rendered. The value itself isn't otherwise used:
  // this app has no custom inline <Script> tags, so Next applies the nonce to
  // its own framework scripts automatically once rendering is dynamic.
  const requestHeaders = await headers();

  // Only a protected screen waits on the session, so only there is the user
  // looked up on the server (null falls back to the client's own restore).
  const pathname = requestHeaders.get("x-pathname");
  const initialUser = pathname && isProtectedRoute(pathname) ? await loadInitialUser() : null;

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} antialiased`}
    >
      <body className="min-h-screen bg-gray-50">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers initialUser={initialUser}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
