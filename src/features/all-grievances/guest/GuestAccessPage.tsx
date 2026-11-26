'use client';

import { useCallback, useEffect, useState } from 'react';
import { endGuestSession, GUEST_ERROR, type GuestErrorCode, type GuestVerifyData } from './guestApi';
import { GuestCaseView } from './GuestCaseView';
import type { GuestReplyDraft } from './GuestReplyForm';
import { readLinkToken, stripLinkToken } from './linkToken';
import { PinScreen, type PinNotice } from './PinScreen';

type Phase =
  | { kind: 'reading' }
  | { kind: 'pin'; notice: PinNotice; closed: boolean }
  | { kind: 'case'; idleSeconds: number };

/**
 * `/g/<ticket>#k=<token>`: a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * The token is read from the fragment once and taken out of the address bar at once; it is kept
 * only in memory, so after a session ends the PIN can be entered again without the link, but a
 * reload needs the link from the SMS or email. A reply being typed lives here too, so it survives
 * the session ending.
 */
export function GuestAccessPage({ ticket }: { ticket: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' });
  const [draft, setDraft] = useState<GuestReplyDraft>({ body: '', files: [] });

  useEffect(() => {
    // The fragment exists only in the browser: the server never sees it, so it is read here.
    const fromLink = readLinkToken(window.location.hash);
    if (window.location.hash) stripLinkToken();
    /* eslint-disable react-hooks/set-state-in-effect -- the fragment is read once, after mount */
    setToken(fromLink);
    setPhase({ kind: 'pin', notice: null, closed: false });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const onVerified = useCallback((data: GuestVerifyData) => {
    setPhase({ kind: 'case', idleSeconds: data.idle_timeout_seconds });
  }, []);

  const onSessionEnded = useCallback((code: GuestErrorCode) => {
    setPhase({ kind: 'pin', notice: 'sessionEnded', closed: code === GUEST_ERROR.CLOSED });
  }, []);

  const onDone = useCallback(() => {
    void endGuestSession();
    setDraft({ body: '', files: [] });
    setPhase({ kind: 'pin', notice: 'signedOut', closed: false });
  }, []);

  if (phase.kind === 'reading') return null;

  if (phase.kind === 'case') {
    return (
      <GuestCaseView
        idleSeconds={phase.idleSeconds}
        draft={draft}
        onDraftChange={setDraft}
        onSessionEnded={onSessionEnded}
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
