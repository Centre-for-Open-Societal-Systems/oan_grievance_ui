import type { Grievance, GrievanceListItem, TimelineEntry, TimelineEventItem } from '../types';

/**
 * Frappe returns naive datetimes ("2026-05-28 10:42:13.123456"). `new Date` treats
 * that space-separated form inconsistently across engines, so normalise to ISO-ish
 * local time before parsing.
 */
function parseBackendDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | null): string {
  const date = parseBackendDate(value);
  if (!date) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value?: string | null): string {
  const date = parseBackendDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Administrative areas are named by their dotted path code (e.g. `ET.OR.BSH`);
 * the list endpoint returns the link name rather than the display label.
 */
function formatAreaPath(area?: string | null): string {
  if (!area) return '';
  return area.split('.').join(' / ');
}

/** First line of the description, used as the row title. */
function deriveTitle(description?: string | null): string {
  if (!description) return 'Untitled grievance';
  const firstLine = description.split(/\r?\n/).find((line) => line.trim().length > 0);
  const text = (firstLine ?? description).trim();
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

export function mapGrievanceListItem(item: GrievanceListItem): Grievance {
  const submitterName = item.is_anonymous ? 'Anonymous' : (item.submitter_name ?? '');
  const area = formatAreaPath(item.administrative_area);

  return {
    id: item.name,
    ticketNumber: item.ticket_number || item.name,
    ticketId: item.ticket_number_display || item.ticket_number || item.name,
    ticketNumberDisplay: item.ticket_number_display ?? undefined,
    title: deriveTitle(item.description),
    location: [submitterName, area].filter(Boolean).join(' - '),
    type: item.grievance_type ?? '',
    category: item.service_category ?? '',
    status: item.status,
    submittedAt: formatDateTime(item.submitted_on),
    escalated: Boolean(item.escalated),
    isAnonymous: Boolean(item.is_anonymous),
    submitterName,
    contactMobile: item.is_anonymous ? '' : (item.contact_mobile ?? ''),
    contactEmail: item.is_anonymous ? '' : (item.contact_email ?? ''),
    department: item.department ?? item.assigned_dept ?? '',
    assignedTo: item.assigned_to ?? '',
    slaDueDate: formatDate(item.sla_due_date),
    submissionChannel: item.submission_channel ?? '',
    description: item.description ?? '',
    administrativeArea: item.administrative_area ?? '',
  };
}

/**
 * Extract 1-2 letter initials for an author or actor name.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  const first = parts[0] ?? '';
  if (parts.length === 1) {
    return first.length >= 2 ? first.slice(0, 2).toUpperCase() : (first || '??').toUpperCase();
  }
  const last = parts[parts.length - 1] ?? '';
  const firstChar = first[0] ?? '';
  const lastChar = last[0] ?? '';
  const result = (firstChar + lastChar).toUpperCase();
  return result || '??';
}

export interface FormattedTimelineEvent {
  id: string;
  entryType: string;
  typeLabel: string;
  isInternal: boolean;
  body: string;
  authorName: string;
  authorRole?: string;
  authorType: 'submitter' | 'officer' | 'system';
  initials: string;
  formattedDate: string;
  rawDate: string;
  fromStatus?: string | null;
  toStatus?: string | null;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  note: 'Internal Note',
  message: 'Public Message',
  response: 'Dept Response',
  info_request: 'Info Request',
  info_response: 'Info Response',
  status_change: 'Status Change',
  assignment: 'Assignment',
  escalation: 'Escalation',
  attachment: 'Attachment',
  submission: 'Submission',
  'Status Change': 'Status Change',
  'Submission': 'Submission',
  'Assignment': 'Assignment',
  'Note': 'Note',
  'Message': 'Message',
  'Escalation': 'Escalation',
  'Resolution': 'Resolution',
  'Reopen': 'Reopened',
  'Rejection': 'Rejected',
};

export function normalizeTimelineEntry(
  entry: TimelineEntry | TimelineEventItem,
  index = 0
): FormattedTimelineEvent {
  // Support both backend schema (`TimelineEntry`) and OpenAPI schema (`TimelineEventItem`)
  const rawType = (entry as TimelineEntry).entry_type || (entry as TimelineEventItem).event_type || 'message';
  const rawCreated = (entry as TimelineEntry).created_on || (entry as TimelineEventItem).creation || '';
  const isInternal = Boolean(entry.is_internal);

  let authorName = (entry as TimelineEntry).author_name;
  if (!authorName && (entry as TimelineEventItem).actor) {
    authorName = (entry as TimelineEventItem).actor;
  }
  if (!authorName) {
    authorName = isInternal ? 'Case Officer' : 'Citizen Submitter';
  }

  const authorRole = (entry as TimelineEventItem).actor_role || undefined;

  let authorType: 'submitter' | 'officer' | 'system' = 'submitter';
  if ((entry as TimelineEntry).author_type) {
    authorType = (entry as TimelineEntry).author_type as 'submitter' | 'officer' | 'system';
  } else if (isInternal || authorRole || rawType === 'response' || rawType === 'status_change') {
    authorType = 'officer';
  }

  const body = (entry as TimelineEntry).body || (entry as TimelineEventItem).message || '';
  const typeLabel = ENTRY_TYPE_LABELS[rawType] || rawType;

  return {
    id: (entry as TimelineEntry).name || `evt-${index}-${rawCreated}`,
    entryType: rawType,
    typeLabel,
    isInternal,
    body,
    authorName,
    authorRole,
    authorType,
    initials: getInitials(authorName),
    formattedDate: formatDateTime(rawCreated),
    rawDate: rawCreated,
    fromStatus: (entry as TimelineEventItem).from_status,
    toStatus: (entry as TimelineEventItem).to_status,
  };
}
