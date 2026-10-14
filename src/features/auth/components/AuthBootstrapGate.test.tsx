// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionEndReason } from '@/lib/api/fetchApi';
import { AuthBootstrapGate } from './AuthBootstrapGate';

let sessionEnded: ((reason: SessionEndReason) => void) | null = null;
const dispatch = vi.fn();
const clearSubmitterProfile = vi.fn();
let state: { auth: { user: { email: string; roles: string[] } | null; status: string; error: null } };

vi.mock('@/lib/api/fetchApi', () => ({
  onSessionEnded: (handler: (reason: SessionEndReason) => void) => {
    sessionEnded = handler;
    return () => {};
  },
}));
vi.mock('@/lib/submitterProfile', () => ({ clearSubmitterProfile: (email: string) => clearSubmitterProfile(email) }));
vi.mock('@/store/hooks', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));
vi.mock('next/navigation', () => ({ usePathname: () => window.location.pathname }));

describe('AuthBootstrapGate when a request finds the session over', () => {
  const assign = vi.fn();

  beforeEach(() => {
    state = { auth: { user: { email: 'officer@example.com', roles: [] }, status: 'succeeded', error: null } };
    vi.stubGlobal('location', { ...window.location, pathname: '/all-grievances', search: '?page=2', assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    sessionEnded = null;
  });

  it('leaves a protected screen for the login page once, saying why, and wipes the stored profile', () => {
    render(<AuthBootstrapGate>page</AuthBootstrapGate>);
    sessionEnded!('expired');
    sessionEnded!('expired');
    expect(assign).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith('/login?reason=expired&returnUrl=%2Fall-grievances%3Fpage%3D2');
    expect(clearSubmitterProfile).toHaveBeenCalledWith('officer@example.com');
  });

  it('stays put when no one is signed in — a logout is already navigating, or the restore failed', () => {
    state.auth.user = null;
    state.auth.status = 'failed';
    render(<AuthBootstrapGate>page</AuthBootstrapGate>);
    sessionEnded!('expired');
    expect(assign).not.toHaveBeenCalled();
  });

  it('stays put on a public screen', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/login', search: '', assign });
    render(<AuthBootstrapGate>page</AuthBootstrapGate>);
    sessionEnded!('idle');
    expect(assign).not.toHaveBeenCalled();
  });
});
