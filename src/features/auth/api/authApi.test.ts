import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { forgotPassword, getMe, registerUser, resetPassword } from './authApi';

describe('authApi - registerUser', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends the chosen submitter type to /api/auth/register, and only when there is one', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) } as Response);
    const base = { email: 'a@example.com', password: 'Str0ng!Passw0rd', full_name: 'A B', phone_number: '+251911000000' };

    await registerUser({ ...base, submitter_type: 'Development Agent' });
    await registerUser(base);

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toBe('/api/auth/register');
    expect(JSON.parse(calls[0]![1].body)).toEqual({ ...base, submitter_type: 'Development Agent' });
    expect(JSON.parse(calls[1]![1].body)).toEqual(base);
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
        full_name: 'Abebe Bikila',
        last_name: 'Bikila',
        login_email: 'abebe.farmer.344012394@example.com',
        mobile_no: '+251934401239',
        profiles: {
          grievance: {
            administrative_area: 'kebele-ET140108101008',
            administrative_unit: 'Kebele 01 Center',
            identities: [{ scheme: 'fayda', value: 'ET-FAYDA-344012394' }],
            preferred_language: 'en',
            profile_id: 'SUB-00141',
            type: 'Individual Farmer',
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
    expect(user.fayda_id).toBe('ET-FAYDA-344012394');
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
      full_name: 'Test NGO',
      last_name: 'NGO',
      login_email: 'test_ngo@gmail.com',
      mobile_no: '+251987654312',
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

  it('reads no Fayda ID for an NGO or FPO, even if the backend sent one among its identities', async () => {
    const body = ngoMe(REGISTERED_ORG);
    body.data.profiles.grievance.identities = [
      { scheme: 'org', value: '1234567890' },
      { scheme: 'fayda', value: '1234567890123456' },
    ];
    mockMe(body);
    expect((await getMe()).fayda_id).toBeUndefined();

    body.data.profiles.grievance.type = 'FPO';
    mockMe(body);
    expect((await getMe()).fayda_id).toBeUndefined();
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

  it('throws sessionExpired if data is missing or unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(getMe()).rejects.toThrow('UNAUTHORIZED');
  });
});
