import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetchApi';
import {
  buildSubmitGrievancePayload,
  submitErrorMessage,
  submitGrievance,
} from './submitGrievanceApi';

const BASE_INPUT = {
  submissionChannel: 'Web Portal',
  serviceCategory: 'Inputs',
  grievanceType: 'Fertilizer Shortage',
  description: 'Fertilizer allocated for the season has not reached the kebele store.',
  areaId: 'kebele-ET140108101008',
  kebele: 'Kebele 01 Center',
  clientUuid: '11111111-2222-3333-4444-555555555555',
};

describe('buildSubmitGrievancePayload', () => {
  it('maps the wizard state onto the backend field names', () => {
    expect(buildSubmitGrievancePayload(BASE_INPUT)).toEqual({
      submission_channel: 'Web Portal',
      service_category: 'Inputs',
      grievance_type: 'Fertilizer Shortage',
      description: 'Fertilizer allocated for the season has not reached the kebele store.',
      desired_outcome: '',
      associated_service_provider: '',
      administrative_area: 'kebele-ET140108101008',
      kebele: 'Kebele 01 Center',
      consent_given: 1,
      client_uuid: '11111111-2222-3333-4444-555555555555',
      client_submission_uuid: '11111111-2222-3333-4444-555555555555',
    });
  });

  it('trims and sends the optional desired outcome and service provider', () => {
    const payload = buildSubmitGrievancePayload({
      ...BASE_INPUT,
      desiredOutcome: '  Replace the allocation ',
      serviceProvider: ' Basona Cooperative Union ',
    });
    expect(payload.desired_outcome).toBe('Replace the allocation');
    expect(payload.associated_service_provider).toBe('Basona Cooperative Union');
  });

  it('trims the description', () => {
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, description: '  padded text  ' }).description).toBe(
      'padded text'
    );
  });

  it('always sends kebele, empty when none was chosen, so a stale draft value cannot resurface', () => {
    // The backend merges the saved draft under this body and only overwrites with non-null values.
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, kebele: '' }).kebele).toBe('');
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, kebele: '   ' }).kebele).toBe('');
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, kebele: ' Kebele 01 ' }).kebele).toBe('Kebele 01');
  });

  it("never sends the submitter's own identity, which the backend derives from the session", () => {
    const payload = buildSubmitGrievancePayload(BASE_INPUT);
    for (const key of ['submitter', 'submitter_name', 'contact_mobile', 'contact_email', 'submitter_type']) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('uses the draft id for both the draft claim and the idempotency key', () => {
    const payload = buildSubmitGrievancePayload(BASE_INPUT);
    expect(payload.client_uuid).toBe(BASE_INPUT.clientUuid);
    expect(payload.client_submission_uuid).toBe(BASE_INPUT.clientUuid);
  });
});

describe('submitGrievance', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs the payload through the auth proxy and returns the unwrapped result', async () => {
    const backendReply = {
      data: {
        ticket_number: 'B00100010',
        status: 'Submitted',
        assigned_department: null,
        auto_routed: false,
        sla_due_date: '2026-10-05 12:00:00',
        possible_duplicates: [],
        area_path_code: 'ET.ET14',
        attachments: 1,
        duplicate_submission: false,
      },
      message: 'Grievance submitted successfully',
      status: 'success',
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => backendReply,
    } as Response);

    const payload = buildSubmitGrievancePayload(BASE_INPUT);
    const result = await submitGrievance(payload);

    expect(result.ticket_number).toBe('B00100010');
    expect(result.attachments).toBe(1);

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/api/proxy/api/v1/grievances');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('surfaces the backend per-field messages when validation fails', async () => {
    // The REST routes put `details` at the top level, next to code/message.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          description: 'Description must be at least 20 characters.',
          consent_given: 'The submitter must consent to the processing of their personal data.',
        },
      }),
    } as Response);

    await expect(submitGrievance(buildSubmitGrievancePayload(BASE_INPUT))).rejects.toThrow(
      'Description: Description must be at least 20 characters. Consent Given: The submitter must consent'
    );
  });
});

describe('submitErrorMessage', () => {
  it('passes a backend validation message through', () => {
    expect(submitErrorMessage(new ApiError('Description: Description must be at least 20 characters.', null, 400))).toBe(
      'Description: Description must be at least 20 characters.'
    );
  });

  it('replaces the bare sentinel codes with readable copy', () => {
    expect(submitErrorMessage(new Error('UNAUTHORIZED'))).toMatch(/session has expired/i);
    expect(submitErrorMessage(new Error('FORBIDDEN'))).toMatch(/not permitted/i);
    expect(submitErrorMessage(new Error('CONNECTION'))).toMatch(/could not reach the server/i);
  });

  it('treats a 5xx ApiError as a connection problem, not as its raw message', () => {
    expect(submitErrorMessage(new ApiError('The server ran into a problem.', null, 502))).toMatch(
      /could not reach the server/i
    );
  });

  it('falls back to generic copy for a non-Error rejection', () => {
    expect(submitErrorMessage('boom')).toMatch(/could not submit/i);
  });
});
