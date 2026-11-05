// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportClientEvent, resetClientReportBudget } from './clientLogger';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  resetClientReportBudget();
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const bodyOf = (call: number) => JSON.parse((fetchMock.mock.calls[call]![1] as RequestInit).body as string);

describe('reportClientEvent', () => {
  it('posts the event with only the path of its URL and keeps a numeric request id intact', () => {
    reportClientEvent({ event: 'render.error', requestId: '1234567890', path: '/api/v1/x?q=jane' });
    expect(fetchMock).toHaveBeenCalledWith('/api/client-logs', expect.objectContaining({ method: 'POST', keepalive: true }));
    expect(bodyOf(0)).toMatchObject({ event: 'render.error', requestId: '1234567890', path: '/api/v1/x' });
  });

  it('sends the same report once per 30 seconds', () => {
    reportClientEvent({ event: 'api.request_failed', status: 500, path: '/api/v1/x' });
    reportClientEvent({ event: 'api.request_failed', status: 500, path: '/api/v1/x' });
    reportClientEvent({ event: 'api.request_failed', status: 502, path: '/api/v1/x' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops at 50 reports per page, and a fresh budget (a navigation) lets reports through again', () => {
    for (let i = 0; i < 60; i += 1) reportClientEvent({ event: 'api.request_failed', status: 500, path: `/p${i}` });
    expect(fetchMock).toHaveBeenCalledTimes(50);
    resetClientReportBudget();
    reportClientEvent({ event: 'api.request_failed', status: 500, path: '/another' });
    expect(fetchMock).toHaveBeenCalledTimes(51);
  });

  it('never throws into the caller when the send fails', () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(() => reportClientEvent({ event: 'flow.failed', flow: 'submit-grievance' })).not.toThrow();
  });
});
