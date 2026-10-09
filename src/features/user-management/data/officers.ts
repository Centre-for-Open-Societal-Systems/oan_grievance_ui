import type { OfficerLevel, OfficerRole } from '../types';

export type OfficerStatus = 'Active' | 'On Leave' | 'Inactive';
export type OfficerTabId = 'admin' | 'nodal-l1' | 'nodal-l2' | 'reviewer';

export interface Officer {
  id: string;
  name: string;
  status: OfficerStatus;
  /** Display label only — `designation` if the backend has one, else a generic fallback by role/level. Never write this back as if it were the real designation; see `designation` below. */
  roleTitle: string;
  /** The backend's actual `designation`, or null if it never set one. What an edit form should seed and save — `roleTitle` above is a display fallback, not this value. */
  designation: string | null;
  department: string;
  email: string;
  phone: string;
  /** Display label — the area's name when the backend sent one, else its raw id, else `'-'`. */
  region: string;
  /**
   * The area's own id, independent of whether `region` above is a display name or (when
   * the backend omitted `region_name`) that same raw id shown as if it were one. Editing an
   * officer must seed the region picker from this, never from re-matching `region` against
   * the area list by name — that match silently fails whenever `region` already holds a raw
   * id, and used to send `region: null` on save, wiping it.
   */
  regionId: string | null;
  tags: string[];
  assigned: number;
  resolved: number;
  avgTimeDays: number;
  resolutionRate: number;
  avatarInitials: string;
  avatarBg: string;
  avatarColor: string;
  /** True while a real officer still holds an admin-issued temporary password. */
  mustChangePassword: boolean;
  /** The L1 officer's L2 supervisor (user id/email), or null. */
  reportsTo: string | null;
}

export interface OfficerTabConfig {
  id: OfficerTabId;
  label: string;
  description: string;
  addButtonLabel: string;
  listLabel: string;
}

export const OFFICER_TABS: OfficerTabConfig[] = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Manage administrators, roles, and access permissions in one place.',
    addButtonLabel: 'Add Admin',
    listLabel: 'Admins',
  },
  {
    id: 'nodal-l1',
    label: 'Nodal Officers (L1)',
    description: 'Manage first-level nodal officers handling grievances across woredas and regions.',
    addButtonLabel: 'Add Nodal Officer',
    listLabel: 'Nodal Officers',
  },
  {
    id: 'nodal-l2',
    label: 'Senior Nodal Officers (L2)',
    description: 'Manage senior nodal officers overseeing escalations and regional reviews.',
    addButtonLabel: 'Add Senior Nodal Officer',
    listLabel: 'Senior Nodal Officers',
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    description: 'Read-only oversight accounts — can view grievances, officers, and category assignments, but cannot create, edit, or resolve anything.',
    addButtonLabel: 'Add Reviewer',
    listLabel: 'Reviewers',
  },
];

/** `OFFICER_TABS` keyed by id, for an exhaustively-typed O(1) lookup instead of `.find()!`. */
export const OFFICER_TABS_BY_ID: Record<OfficerTabId, OfficerTabConfig> = Object.fromEntries(
  OFFICER_TABS.map((tab) => [tab.id, tab])
) as Record<OfficerTabId, OfficerTabConfig>;

/**
 * What each tab actually queries on `GET /api/v1/officers` (STG-443): the Admin tab is an
 * Officer at level L3 (a department head — the department's final escalation rung), not a
 * distinct "Admin" role; there is no such role on the wire. The Reviewer tab has no level at
 * all — sending one is refused (400) — so it's `undefined` here, never a level string.
 */
export const OFFICER_TAB_QUERY: Record<OfficerTabId, { role: OfficerRole; level?: OfficerLevel }> = {
  admin: { role: 'Officer', level: 'L3' },
  'nodal-l1': { role: 'Officer', level: 'L1' },
  'nodal-l2': { role: 'Officer', level: 'L2' },
  reviewer: { role: 'Reviewer' },
};

export const STATUS_STYLES: Record<OfficerStatus, { dot: string; text: string; bg: string; border: string }> = {
  Active: { dot: 'bg-[#16A34A]', text: 'text-[#16A34A]', bg: 'bg-[#16A34A]/5', border: 'border-[#16A34A]/30' },
  'On Leave': { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Inactive: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Inputs: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  Markets: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  Payments: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  Credit: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  Schemes: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
};

export const DEFAULT_TAG_STYLE = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

/** The Add/Edit forms' and the filter drawer's status dropdown for an Officer (L1/L2/L3). */
export const OFFICER_STATUS_OPTIONS: OfficerStatus[] = ['Active', 'On Leave', 'Inactive'];
/** A Reviewer has no 'On Leave' status — the backend refuses it (400). */
export const REVIEWER_STATUS_OPTIONS: OfficerStatus[] = ['Active', 'Inactive'];
