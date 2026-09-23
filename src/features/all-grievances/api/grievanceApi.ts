import { fetchApi } from '@/lib/api';
import type {
  GrievanceActionPayload,
  GrievanceActionResult,
  GrievanceListData,
  GrievanceListQueryParams,
  GrievanceTimelineData,
  GrievanceTimelineQueryParams,
} from '../types';

export interface RequestOptions {
  signal?: AbortSignal;
}

function buildListQuery(params: GrievanceListQueryParams): string {
  const searchParams = new URLSearchParams();

  const setScalar = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  };

  // The backend accepts multi-select filters as comma-separated values.
  const setMulti = (key: string, values: string[] | undefined) => {
    if (!values || values.length === 0) return;
    searchParams.set(key, values.join(','));
  };

  setScalar('page', params.page);
  setScalar('page_size', params.page_size);
  setMulti('status', params.status);
  setMulti('category', params.category);
  setMulti('region', params.region);
  setMulti('zone', params.zone);
  setMulti('woreda', params.woreda);
  setMulti('kebele', params.kebele);
  setMulti('location', params.location);
  setMulti('administrative_area', params.administrative_area);
  setMulti('grievance_type', params.grievance_type);
  setMulti('department', params.department);
  setMulti('submission_channel', params.submission_channel);
  setScalar('from_date', params.from_date);
  setScalar('to_date', params.to_date);
  setScalar('search', params.search?.trim());
  setScalar('sort_by', params.sort_by);
  setScalar('sort_order', params.sort_order);

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function buildTimelineQuery(params: GrievanceTimelineQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.is_internal !== undefined) {
    searchParams.set('is_internal', String(params.is_internal));
  }
  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Protected list endpoint for Grievance Submitters, Officers, and Administrators.
 * Returns a page of grievances scoped by the caller's RBAC permissions, with
 * multi-select filtering on status, category, region, type, department, and channel.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances
 */
export async function fetchGrievances(
  params: GrievanceListQueryParams = {},
  options: RequestOptions = {}
): Promise<GrievanceListData> {
  return fetchApi<GrievanceListData>(`/api/v1/grievances${buildListQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Total number of grievances matching `params`, without transferring the rows.
 * Used for the metric cards, which need counts per status bucket.
 */
export async function fetchGrievanceCount(
  params: GrievanceListQueryParams = {},
  options: RequestOptions = {}
): Promise<number> {
  const data = await fetchGrievances({ ...params, page: 1, page_size: 1 }, options);
  return data?.pagination?.total_count ?? 0;
}

/**
 * Retrieves the complete chronological audit log, state transitions, conversation
 * thread, case details, SLA progress, and assignments for a given grievance.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances/:ticket_number/timeline
 */
export async function fetchGrievanceTimeline(
  ticketNumber: string,
  params: GrievanceTimelineQueryParams = {},
  options: RequestOptions = {}
): Promise<GrievanceTimelineData> {
  return fetchApi<GrievanceTimelineData>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/timeline${buildTimelineQuery(params)}`,
    {
      method: 'GET',
      signal: options.signal,
    }
  );
}

/**
 * Appends a public message to the grievance conversation thread, visible to both
 * citizens and case officers.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/message
 */
export async function postGrievanceMessage(
  ticketNumber: string,
  body: string,
  options: RequestOptions = {}
): Promise<GrievanceActionResult> {
  return fetchApi<GrievanceActionResult>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/message`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        message: body,
        body,
      }),
      signal: options.signal,
    }
  );
}

/**
 * Records an internal or public staff note on the grievance case (staff only).
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/note
 */
export async function addGrievanceNote(
  ticketNumber: string,
  body: string,
  isInternal = true,
  options: RequestOptions = {}
): Promise<GrievanceActionResult> {
  return fetchApi<GrievanceActionResult>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/note`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        note: body,
        body,
        is_internal: isInternal,
      }),
      signal: options.signal,
    }
  );
}

/**
 * Executes a lifecycle state transition or workflow action on a grievance.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/action
 */
export async function executeGrievanceAction(
  ticketNumber: string,
  payload: GrievanceActionPayload,
  options: RequestOptions = {}
): Promise<GrievanceActionResult> {
  return fetchApi<GrievanceActionResult>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/action`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        ...payload,
      }),
      signal: options.signal,
    }
  );
}

/** Service object matching the OAN A2C enterprise standard */
export const grievanceService = {
  listGrievances: fetchGrievances,
  countGrievances: fetchGrievanceCount,
  getTimeline: fetchGrievanceTimeline,
  postMessage: postGrievanceMessage,
  addNote: addGrievanceNote,
  executeAction: executeGrievanceAction,
};
