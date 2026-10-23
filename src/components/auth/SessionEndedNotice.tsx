'use client';

import { Clock, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

const NOTICES = {
  idle: {
    icon: Clock,
    title: 'Signed out for inactivity',
    body: 'Your session ended because it was left idle. Please sign in again to continue.',
  },
  session: {
    icon: ShieldAlert,
    title: 'Your session has ended',
    body: 'For your security we signed you out. Please sign in again to pick up where you left off.',
  },
  expired: {
    icon: ShieldAlert,
    title: 'Your session has expired',
    body: 'Your session expired. Please sign in again to continue.',
  },
} as const;

interface SessionEndedNoticeProps {
  suppressed?: boolean;
  className?: string;
}

export function SessionEndedNotice({ suppressed = false, className }: SessionEndedNoticeProps) {
  const [capturedReason, setCapturedReason] = useState<keyof typeof NOTICES | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason && reason in NOTICES) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCapturedReason(reason as keyof typeof NOTICES);
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);

  const notice = capturedReason ? NOTICES[capturedReason] : null;

  if (!notice || suppressed) return null;

  const Icon = notice.icon;

  return (
    <div
      role="status"
      className={
        className ??
        'w-full mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3'
      }
    >
      <Icon className="mt-0.5 shrink-0 text-amber-600" size={18} strokeWidth={2.5} aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-amber-900">{notice.title}</p>
        <p className="mt-0.5 text-sm font-medium text-amber-900/90">{notice.body}</p>
      </div>
    </div>
  );
}
