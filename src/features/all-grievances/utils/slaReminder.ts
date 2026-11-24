import { normalizeStatus } from './statusStyles';

/** How many days before the SLA due date a grievance starts showing a reminder. */
export const SLA_REMINDER_DAYS = 3;

/** Statuses that no longer have a running SLA, as `normalizeStatus` writes them. */
const CLOSED_STATUSES = ['resolved', 'closed', 'rejected'];

/**
 * The backend's date or datetime as a local time. A bare `YYYY-MM-DD` is read as that calendar day
 * here, not as UTC midnight, which would be the evening before in a time zone behind UTC.
 */
function parseDueDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  return new Date(value.includes('T') ? value : value.replace(' ', 'T'));
}

export type SlaReminder =
  | { kind: 'overdue'; days: number }
  | { kind: 'dueToday' }
  | { kind: 'dueSoon'; days: number };

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * The reminder a grievance row shows for its SLA, or null when it has none: the case is
 * finished, has no due date, or is more than `SLA_REMINDER_DAYS` days from breaching.
 * Counts whole calendar days, so a case due at 17:00 today is "due today" all day.
 * `dueDate` is the backend's `sla_due_date` (a date or a Frappe datetime).
 */
export function getSlaReminder(
  dueDate: string | null | undefined,
  status: string | null | undefined,
  now: Date = new Date()
): SlaReminder | null {
  if (!dueDate) return null;
  if (status && CLOSED_STATUSES.includes(normalizeStatus(status))) return null;
  const due = parseDueDate(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  if (days < 0) return { kind: 'overdue', days: -days };
  if (days === 0) return { kind: 'dueToday' };
  if (days <= SLA_REMINDER_DAYS) return { kind: 'dueSoon', days };
  return null;
}

function isUrgent(reminder: SlaReminder): boolean {
  return reminder.kind === 'dueToday' || (reminder.kind === 'dueSoon' && reminder.days === 1);
}

/** Row background and left accent for a case about to breach: amber while days remain, orange when due tomorrow or today. */
export function slaRowClass(reminder: SlaReminder | null): string {
  // A breached case keeps the plain row; only its badge says so.
  if (!reminder || reminder.kind === 'overdue') return 'hover:bg-gray-50/80';
  if (isUrgent(reminder)) return 'bg-orange-50 hover:bg-orange-100/70 shadow-[inset_4px_0_0_#ea580c]';
  return 'bg-amber-50 hover:bg-amber-100/70 shadow-[inset_4px_0_0_#f59e0b]';
}

/** Colours for the reminder badge, matching `slaRowClass`. */
export function slaBadgeClass(reminder: SlaReminder): string {
  if (reminder.kind === 'overdue') return 'bg-red-100 text-red-700 border-red-200';
  if (isUrgent(reminder)) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}
