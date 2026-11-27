'use client';

import { Button } from '@/components/ui/Button';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { GUEST_ERROR, GuestApiError, viewGuestCase, type GuestCase, type GuestErrorCode } from './guestApi';

/** Why the screen is shown again: the guest chose Done. */
export type PinNotice = 'signedOut' | null;

export interface PinScreenProps {
  /** The ticket number as the link carries it. */
  ticket: string;
  /** The link's token; null when the link reached the page without one. */
  token: string | null;
  notice?: PinNotice;
  /** Set when the case was found closed; the screen then only says so. */
  closed?: boolean;
  /** The case, and the PIN it was opened with, which the page keeps in memory to refresh with. */
  onVerified: (data: GuestCase, pin: string) => void;
}

/** 3001002A0 -> 3-001-002A-0, as the SMS prints it. Anything else is shown as it came. */
export function displayTicket(ticket: string): string {
  const flat = ticket.replace(/-/g, '');
  return flat.length === 9 ? `${flat[0]}-${flat.slice(1, 4)}-${flat.slice(4, 8)}-${flat[8]}` : ticket;
}

type Failure = { code: GuestErrorCode; retryAfterSeconds: number | null };

/**
 * The first screen of a case link: the PIN, and nothing about the case until it is verified.
 * A wrong ticket, token or PIN all read the same, as the backend answers them the same.
 */
export function PinScreen({ ticket, token, notice = null, closed = false, onVerified }: PinScreenProps) {
  const t = useTranslations('guestAccess.pin');
  const pinId = useId();
  const errorId = useId();
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(closed ? { code: GUEST_ERROR.CLOSED, retryAfterSeconds: null } : null);

  const message = failureMessage(failure);
  const isClosed = failure?.code === GUEST_ERROR.CLOSED;
  const canSubmit = Boolean(token) && !isClosed && pin.trim().length > 0 && !verifying;

  function failureMessage(current: Failure | null): string | null {
    if (!token) return t('noLink');
    if (!current) return null;
    switch (current.code) {
      case GUEST_ERROR.INVALID:
        return t('invalid');
      case GUEST_ERROR.LOCKED:
        return t('locked', { minutes: Math.max(1, Math.ceil((current.retryAfterSeconds ?? 60) / 60)) });
      case GUEST_ERROR.CLOSED:
        return t('closed');
      case GUEST_ERROR.RATE_LIMITED:
        return t('rateLimited');
      case GUEST_ERROR.UNAVAILABLE:
        return t('unavailable');
      case GUEST_ERROR.NETWORK:
        return t('network');
      default:
        return t('unknown');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || !canSubmit) return;
    setVerifying(true);
    setFailure(null);
    try {
      const entered = pin.trim();
      const data = await viewGuestCase(ticket, token, entered);
      setPin('');
      onVerified(data, entered);
    } catch (error) {
      setFailure(
        error instanceof GuestApiError
          ? { code: error.code, retryAfterSeconds: error.retryAfterSeconds }
          : { code: GUEST_ERROR.UNKNOWN, retryAfterSeconds: null }
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
        noValidate
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-green-50 p-3 text-green-700">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('ticket', { ticket: displayTicket(ticket) })}</p>
        </div>

        {notice && !message ? (
          <p role="status" className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {t(notice)}
          </p>
        ) : null}

        {!isClosed && token ? (
          <>
            <label htmlFor={pinId} className="block text-sm font-bold text-gray-700">
              {t('pinLabel')}
            </label>
            <p className="mb-2 text-xs text-gray-500">{t('pinHint')}</p>
            <input
              id={pinId}
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              aria-invalid={Boolean(failure)}
              aria-describedby={message ? errorId : undefined}
              disabled={verifying}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </>
        ) : null}

        {message ? (
          <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-red-700">
            {message}
          </p>
        ) : null}

        {!isClosed && token ? (
          <Button type="submit" className="mt-6 w-full" isLoading={verifying} disabled={!canSubmit}>
            {verifying ? t('verifying') : t('submit')}
          </Button>
        ) : null}
      </form>
    </main>
  );
}
