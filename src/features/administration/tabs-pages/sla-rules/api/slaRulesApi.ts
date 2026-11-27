import { fetchApi } from '@/lib/api';
import type {
  CreateSlaRulePayload,
  SlaRuleClusterData,
  SlaRuleClusterListData,
  SlaRuleClusterListParams,
  SlaRuleData,
  SlaRuleListData,
  SlaRuleListParams,
  SlaRulesCreatedData,
  UpdateSlaRuleClusterPayload,
  UpdateSlaRulePayload,
} from '../components/types';

interface RequestOptions {
  signal?: AbortSignal;
}

/** The service's largest page. */
export const MAX_PAGE_SIZE = 100;

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
 * The SLA rules, by service category and then oldest first.
 *
 * Corresponding REST endpoint: GET /api/v1/sla-rules
 */
export function fetchSlaRules(params: SlaRuleListParams = {}, options: RequestOptions = {}): Promise<SlaRuleListData> {
  return fetchApi<SlaRuleListData>(`/api/v1/sla-rules${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * The rules grouped into clusters; a page counts clusters, so a cluster is never split across pages.
 *
 * Corresponding REST endpoint: GET /api/v1/sla-rules/clusters
 */
export function fetchSlaRuleClusters(
  params: SlaRuleClusterListParams = {},
  options: RequestOptions = {}
): Promise<SlaRuleClusterListData> {
  return fetchApi<SlaRuleClusterListData>(`/api/v1/sla-rules/clusters${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Changes every rule of the cluster `ruleId` belongs to, in one transaction: kept types' rules
 * change, new types get a rule, dropped types lose theirs.
 *
 * Corresponding REST endpoint: PATCH /api/v1/sla-rules/clusters/:rule_id
 */
export function updateSlaRuleCluster(ruleId: string, payload: UpdateSlaRuleClusterPayload): Promise<SlaRuleClusterData> {
  return fetchApi<SlaRuleClusterData>(`/api/v1/sla-rules/clusters/${encodeURIComponent(ruleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Deletes every rule of the cluster `ruleId` belongs to, in one transaction.
 *
 * Corresponding REST endpoint: DELETE /api/v1/sla-rules/clusters/:rule_id
 */
export function deleteSlaRuleCluster(ruleId: string): Promise<SlaRuleClusterData> {
  return fetchApi<SlaRuleClusterData>(`/api/v1/sla-rules/clusters/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });
}

/**
 * Makes one rule per grievance type sent. A category's first rule must be its base rule (no level, type, area or window).
 *
 * Corresponding REST endpoint: POST /api/v1/sla-rules
 */
export function createSlaRule(payload: CreateSlaRulePayload): Promise<SlaRulesCreatedData> {
  return fetchApi<SlaRulesCreatedData>('/api/v1/sla-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Partial update. The base rule stays a base rule.
 *
 * Corresponding REST endpoint: PATCH /api/v1/sla-rules/:rule_id
 */
export function updateSlaRule(ruleId: string, payload: UpdateSlaRulePayload): Promise<SlaRuleData> {
  return fetchApi<SlaRuleData>(`/api/v1/sla-rules/${encodeURIComponent(ruleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Deletes one rule. The base rule cannot be deleted.
 *
 * Corresponding REST endpoint: DELETE /api/v1/sla-rules/:rule_id
 */
export function deleteSlaRule(ruleId: string): Promise<SlaRuleData> {
  return fetchApi<SlaRuleData>(`/api/v1/sla-rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });
}
