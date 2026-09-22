import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discardDraft, loadDraft, saveDraft, submitDraft } from './drafts';

describe('drafts API client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('saveDraft formats typed payload correctly and sends POST request', async () => {
    const mockResponse = {
      message: {
        data: {
          client_submission_uuid: 'uuid-123',
          service_category: 'Inputs',
          description: 'A test description of grievance',
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = fetchMock;

    const result = await saveDraft({
      client_submission_uuid: 'uuid-123',
      service_category: 'Inputs',
      description: 'A test description of grievance',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/proxy/api/v1/drafts');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      client_submission_uuid: 'uuid-123',
      service_category: 'Inputs',
      description: 'A test description of grievance',
    });
    expect(result).toEqual(mockResponse.message.data);
  });

  it('saveDraft supports legacy signature (clientUuid, payload, stepReached)', async () => {
    const mockResponse = {
      message: {
        data: {
          client_submission_uuid: 'uuid-legacy-456',
          service_category: 'Schemes',
          description: 'Legacy payload test description',
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = fetchMock;

    await saveDraft(
      'uuid-legacy-456',
      {
        serviceCategory: 'Schemes',
        description: 'Legacy payload test description',
      },
      2
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      client_submission_uuid: 'uuid-legacy-456',
      service_category: 'Schemes',
      description: 'Legacy payload test description',
    });
  });

  it('submitDraft sends POST request to /api/v1/drafts/submit with consent_given=1', async () => {
    const mockResponse = {
      message: {
        data: {
          ticket_number: 'AMHA-001-00001',
          status: 'Submitted',
          client_submission_uuid: 'uuid-123',
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = fetchMock;

    const result = await submitDraft({
      client_submission_uuid: 'uuid-123',
      service_category: 'Inputs',
      grievance_type: 'Fertilizer Shortage',
      description: 'Detailed description long enough for submission',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/proxy/api/v1/drafts/submit');
    expect(init.method).toBe('POST');
    const parsedBody = JSON.parse(init.body as string);
    expect(parsedBody.consent_given).toBe(1);
    expect(parsedBody.client_submission_uuid).toBe('uuid-123');
    expect(result).toEqual(mockResponse.message.data);
  });

  it('loadDraft calls GET /api/v1/drafts', async () => {
    const mockResponse = {
      message: {
        data: {
          name: 'GR-0001',
          client_submission_uuid: 'uuid-123',
          description: 'Loaded description',
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = fetchMock;

    const result = await loadDraft();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/proxy/api/v1/drafts');
    expect(init.method).toBe('GET');
    expect(result).toEqual(mockResponse.message.data);
  });

  it('discardDraft calls DELETE /api/v1/drafts with client_submission_uuid', async () => {
    const mockResponse = {
      message: {
        data: { discarded: true },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = fetchMock;

    await discardDraft('uuid-to-discard');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/proxy/api/v1/drafts?client_submission_uuid=uuid-to-discard');
    expect(init.method).toBe('DELETE');
  });
});
