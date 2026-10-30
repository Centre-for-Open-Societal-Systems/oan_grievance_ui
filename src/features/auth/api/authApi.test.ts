import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { forgotPassword, getMe, registerUser, resetPassword } from './authApi';

describe('authApi - registerUser', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const base = { email: 'a@example.com', password: 'Str0ng!Passw0rd', full_name: 'A B', phone_number: '+251911000000' };

  it('sends the submitter type and Fayda ID to /api/auth/register', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) } as Response);

    await registerUser({ ...base, submitter_type: 'Individual Farmer', fayda_id: '6557092147530500' });

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toBe('/api/auth/register');
    expect(JSON.parse(calls[0]![1].body)).toEqual({
      ...base,
      submitter_type: 'Individual Farmer',
      fayda_id: '6557092147530500',
    });
  });

  it('sends no submission channel — the backend registers every account under Web Portal', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) } as Response);

    await registerUser(base);

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    expect(body).toEqual(base);
  });

  it("rejects with the backend's message, so the form can show it", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'A Submitter Profile with this dedupe key is already registered.' }),
    } as Response);

    await expect(registerUser({ ...base, fayda_id: '6557092147530500' })).rejects.toThrow(
      'A Submitter Profile with this dedupe key is already registered.'
    );
  });
});

describe('authApi - password reset', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(status: number, body: object) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response);
    return global.fetch as ReturnType<typeof vi.fn>;
  }

  it('forgotPassword posts the address to /api/auth/forgot-password', async () => {
    const fetchMock = mockFetch(200, { success: true });

    await expect(forgotPassword('a@example.com')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/forgot-password');
    expect(JSON.parse(init.body)).toEqual({ usr: 'a@example.com' });
  });

  it('forgotPassword surfaces the route message on failure', async () => {
    mockFetch(429, { message: 'Too many attempts. Please wait a moment and try again.' });
    await expect(forgotPassword('a@example.com')).rejects.toThrow('Too many attempts');
  });

  it('resetPassword posts the key and new password to /api/auth/reset-password', async () => {
    const fetchMock = mockFetch(200, { success: true });

    await expect(resetPassword('the-key', 'Str0ng!Passw0rd')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/reset-password');
    expect(JSON.parse(init.body)).toEqual({ key: 'the-key', new_password: 'Str0ng!Passw0rd' });
  });

  it('resetPassword surfaces the route message on failure, and falls back to generic copy without one', async () => {
    mockFetch(400, { message: 'The reset password link has either been used before or is invalid' });
    await expect(resetPassword('k', 'Str0ng!Passw0rd')).rejects.toThrow('used before or is invalid');

    mockFetch(500, {});
    await expect(resetPassword('k', 'Str0ng!Passw0rd')).rejects.toThrow('Something went wrong');
  });
});

describe('authApi - getMe()', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls /api/v1/auth/me and extracts only needed user profile fields', async () => {
    const rawBackendResponse = {
      data: {
        claims: {
          exp: 1789627820,
          iat: 1789626920,
          iss: 'mysite.localhost',
          jti: '1XiH27ZkoQI-NqdyPajl4Q',
          roles: ['Grievance Submitter'],
          sub: 'da6907bd8356e207@id.openagrinet.internal',
          typ: 'access',
        },
        first_name: 'Abebe',
        last_name: 'Bikila',
        login_email: 'abebe.farmer.344012394@example.com',
        country_code: '+251',
        phone_number: '934401239',
        profiles: {
          grievance: {
            administrative_area: 'kebele-ET140108101008',
            administrative_unit: 'Kebele 01 Center',
            identities: [{ scheme: 'fayda', value: 'ET-FAYDA-344012394' }],
            preferred_language: 'en',
            profile_id: 'SUB-00141',
            type: 'Individual Farmer',
            submitter_type: 'Individual Farmer',
            submission_channel: 'Web Portal',
            fayda_id: '6557092147530500',
          },
        },
        roles: ['Grievance Submitter'],
        user: 'da6907bd8356e207@id.openagrinet.internal',
      },
      message: 'Success',
      meta: {
        api_version: 'v1',
        status: 'current',
      },
      request_id: 'e82e3417-66c5-45ea-8c97-0c274d31c469',
      status: 'success',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => rawBackendResponse,
    } as Response);

    const user = await getMe();

    // Verify proxy URL was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(calledUrl).toContain('/api/proxy/api/v1/auth/me');

    // Verify needed fields are present
    expect(user.full_name).toBe('Abebe Bikila');
    expect(user.type).toBe('Individual Farmer');
    expect(user.email).toBe('abebe.farmer.344012394@example.com');
    expect(user.mobile_no).toBe('+251934401239');
    expect(user.submitter_type).toBe('Individual Farmer');
    expect(user.submission_channel).toBe('Web Portal');
    // The flat `fayda_id` wins over the identities entry.
    expect(user.fayda_id).toBe('6557092147530500');
    expect(user.profile_id).toBe('SUB-00141');
    expect(user.roles).toEqual(['Grievance Submitter']);
    expect(user.administrative_area).toBe('kebele-ET140108101008');
    expect(user.administrative_unit).toBe('Kebele 01 Center');
    expect(user.preferred_language).toBe('en');

    // Verify unnecessary fields are NOT leaked into User
    expect((user as any).claims).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).meta).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).request_id).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).profiles).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).status).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  // The shape of a registered NGO's real /api/v1/auth/me response.
  const ngoMe = (organization: Record<string, unknown> | null | undefined) => ({
    data: {
      country_code: '+251',
      first_name: 'Test',
      last_name: 'NGO',
      login_email: 'test_ngo@gmail.com',
      phone_number: '987654312',
      profiles: {
        grievance: {
          contact_email: 'test_ngo@gmail.com',
          contact_mobile: '+251987654312',
          country_code: '+251',
          identities: [{ scheme: 'org', value: '1234567890' }],
          ...(organization === undefined ? {} : { organization }),
          phone_number: '987654312',
          profile_id: 'SUB-02215',
          registration_number: '1234567890',
          representative_name: 'Test NGO',
          submitter_name: 'Test NGO Org',
          type: 'NGO',
        },
      },
      roles: ['Grievance Submitter'],
      user: '34cacb286e50bc68@id.openagrinet.internal',
    },
    status: 'success',
  });

  const mockMe = (body: unknown) => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response);
  };

  const REGISTERED_ORG = {
    brand_name: 'NGO Org',
    can_file: false,
    entity_type: 'International NGO',
    id: 'ORG-02216',
    legal_name: 'Test NGO Org',
    org_type: 'NGO',
    registration_number: '1234567890',
    representative_name: 'Test NGO',
    status: 'In Review',
    status_reason: null,
  };

  it("maps a registered NGO's organization block, including that it may not file yet", async () => {
    mockMe(ngoMe(REGISTERED_ORG));
    const user = await getMe();

    expect(user.type).toBe('NGO');
    expect(user.organisation).toEqual({
      id: 'ORG-02216',
      legalName: 'Test NGO Org',
      brandName: 'NGO Org',
      orgType: 'NGO',
      entityType: 'International NGO',
      registrationNumber: '1234567890',
      representativeName: 'Test NGO',
      status: 'In Review',
      statusReason: null,
      canFile: false,
    });
  });

  it("reads an NGO's / FPO's representative Fayda ID, flat or from its identities", async () => {
    // As the backend returns it for an NGO registered with a Fayda ID and no registration number.
    const body = ngoMe(undefined);
    body.data.profiles.grievance.identities = [{ scheme: 'fayda', value: '6519730120000001' }];
    (body.data.profiles.grievance as Record<string, unknown>).fayda_id = '6519730120000001';
    mockMe(body);
    expect((await getMe()).fayda_id).toBe('6519730120000001');

    delete (body.data.profiles.grievance as Record<string, unknown>).fayda_id;
    body.data.profiles.grievance.type = 'FPO';
    mockMe(body);
    expect((await getMe()).fayda_id).toBe('6519730120000001');
  });

  it("reads an NGO's sign-up registration number from its identities until the profile carries it flat", async () => {
    const body = ngoMe(undefined);
    body.data.profiles.grievance.registration_number = null as unknown as string;
    body.data.profiles.grievance.identities = [{ scheme: 'org', value: 'REG-2024-0042' }];
    mockMe(body);
    expect((await getMe()).registration_number).toBe('REG-2024-0042');

    // The flat field wins when the backend sends it.
    body.data.profiles.grievance.registration_number = 'FLAT-1';
    mockMe(body);
    expect((await getMe()).registration_number).toBe('FLAT-1');
  });

  it('reports an Active organization as able to file', async () => {
    mockMe(ngoMe({ ...REGISTERED_ORG, status: 'Active', can_file: true }));
    expect((await getMe()).organisation).toMatchObject({ status: 'Active', canFile: true });
  });

  it('works out canFile itself when the backend leaves it out: only Active may file', async () => {
    const { can_file: _omitted, ...withoutFlag } = REGISTERED_ORG;
    void _omitted;
    mockMe(ngoMe({ ...withoutFlag, status: 'Active' }));
    expect((await getMe()).organisation?.canFile).toBe(true);
    mockMe(ngoMe({ ...withoutFlag, status: 'Suspended', status_reason: 'Certificate not confirmed' }));
    expect((await getMe()).organisation).toMatchObject({ canFile: false, statusReason: 'Certificate not confirmed' });
  });

  it('has no organisation for a farmer, or an NGO that has not registered one', async () => {
    mockMe(ngoMe(undefined));
    expect((await getMe()).organisation).toBeUndefined();
    mockMe(ngoMe(null));
    expect((await getMe()).organisation).toBeUndefined();
  });

  it('falls back to the identities entry for the Fayda ID while the backend sends no flat fayda_id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          login_email: 'abebe@example.com',
          full_name: 'Abebe Bikila',
          roles: ['Grievance Submitter'],
          profiles: {
            grievance: { type: 'Individual Farmer', identities: [{ scheme: 'fayda', value: 'ET-FAYDA-344012394' }] },
          },
        },
        status: 'success',
      }),
    } as Response);

    const user = await getMe();

    expect(user.fayda_id).toBe('ET-FAYDA-344012394');
    expect(user.submitter_type).toBeUndefined();
    expect(user.submission_channel).toBeUndefined();
  });

  it('leaves the Fayda ID unset when the profile has none, rather than failing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          login_email: 'agent@example.com',
          full_name: 'Tigist Agent',
          roles: ['Grievance Submitter'],
          profiles: {
            grievance: { type: 'Development Agent', submitter_type: 'Development Agent', fayda_id: null, identities: [] },
          },
        },
        status: 'success',
      }),
    } as Response);

    const user = await getMe();

    expect(user.fayda_id).toBeUndefined();
    expect(user.submitter_type).toBe('Development Agent');
  });

  it('throws sessionExpired if data is missing or unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(getMe()).rejects.toThrow('UNAUTHORIZED');
  });
});
