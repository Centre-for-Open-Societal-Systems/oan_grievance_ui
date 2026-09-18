import { GrievanceApiError } from '@/lib/grievanceApi';

// Client for oan_auth_service's `get_me` — richer than the `email`/`roles`
// this app already decodes straight from the access-token cookie (see
// `/api/auth/me`'s own doc comment): full name, phone, and a per-app
// `profiles` namespace (e.g. `profiles.grievance` — submitter identity for a
// submitter, role/scope for an officer or admin). Fetched lazily by the
// profile page only; the global session bootstrap keeps using the cheaper
// JWT-claims read, since nothing else in the app needs this richer shape.

export interface GrievanceProfile {
  profile_id: string;
  full_name: string | null;
  type: string;
  role: string;
  identity_scheme?: string;
  identity_value?: string;
  fayda_id?: string | null;
  registration_number?: string | null;
  contact_mobile?: string | null;
  contact_email?: string | null;
  preferred_language?: string | null;
  administrative_area?: string | null;
  administrative_unit?: string | null;
  active?: number;
  is_blocked?: number;
  role_level?: string | null;
  department?: string | null;
  category?: string | null;
  active_assignments?: unknown[];
}

export interface MeResponse {
  user: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  login_email: string | null;
  mobile_no: string | null;
  roles: string[];
  profiles?: {
    grievance?: GrievanceProfile;
  };
}

export async function getMe(): Promise<MeResponse> {
  // `/api/v1/auth/me` — the newer Werkzeug REST route, not the classic
  // `/api/method/oan_auth_service.api.v1.auth.get_me` RPC path. That classic
  // path isn't JWT-protected for this app (only `/api/v1/*` is registered as
  // a protected namespace — see `oan_auth_service/api/router.py`), so calling
  // it 401s regardless of a valid Bearer token. The REST route also returns
  // its envelope directly at the top level (`{status, data, message, ...}`),
  // not nested under a `.message` key the way classic RPC responses are.
  const response = await fetch('/api/proxy/api/v1/auth/me', { method: 'GET' });

  const envelope = (await response.json().catch(() => ({}))) as
    | { status?: string; message?: string; data?: MeResponse }
    | undefined;

  if (!response.ok || envelope?.status === 'error') {
    throw new GrievanceApiError(envelope?.message || `Request failed with status ${response.status}`, response.status);
  }

  if (!envelope?.data) {
    throw new GrievanceApiError('Profile response was missing data.', 502);
  }

  return envelope.data;
}
