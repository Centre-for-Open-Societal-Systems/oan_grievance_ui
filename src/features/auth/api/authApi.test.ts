import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getMe } from './authApi';

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
        mobile_no: '+2519344012394',
        profiles: {
          grievance: {
            active: 1,
            administrative_area: 'kebele-ET140108101008',
            administrative_unit: 'Kebele 01 Center',
            contact_email: null,
            contact_mobile: '+2519344012394',
            fayda_id: 'ET-FAYDA-344012394',
            full_name: 'Abebe Bikila',
            identity_scheme: 'fayda',
            identity_value: 'ET-FAYDA-344012394',
            is_blocked: 0,
            preferred_language: 'en',
            profile_id: 'SUB-00141',
            registration_number: null,
            role: 'Grievance Submitter',
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
    expect(user.mobile_no).toBe('+2519344012394');
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

  it('throws sessionExpired if data is missing or unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(getMe()).rejects.toThrow('UNAUTHORIZED');
  });
});
