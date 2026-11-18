import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import AdministrationPage from '@/features/administration/page';

export default async function Page() {
  // The root layout leaves the `admin` copy out; a nested provider replaces
  // (not merges) the messages, so this one carries the whole catalogue.
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <Suspense fallback={<div className="p-12 text-center text-gray-400 font-medium">Loading administration...</div>}>
        <AdministrationPage />
      </Suspense>
    </NextIntlClientProvider>
  );
}
