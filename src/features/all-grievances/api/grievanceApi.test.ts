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

  const timelinePayload = {
    ticket_number: 'SOMA-JIG-INP-09905',
    status: 'In Progress',
    escalated: false,
    summary: {
      description: 'Fertilizer delivery delayed.',
      service_category: 'Inputs',
    },
    submitter: {
      name: 'Abebe Bekele',
      mobile: '+251911223344',
      is_anonymous: false,
    },
    sla: {
      sla_days: 14,
      sla_consumed_percent: 50,
      sla_due_date: '2026-05-10T12:00:00Z',
    },
    assignment: {
      department: 'Agriculture Inputs',
      assigned_to: 'Tigist Alemu',
    },
    timeline: [
      {
        name: 'GR-TIME-000001',
        entry_type: 'note',
        is_internal: true,
        body: 'Investigating warehouse dispatch.',
        author_name: 'Tigist Alemu',
        author_type: 'officer',
        created_on: '2026-04-12T10:15:00Z',
      },
      {
        name: 'GR-TIME-000002',
        entry_type: 'message',
        is_internal: false,
        body: 'Can you provide the receipt number?',
        author_name: 'Tigist Alemu',
        author_type: 'officer',
        created_on: '2026-04-12T11:00:00Z',
      },
    ],
    has_more: false,
  };

  function mockJsonResponse(data: unknown, status = 200) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ status: 'success', data }),
    } as Response);
  }

  function calledUrl(): string {
    return (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  function calledOptions(): RequestInit {
    return (global.fetch as any).mock.calls[0][1]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  it('exposes all grievance service helpers', () => {
    expect(typeof grievanceService.listGrievances).toBe('function');
    expect(typeof grievanceService.countGrievances).toBe('function');
    expect(typeof grievanceService.getTimeline).toBe('function');
    expect(typeof grievanceService.postMessage).toBe('function');
    expect(typeof grievanceService.addNote).toBe('function');
    expect(typeof grievanceService.executeAction).toBe('function');
  });

  it('calls the grievances endpoint and unwraps the data envelope', async () => {
    mockJsonResponse(listPayload);

    const result = await grievanceService.listGrievances({ page: 1, page_size: 20 });

    expect(result).toEqual(listPayload);
    expect(calledUrl()).toContain('/api/proxy/api/v1/grievances?page=1&page_size=20');
  });

  it('sends multi-select filters as comma-separated values', async () => {
    mockJsonResponse(listPayload);

    await grievanceService.listGrievances({
      status: ['Submitted', 'Under Investigation'],
      category: ['Inputs', 'Credit'],
      region: ['Oromia'],
    });

    const url = decodeURIComponent(calledUrl());
    expect(url).toContain('status=Submitted,Under+Investigation');
    expect(url).toContain('category=Inputs,Credit');
    expect(url).toContain('region=Oromia');
  });

  it('omits empty filters, and trims the search term', async () => {
    mockJsonResponse(listPayload);

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
    mockJsonResponse(listPayload);

    const count = await grievanceService.countGrievances({ status: ['Resolved'] });

    expect(count).toBe(42);
    const url = decodeURIComponent(calledUrl());
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=1');
    expect(url).toContain('status=Resolved');
  });

  it('fetches timeline details with optional query params', async () => {
    mockJsonResponse(timelinePayload);

    const result = await grievanceService.getTimeline('SOMA-JIG-INP-09905', {
      is_internal: true,
      limit: 10,
      cursor: '2026-04-12T10:00:00Z',
    });

    expect(result).toEqual(timelinePayload);
    const url = decodeURIComponent(calledUrl());
    expect(url).toContain('/api/proxy/api/v1/grievances/SOMA-JIG-INP-09905/timeline');
    expect(url).toContain('is_internal=true');
    expect(url).toContain('limit=10');
    expect(url).toContain('cursor=2026-04-12T10:00:00Z');
  });

  it('posts a public message to the grievance conversation', async () => {
    mockJsonResponse({ name: 'GR-TIME-000003', entry_type: 'message' });

    await grievanceService.postMessage('SOMA-JIG-INP-09905', 'Payment proof submitted.');

    expect(calledUrl()).toContain('/api/proxy/api/v1/grievances/SOMA-JIG-INP-09905/message');
    const options = calledOptions();
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.ticket_number).toBe('SOMA-JIG-INP-09905');
    expect(body.message).toBe('Payment proof submitted.');
    expect(body.body).toBe('Payment proof submitted.');
  });

  it('adds an internal note to the case timeline', async () => {
    mockJsonResponse({ name: 'GR-TIME-000004', entry_type: 'note', is_internal: true });

    await grievanceService.addNote('SOMA-JIG-INP-09905', 'Internal verification complete.', true);

    expect(calledUrl()).toContain('/api/proxy/api/v1/grievances/SOMA-JIG-INP-09905/note');
    const options = calledOptions();
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.ticket_number).toBe('SOMA-JIG-INP-09905');
    expect(body.note).toBe('Internal verification complete.');
    expect(body.is_internal).toBe(true);
  });

  it('executes a workflow action on a grievance', async () => {
    mockJsonResponse({ ticket_number: 'SOMA-JIG-INP-09905', status: 'Resolved' });

    await grievanceService.executeAction('SOMA-JIG-INP-09905', {
      action: 'Confirm Resolution',
      reason: 'Issue resolved on site',
    });

    expect(calledUrl()).toContain('/api/proxy/api/v1/grievances/SOMA-JIG-INP-09905/action');
    const options = calledOptions();
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.ticket_number).toBe('SOMA-JIG-INP-09905');
    expect(body.action).toBe('Confirm Resolution');
    expect(body.reason).toBe('Issue resolved on site');
  });
});
