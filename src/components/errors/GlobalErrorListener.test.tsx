// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorListener } from './GlobalErrorListener';

const { reportClientEvent, resetClientReportBudget } = vi.hoisted(() => ({
  reportClientEvent: vi.fn(),
  resetClientReportBudget: vi.fn(),
}));
let pathname = '/dashboard';

vi.mock('@/lib/clientLogger', () => ({ reportClientEvent, resetClientReportBudget }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = '/dashboard';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const fire = (init: ErrorEventInit) => window.dispatchEvent(new ErrorEvent('error', init));

describe('GlobalErrorListener', () => {
  it('reports an uncaught error by class and location, never its text', () => {
    render(<GlobalErrorListener />);
    fire({
      message: 'Jane Doe is invalid',
      error: new TypeError('Jane Doe is invalid'),
      filename: 'http://localhost/_next/a.js?x=1',
      lineno: 3,
      colno: 9,
    });
    expect(reportClientEvent).toHaveBeenCalledWith({
      event: 'window.error',
      errorName: 'TypeError',
      location: 'http://localhost/_next/a.js:3:9',
    });
  });

  it('ignores ResizeObserver notices, opaque script errors and extension scripts', () => {
    render(<GlobalErrorListener />);
    fire({ message: 'ResizeObserver loop completed with undelivered notifications.' });
    fire({ message: 'Script error.' });
    fire({ message: 'boom', filename: 'chrome-extension://abc/content.js' });
    expect(reportClientEvent).not.toHaveBeenCalled();
  });

  it('reports an unhandled rejection by class', () => {
    render(<GlobalErrorListener />);
    const event = new Event('unhandledrejection') as Event & { reason: unknown };
    event.reason = new RangeError('x');
    window.dispatchEvent(event);
    expect(reportClientEvent).toHaveBeenCalledWith({ event: 'window.unhandled_rejection', errorName: 'RangeError' });
  });

  it('starts a fresh report budget on each navigation', () => {
    const { rerender } = render(<GlobalErrorListener />);
    expect(resetClientReportBudget).toHaveBeenCalledTimes(1);
    pathname = '/all-grievances';
    rerender(<GlobalErrorListener />);
    expect(resetClientReportBudget).toHaveBeenCalledTimes(2);
  });
});
