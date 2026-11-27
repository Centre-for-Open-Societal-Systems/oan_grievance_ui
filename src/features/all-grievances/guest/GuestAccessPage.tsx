'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { GUEST_ERROR, GuestApiError, viewGuestCase, type GuestCase } from './guestApi';
import { GuestCaseView } from './GuestCaseView';
import { readLinkToken, stripLinkToken } from './linkToken';
import { PinScreen, type PinNotice } from './PinScreen';

type Phase =
  | { kind: 'reading' }
  | { kind: 'pin'; notice: PinNotice; closed: boolean }
  | { kind: 'case'; data: GuestCase; pin: string };

/**
 * `/g/<ticket>#k=<token>`: a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * Read-only and stateless: each view sends the ticket, token and PIN to the backend again. The
 * token is read from the fragment once and taken out of the address bar at once; it and the PIN
 * are kept in memory only, so Refresh works without the link while the page is open, a reload
 * needs the link from the SMS or email again, and Done forgets the PIN.
 */
export function GuestAccessPage({ ticket }: { ticket: string }) {
  const t = useTranslations('guestAccess.case');
  const [token, setToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    // The fragment exists only in the browser: the server never sees it, so it is read here.
    const fromLink = readLinkToken(window.location.hash);
    if (window.location.hash) stripLinkToken();
    /* eslint-disable react-hooks/set-state-in-effect -- the fragment is read once, after mount */
    setToken(fromLink);
    setPhase({ kind: 'pin', notice: null, closed: false });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const onVerified = useCallback((data: GuestCase, pin: string) => {
    setRefreshError(null);
    setPhase({ kind: 'case', data, pin });
  }, []);

  const onDone = useCallback(() => {
    setRefreshError(null);
    setPhase({ kind: 'pin', notice: 'signedOut', closed: false });
  }, []);

  const onRefresh = useCallback(async () => {
    if (phase.kind !== 'case' || !token) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const data = await viewGuestCase(ticket, token, phase.pin);
      setPhase({ kind: 'case', data, pin: phase.pin });
    } catch (error) {
      const code = error instanceof GuestApiError ? error.code : GUEST_ERROR.UNKNOWN;
      if (code === GUEST_ERROR.NETWORK || code === GUEST_ERROR.UNKNOWN || code === GUEST_ERROR.RATE_LIMITED) {
        // Nothing about the link changed: keep the case on screen and say the refresh failed.
        setRefreshError(t('refreshFailed'));
      } else {
        // Closed, locked or no longer valid: the PIN screen says which.
        setPhase({ kind: 'pin', notice: null, closed: code === GUEST_ERROR.CLOSED });
      }
    } finally {
      setRefreshing(false);
    }
  }, [phase, ticket, token, t]);

  if (phase.kind === 'reading') return null;

  if (phase.kind === 'case') {
    return (
      <GuestCaseView
        data={phase.data}
        refreshing={refreshing}
        refreshError={refreshError}
        onRefresh={() => void onRefresh()}
        onDone={onDone}
      />
    );
  }

  return (
    <PinScreen
      key={`${phase.notice}-${phase.closed}`}
      ticket={ticket}
      token={token}
      notice={phase.notice}
      closed={phase.closed}
      onVerified={onVerified}
    />
  );
}
