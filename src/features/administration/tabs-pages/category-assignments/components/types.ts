/**
 * Category assignments as administrators manage them — mirrors
 * `CategoryAssignmentRecord` and its request bodies in
 * oan_grievance_service/api/v1/category_assignment.py.
 *
 * A category assignment is a category-only Grievance RBAC Assignment: one desk
 * per (department, service category), routing that category's grievances in
 * that department to an L1 officer (and optionally an L2). `sla_days` and
 * `auto_escalate` belong to the service category itself, not to this one
 * department's rule — every department serving that category shares them.
 */

export interface CategoryAssignment {
  /** The desk's id; fixed once created. */
  name: string;
  service_category: string;
  department: string;
  l1_officer: string | null;
  l1_officer_name: string | null;
  l2_officer: string | null;
  l2_officer_name: string | null;
  sla_days: number | null;
  auto_escalate: boolean | null;
  active: boolean;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CategoryAssignmentListData {
  assignments: CategoryAssignment[];
  pagination: Pagination;
}

export interface CategoryAssignmentData {
  assignment: CategoryAssignment;
}

export interface ListCategoryAssignmentsParams {
  page?: number;
  page_size?: number;
  service_category?: string;
  department?: string;
  active?: boolean;
}

export interface CreateCategoryAssignmentPayload {
  service_category: string;
  department: string;
  l1_officer: string;
  l2_officer?: string | null;
  sla_days: number;
  auto_escalate?: boolean;
  active?: boolean;
}

/** Partial update; `service_category` is fixed once created, so it's never sent back. */
export type UpdateCategoryAssignmentPayload = Partial<Omit<CreateCategoryAssignmentPayload, 'service_category'>>;
