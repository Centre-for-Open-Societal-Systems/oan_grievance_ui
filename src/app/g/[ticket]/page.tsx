import { GuestAccessPage } from '@/features/all-grievances/guest/GuestAccessPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Grievance | Grievance Management Portal',
  robots: { index: false, follow: false },
  // The link carried a secret in its fragment: nothing this page loads says where it came from.
  referrer: 'no-referrer',
};

export default async function GuestCase({ params }: { params: Promise<{ ticket: string }> }) {
  const { ticket } = await params;
  return <GuestAccessPage ticket={decodeURIComponent(ticket)} />;
}
