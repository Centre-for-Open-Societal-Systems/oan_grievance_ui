/**
 * Badge colours for a grievance status. Lifecycle statuses are configured
 * backend-side, so the lookup forgives spelling (case, `_`/`-`) and maps
 * known aliases onto one colour; anything new falls back to neutral.
 */
const STATUS_BADGE: Record<string, string> = {
  assigned: 'bg-blue-50 text-blue-600 border border-blue-200/60',
  submitted: 'bg-slate-50 text-slate-600 border border-slate-200/60',
  'in progress': 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
  'under investigation': 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
  'require more info': 'bg-orange-50 text-orange-700 border border-orange-200/60',
  resolved: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
  closed: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
  rejected: 'bg-red-50 text-red-600 border border-red-200/60',
  'under review': 'bg-purple-50 text-purple-600 border border-purple-200/60',
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
