import { GuestAccessPage } from '@/features/all-grievances/guest/GuestAccessPage';
import { parseGuestTicket } from '@/features/all-grievances/guest/guestTicket';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Your Grievance | Grievance Management Portal',
  robots: { index: false, follow: false },
  // The link carried a secret in its fragment: nothing this page loads says where it came from.
  referrer: 'no-referrer',
};

export default async function GuestCase({ params }: { params: Promise<{ ticket: string }> }) {
  const { ticket } = await params;
  // A segment that does not decode, or is not shaped like a ticket number, is not a case link.
  const parsed = parseGuestTicket(ticket);
  if (!parsed) notFound();
  return <GuestAccessPage ticket={parsed} />;
}
