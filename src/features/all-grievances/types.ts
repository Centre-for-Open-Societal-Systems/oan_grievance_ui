/**
 * Types for the grievance list screen and detail timeline.
 *
 * `GrievanceListItem` mirrors a row returned by GET /api/v1/grievances
 * (see `oan_grievance_rest_collection.json` → "7b. List Grievances"); `Grievance`
 * is the flattened shape the table and detail sidebar render.
 */

export interface GrievanceListItem {
  name: string;
  ticket_number: string;
  ticket_number_display?: string | null;
  status: string;
  escalated: boolean;
  submission_channel?: string | null;
  submitter?: string | null;
  submitter_name?: string | null;
  contact_mobile?: string | null;
  contact_email?: string | null;
  is_anonymous: boolean;
  administrative_area?: string | null;
  location?: string | null;
  administrative_hierarchy?: Record<string, string> | null;
  service_category?: string | null;
  grievance_type?: string | null;
  description?: string | null;
  assigned_dept?: string | null;
  /** Alias of `assigned_dept` added by the backend for convenience. */
  department?: string | null;
  assigned_to?: string | null;
  sla_due_date?: string | null;
  confirmation_deadline?: string | null;
  submitted_on?: string | null;
  updated_at?: string | null;
}

export interface GrievanceListPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Payload returned by GET /api/v1/grievances */
export interface GrievanceListData {
  items: GrievanceListItem[];
  pagination: GrievanceListPagination;
}

export interface GrievanceListQueryParams {
  page?: number;
  page_size?: number;
  /** Multi-select filters are sent comma-separated, as the backend expects. */
  status?: string[];
  category?: string[];
  region?: string[];
  zone?: string[];
  woreda?: string[];
  kebele?: string[];
  location?: string[];
  administrative_area?: string[];
  grievance_type?: string[];
  department?: string[];
  submission_channel?: string[];
  /** `YYYY-MM-DD` */
  from_date?: string;
  /** `YYYY-MM-DD` */
  to_date?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** Row shape rendered by the table and the detail sidebar. */
export interface Grievance {
  id: string;
  ticketId: string;
  ticketNumber?: string;
  ticketNumberDisplay?: string;
  title: string;
  location: string;
  type: string;
  category: string;
  status: string;
  submittedAt: string;
  escalated: boolean;
  isAnonymous: boolean;
  submitterName: string;
  submitterType?: string;
  contactMobile: string;
  contactEmail: string;
  department: string;
  assignedTo: string;
  slaDueDate: string;
  submissionChannel: string;
  description?: string;
  administrativeArea?: string;
  administrativeUnit?: string;
}

/** Filters shared by the advanced-filters sidebar and the table column filters. */
export interface GrievanceFilters {
  status: string[];
  category: string[];
  regions: string[];
  dateRange: string | null;
  /** `YYYY-MM-DD`, empty when unset. */
  fromDate: string;
  /** `YYYY-MM-DD`, empty when unset. */
  toDate: string;
}

export const EMPTY_GRIEVANCE_FILTERS: GrievanceFilters = {
  status: [],
  category: [],
  regions: [],
  dateRange: null,
  fromDate: '',
  toDate: '',
};

/* --- Grievance Timeline Types --- */

export interface TimelineEntry {
  name: string;
  entry_type:
    | 'note'
    | 'message'
    | 'response'
    | 'info_request'
    | 'info_response'
    | 'status_change'
    | 'assignment'
    | 'escalation'
    | 'attachment'
    | 'submission'
    | string;
  is_internal: boolean;
  body: string;
  author_user?: string | null;
  author_submitter?: string | null;
  author_type?: 'submitter' | 'officer' | 'system' | string;
  author_name?: string | null;
  ref_doctype?: string | null;
  ref_docname?: string | null;
  created_on: string;
}

export interface TimelineEventItem {
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  actor: string;
  actor_role?: string | null;
  message?: string | null;
  communication_channel?: string | null;
  is_internal?: number | boolean;
  creation: string;
}

export interface GrievanceTimelineSummary {
  description?: string | null;
  desired_outcome?: string | null;
  service_category?: string | null;
  grievance_type?: string | null;
  administrative_area?: string | null;
  administrative_unit?: string | null;
  submission_channel?: string | null;
}

export interface GrievanceTimelineSubmitter {
  name?: string | null;
  mobile?: string | null;
  email?: string | null;
  submitter_type?: string | null;
  is_anonymous?: boolean;
  assisted_by_officer?: string | null;
}

export interface GrievanceTimelineSla {
  sla_days?: number | null;
  sla_start_at?: string | null;
  sla_due_date?: string | null;
  sla_consumed_percent?: number | null;
  next_escalation_at?: string | null;
  confirmation_deadline?: string | null;
}

export interface GrievanceTimelineAssignment {
  department?: string | null;
  assigned_to?: string | null;
  routed_automatically?: boolean;
}

export interface GrievanceAvailableAction {
  action: string;
  label: string;
  requires_reason: boolean;
}

export interface GrievanceTimelineAttachment {
  name: string;
  file_name?: string | null;
  file_url?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  document_type?: string | null;
  scan_status?: string | null;
  uploaded_by_user?: string | null;
  uploaded_by_submitter?: string | null;
  creation?: string | null;
  is_private?: number | boolean;
}

export interface GrievanceTimelineData {
  name?: string;
  ticket_number: string;
  ticket_number_display?: string;
  status: string;
  current_status?: string;
  escalated?: boolean;
  submitter_name?: string | null;
  service_category?: string | null;
  grievance_type?: string | null;
  administrative_area?: string | null;
  summary?: GrievanceTimelineSummary;
  submitter?: GrievanceTimelineSubmitter;
  sla?: GrievanceTimelineSla;
  assignment?: GrievanceTimelineAssignment;
  available_actions?: GrievanceAvailableAction[];
  attachments?: GrievanceTimelineAttachment[];
  timeline?: TimelineEntry[];
  events?: TimelineEventItem[];
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface GrievanceTimelineQueryParams {
  is_internal?: boolean;
  limit?: number;
  cursor?: string;
}

export interface GrievanceActionPayload {
  action: string;
  reason?: string;
  note?: string;
  rating?: number;
}

export interface GrievanceActionResult {
  ticket_number: string;
  status?: string;
  message?: string;
  action?: string;
  available_actions?: GrievanceAvailableAction[];
  action_timestamp?: string;
}
