/**
 * Response templates as administrators manage them — mirrors
 * `AdminResponseTemplate` and its request bodies in
 * oan_grievance_service/openapi/openapi_v1.public.yaml.
 */

export interface ResponseTemplate {
  /** Template code; the identifier, fixed once created. */
  template: string;
  title: string;
  response_type: string;
  /** Null for every department. */
  department?: string | null;
  /** Null for every category. */
  service_category?: string | null;
  /**
   * Jinja template for the action's reason, unrendered. Authored and shown
   * as Action taken + Resolution summary (see `@/lib/responseBody`).
   */
  body: string;
  /** Actions sent with this template. */
  usage_count: number;
  is_active: boolean;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ResponseTemplateListData {
  response_templates: ResponseTemplate[];
  pagination: Pagination;
}

export interface ResponseTemplateData {
  response_template: ResponseTemplate;
}

export interface ResponseTemplateListParams {
  page?: number;
  page_size?: number;
  response_type?: string;
  department?: string;
  service_category?: string;
  is_active?: boolean;
}

/** `CreateResponseTemplateRequest`. An omitted department or category means "every". */
export interface CreateResponseTemplatePayload {
  template: string;
  title: string;
  response_type: string;
  department?: string | null;
  service_category?: string | null;
  body: string;
  is_active?: boolean;
}

/** `UpdateResponseTemplateRequest`: partial; the code can't change, and null clears a scope. */
export type UpdateResponseTemplatePayload = Partial<Omit<CreateResponseTemplatePayload, 'template'>>;

/** `AdminResponseType`, the choices for a template's response type. */
export interface AdminResponseType {
  response_type: string;
  workflow_action: string;
  description?: string | null;
  is_active: boolean;
}

export interface AdminResponseTypeListData {
  response_types: AdminResponseType[];
  pagination: Pagination;
}

/** The variables `render_context` in the service makes available to a template body. */
export const TEMPLATE_VARIABLES = [
  'ticket_number',
  'service_category',
  'grievance_type',
  'department',
  'submitter_name',
  'officer_name',
  'today',
  'sla_due_date',
] as const;
