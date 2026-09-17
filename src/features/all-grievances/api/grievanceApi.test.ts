import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { grievanceService } from './grievanceApi';

describe('grievanceService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const listPayload = {
    items: [
      {
        name: 'GRV-0001',
        ticket_number: 'SOMA-JIG-INP-09905',
        status: 'Submitted',
        escalated: false,
        is_anonymous: false,
      },
    ],
    pagination: {
      page: 1,
      page_size: 20,
      total_count: 42,
      total_pages: 3,
      has_next: true,
      has_prev: false,
    },
  };

  function mockListResponse() {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: listPayload }),
    } as Response);
  }

  function calledUrl(): string {
    return (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  it('exposes the list and count helpers', () => {
    expect(typeof grievanceService.listGrievances).toBe('function');
    expect(typeof grievanceService.countGrievances).toBe('function');
  });

  it('calls the grievances endpoint and unwraps the data envelope', async () => {
    mockListResponse();

    const result = await grievanceService.listGrievances({ page: 1, page_size: 20 });

    expect(result).toEqual(listPayload);
    expect(calledUrl()).toContain('/api/proxy/api/v1/grievances?page=1&page_size=20');
  });

  it('sends multi-select filters as comma-separated values', async () => {
    mockListResponse();

    await grievanceService.listGrievances({
      status: ['Submitted', 'Under Investigation'],
      category: ['Inputs', 'Credit'],
      region: ['Oromia'],
    });

    // URLSearchParams form-encodes spaces as "+", which the backend decodes back to a space.
    const url = decodeURIComponent(calledUrl());
    expect(url).toContain('status=Submitted,Under+Investigation');
    expect(url).toContain('category=Inputs,Credit');
    expect(url).toContain('region=Oromia');
  });

  it('omits empty filters, and trims the search term', async () => {
    mockListResponse();

    await grievanceService.listGrievances({
      status: [],
      search: '  fertiliser  ',
      from_date: '',
      to_date: '2026-05-31',
    });

    const url = decodeURIComponent(calledUrl());
    expect(url).not.toContain('status=');
    expect(url).not.toContain('from_date=');
    expect(url).toContain('search=fertiliser');
    expect(url).toContain('to_date=2026-05-31');
  });

  it('reads the total count without transferring rows', async () => {
    mockListResponse();

    const count = await grievanceService.countGrievances({ status: ['Resolved'] });

    expect(count).toBe(42);
    const url = decodeURIComponent(calledUrl());
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=1');
    expect(url).toContain('status=Resolved');
  });
});
