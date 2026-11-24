// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/en.json';
import { RenderErrorFallback } from './RenderErrorFallback';

const { reportClientEvent, state } = vi.hoisted(() => ({
  reportClientEvent: vi.fn(),
  state: { user: null as null | { roles: string[] } },
}));

vi.mock('@/lib/clientLogger', () => ({ reportClientEvent }));
vi.mock('@/store/hooks', () => ({
  useAppSelector: (select: (s: unknown) => unknown) => select({ auth: { user: state.user } }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.user = null;
});

function renderFallback(error: Error & { digest?: string }, reset = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RenderErrorFallback error={error} reset={reset} />
    </NextIntlClientProvider>
  );
  return reset;
}

describe('RenderErrorFallback', () => {
  it('shows the digest as the reference and reports it unredacted, without the error text', () => {
    renderFallback(Object.assign(new Error('Jane Doe broke it'), { digest: '1234567890' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Reference: 1234567890');
    expect(reportClientEvent).toHaveBeenCalledWith({ event: 'render.error', requestId: '1234567890', errorName: 'Error' });
  });

  it('retries through the reset callback', () => {
    const reset = renderFallback(new Error('x'));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-out visitor to login and a signed-in user to their own home', () => {
    renderFallback(new Error('x'));
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/login');
    cleanup();
    state.user = { roles: ['Submitter'] };
    renderFallback(new Error('x'));
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).not.toHaveAttribute('href', '/login');
  });
});
