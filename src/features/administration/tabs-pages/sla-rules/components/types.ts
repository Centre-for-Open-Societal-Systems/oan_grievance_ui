/**
 * SLA rules as administrators manage them — mirrors `SlaRuleRecord` in
 * oan_grievance_service/api/v1/sla_rules.py.
 */

export interface SlaRule {
  /** The rule's id; the identifier GET, PATCH and DELETE take. */
  name: string;
  service_category: string;
  /** The category's base rule: no level, type, area or window. It cannot be deleted or narrowed. */
  is_base: boolean;
  rule_label: string | null;
  /** Escalation rung the days are for. Null: the days for the whole case, the ones the SLA clock runs on. */
  role_level: string | null;
  grievance_type: string | null;
  administrative_area: string | null;
  /** The area's name. Read only. */
  administrative_area_name?: string | null;
  /** All four window fields, or none for all year. */
  start_month: number | null;
  start_day: number | null;
  end_month: number | null;
  end_day: number | null;
  sla_days: number;
  is_urgent: boolean;
  /** `Urgent` for an urgent rule, null otherwise. Read only. */
  priority: 'Urgent' | null;
  modified?: string | null;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SlaRuleData {
  rule: SlaRule;
}

export interface SlaRuleListData {
  rules: SlaRule[];
  pagination: Pagination;
}

/** Rules that differ only by grievance type; a rule for every type is never in one with typed rules. */
export interface SlaRuleCluster {
  /** The oldest rule's id. Any member's id names the cluster. */
  cluster_id: string;
  /** Empty: the cluster is one rule for every type. */
  grievance_types: string[];
  /** Oldest first. They share every field but `name`, `grievance_type` and `modified`. */
  rules: [SlaRule, ...SlaRule[]];
}

export interface SlaRuleClusterData {
  cluster: SlaRuleCluster;
}

export interface SlaRuleClusterListData {
  clusters: SlaRuleCluster[];
  pagination: Pagination;
}

export type SlaRuleClusterListParams = Omit<SlaRuleListParams, 'grievance_type'>;

export interface SlaRuleListParams {
  page?: number;
  page_size?: number;
  service_category?: string;
  role_level?: string;
  grievance_type?: string;
  administrative_area?: string;
  is_urgent?: boolean;
  is_base?: boolean;
}

/** The scope a rule may name; blank or null means "every". */
type SlaRuleScope = Partial<
  Pick<
    SlaRule,
    | 'rule_label'
    | 'role_level'
    | 'grievance_type'
    | 'administrative_area'
    | 'start_month'
    | 'start_day'
    | 'end_month'
    | 'end_day'
  >
>;

export interface SlaRulesCreatedData {
  /** One rule per grievance type sent, in the order sent. */
  rules: SlaRule[];
}

export interface CreateSlaRulePayload extends Omit<SlaRuleScope, 'grievance_type'> {
  /** Id, name or code of the category. */
  service_category: string;
  /** One rule is made per type, all sharing the other fields. Omitted: one rule for every type. */
  grievance_types?: string[];
  sla_days: number;
  is_urgent?: boolean;
}

/** Partial; omitted fields stay, `null` clears a scope field. The category is fixed. */
export type UpdateSlaRulePayload = SlaRuleScope & Partial<Pick<SlaRule, 'sla_days' | 'is_urgent'>>;

/**
 * Partial update of a whole cluster. `grievance_types` is its new set of types (empty: every
 * type; omitted: unchanged).
 */
export type UpdateSlaRuleClusterPayload = Omit<UpdateSlaRulePayload, 'grievance_type'> & { grievance_types?: string[] };
