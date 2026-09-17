import type { Grievance, GrievanceListItem } from '../types';

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
    ticketId: item.ticket_number || item.name,
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
  };
}
