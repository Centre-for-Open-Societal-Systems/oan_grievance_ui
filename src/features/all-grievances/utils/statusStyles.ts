/**
 * Badge colours for a grievance status. Lifecycle statuses are configured
 * backend-side, so the lookup forgives spelling (case, `_`/`-`) and maps
 * known aliases onto one colour; anything new falls back to neutral.
 */
const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-sky-50 text-sky-700 border border-sky-200/70',
  assigned: 'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
  'in progress': 'bg-green-50 text-green-700 border border-green-200/70',
  'under investigation': 'bg-green-50 text-green-700 border border-green-200/70',
  'under review': 'bg-violet-50 text-violet-700 border border-violet-200/70',
  'require more info': 'bg-pink-50 text-pink-700 border border-pink-200/70',
  resolved: 'bg-teal-50 text-teal-800 border border-teal-200/70',
  closed: 'bg-gray-100 text-gray-700 border border-gray-300/70',
  rejected: 'bg-red-50 text-red-700 border border-red-200/70',
};

const STATUS_ALIASES: Record<string, string> = {
  'more info needed': 'require more info',
};

const NEUTRAL_BADGE = 'bg-gray-100 text-gray-700';

function normalize(status: string): string {
  return status.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return NEUTRAL_BADGE;
  const key = normalize(status);
  return STATUS_BADGE[key] ?? STATUS_BADGE[STATUS_ALIASES[key] ?? ''] ?? NEUTRAL_BADGE;
}

/** Whether the status is the one that asks the submitter for more information (the only state they act on). */
export function isMoreInfoStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const key = normalize(status);
  return (STATUS_ALIASES[key] ?? key) === "require more info";
}
