// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_IDLE_TIMEOUT_MS } from '@/lib/idleTimeoutConfig';
import { useIdleTimer } from './useIdleTimer';

const getIdleManaged = vi.fn();
const performLogout = vi.fn();

vi.mock('@/features/auth/api/authApi', () => ({
  getIdleManaged: () => getIdleManaged(),
  sendHeartbeat: vi.fn(),
}));
vi.mock('@/features/auth/logout', () => ({
  performLogout: (...args: unknown[]) => performLogout(...args),
}));
vi.mock('@/store/hooks', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => ({ email: 'user@example.com' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

async function idleOut() {
  const hook = renderHook(() => useIdleTimer());
  await act(async () => {}); // let the session-kind lookup settle
  await act(async () => {
    vi.advanceTimersByTime(CLIENT_IDLE_TIMEOUT_MS + 2000);
  });
  return hook;
}

describe('useIdleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    performLogout.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('signs a local session out once it has been idle for the timeout', async () => {
    getIdleManaged.mockResolvedValue(true);
    await idleOut();
    expect(performLogout).toHaveBeenCalledWith(expect.anything(), 'user@example.com', '/login?reason=idle&returnUrl=%2F');
  });

  it('never signs a staff (IAM) session out or warns it — that would end the whole SSO session', async () => {
    getIdleManaged.mockResolvedValue(false);
    const { result } = await idleOut();
    expect(performLogout).not.toHaveBeenCalled();
    expect(result.current.warning).toBe(false);
  });

  it('stays inert when the session kind cannot be told', async () => {
    getIdleManaged.mockResolvedValue(null);
    await idleOut();
    expect(performLogout).not.toHaveBeenCalled();
  });
});
