import { ApiErrorCode, classifyError } from '@/lib/api/apiErrors';
import { cleanBackendMessage } from '../api/organisationApi';

/** Keys under `organisation.errors` for the failures `fetchApi` reports as bare sentinels. */
export type KnownFailure = 'forbidden' | 'connection' | 'session';

/**
 * Which known failure `error` is, or null. `fetchApi` throws the bare strings
 * FORBIDDEN / CONNECTION / UNAUTHORIZED for a 403, a 5xx or a dropped
 * connection, and a 401 that survives its silent refresh — none of which is
 * fit to show a person as it stands.
 */
export function knownFailureOf(error: unknown): KnownFailure | null {
  switch (classifyError(error)) {
    case ApiErrorCode.Forbidden:
      return 'forbidden';
    case ApiErrorCode.Connection:
      return 'connection';
    case ApiErrorCode.Auth:
      return 'session';
    default:
      return null;
  }
}

/** The backend's own message for a failure that is none of the known ones (a rule only it can check), or null. */
export function backendMessageOf(error: unknown): string | null {
  return error instanceof Error && error.message ? cleanBackendMessage(error.message) : null;
}
