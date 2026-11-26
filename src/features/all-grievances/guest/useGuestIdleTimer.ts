'use client';

import { CLIENT_IDLE_WARNING_LEAD_MS } from '@/lib/idleTimeoutConfig';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GUEST_ERROR, GuestApiError, keepGuestSessionAlive, type GuestErrorCode } from './guestApi';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
// Pinging on every event would defeat a lightweight keep-alive; once a minute comfortably beats
// the warning lead (as `useIdleTimer` does for a signed-in session).
const HEARTBEAT_THROTTLE_MS = 60_000;

export interface GuestIdleTimerOptions {
  /** The idle limit the backend reported when the PIN was verified. */
  idleSeconds: number;
  /** Called once when the session is over: idle here, or the backend said so on a keep-alive. */
  onExpire: (code: GuestErrorCode) => void;
}

export interface GuestIdleTimerState {
  warning: boolean;
  secondsRemaining: number;
  /** The warning's "Stay signed in": keeps the session alive on the server and restarts the clock. */
  stayActive: () => void;
}

/**
 * The browser half of a guest session's idle limit. The backend enforces it (the session expires
 * in Redis); this only warns a minute before and returns to the PIN screen when it lapses, instead
 * of the next click failing with no explanation.
 */
export function useGuestIdleTimer({ idleSeconds, onExpire }: GuestIdleTimerOptions): GuestIdleTimerState {
  const idleMs = idleSeconds * 1000;
  const warnLeadMs = Math.min(CLIENT_IDLE_WARNING_LEAD_MS, Math.floor(idleMs / 2));
  const [warning, setWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(warnLeadMs / 1000));
  const lastActivityRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const expire = useCallback((code: GuestErrorCode) => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    onExpireRef.current(code);
  }, []);

  const heartbeat = useCallback(() => {
    keepGuestSessionAlive().catch((error: unknown) => {
      if (error instanceof GuestApiError && error.endsSession) expire(error.code);
    });
  }, [expire]);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (now - lastHeartbeatRef.current >= HEARTBEAT_THROTTLE_MS) {
      lastHeartbeatRef.current = now;
      heartbeat();
    }
  }, [heartbeat]);

  const stayActive = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastHeartbeatRef.current = now;
    setWarning(false);
    heartbeat();
  }, [heartbeat]);

  useEffect(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastHeartbeatRef.current = now;
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
  }, [recordActivity]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (expiredRef.current) return;
      const idleForMs = Date.now() - lastActivityRef.current;
      if (idleForMs >= idleMs) {
        expire(GUEST_ERROR.SESSION_EXPIRED);
        return;
      }
      if (idleForMs >= idleMs - warnLeadMs) {
        setWarning(true);
        setSecondsRemaining(Math.max(0, Math.ceil((idleMs - idleForMs) / 1000)));
      } else {
        setWarning(false);
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [expire, idleMs, warnLeadMs]);

  return { warning, secondsRemaining, stayActive };
}
