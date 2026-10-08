import { fetchApi } from '@/lib/api';
import type {
  CategoryAssignmentData,
  CategoryAssignmentListData,
  CreateCategoryAssignmentPayload,
  ListCategoryAssignmentsParams,
  UpdateCategoryAssignmentPayload,
} from '../components/types';

interface RequestOptions {
  signal?: AbortSignal;
}

function query(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * Admin list of category-to-department routing rules, filterable by category,
 * department, and active flag.
 *
 * Corresponding REST endpoint: GET /api/v1/category-assignments
 */
export function fetchCategoryAssignments(
  params: ListCategoryAssignmentsParams = {},
  options: RequestOptions = {}
): Promise<CategoryAssignmentListData> {
  return fetchApi<CategoryAssignmentListData>(`/api/v1/category-assignments${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Corresponding REST endpoint: POST /api/v1/category-assignments
 */
export function createCategoryAssignment(payload: CreateCategoryAssignmentPayload): Promise<CategoryAssignmentData> {
  return fetchApi<CategoryAssignmentData>('/api/v1/category-assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Partial update — department, officers, SLA window, auto-escalate, active.
 * The service category is fixed once created.
 *
 * Corresponding REST endpoint: PATCH /api/v1/category-assignments/:assignment
 */
export function updateCategoryAssignment(
  assignment: string,
  payload: UpdateCategoryAssignmentPayload
): Promise<CategoryAssignmentData> {
  return fetchApi<CategoryAssignmentData>(`/api/v1/category-assignments/${encodeURIComponent(assignment)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Deactivates a routing rule — the desk stays for audit, same as PATCH with
 * `active: false`. Repeating it is a no-op.
 *
 * Corresponding REST endpoint: DELETE /api/v1/category-assignments/:assignment
 */
export function deactivateCategoryAssignment(assignment: string): Promise<CategoryAssignmentData> {
  return fetchApi<CategoryAssignmentData>(`/api/v1/category-assignments/${encodeURIComponent(assignment)}`, {
    method: 'DELETE',
  });
}
