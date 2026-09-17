/**
 * Types for the grievance list screen.
 *
 * `GrievanceListItem` mirrors a row returned by GET /api/v1/grievances
 * (see `oan_grievance_rest_collection.json` → "7b. List Grievances"); `Grievance`
 * is the flattened shape the table and detail sidebar render.
 */

export interface GrievanceListItem {
  name: string;
  ticket_number: string;
  status: string;
  escalated: boolean;
  submission_channel?: string | null;
  submitter?: string | null;
  submitter_name?: string | null;
  contact_mobile?: string | null;
  contact_email?: string | null;
  is_anonymous: boolean;
  administrative_area?: string | null;
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
  title: string;
  location: string;
  type: string;
  category: string;
  status: string;
  submittedAt: string;
  escalated: boolean;
  isAnonymous: boolean;
  submitterName: string;
  contactMobile: string;
  contactEmail: string;
  department: string;
  assignedTo: string;
  slaDueDate: string;
  submissionChannel: string;
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
