/**
 * Fallback scale for a category card's SLA bar, used until the Global SLA Policy has loaded
 * (or if it fails to): the policy card's own default for "Max SLA Deferral (days)".
 */
export const DEFAULT_SLA_BAR_REFERENCE_DAYS = 30;

/**
 * How full a category's SLA bar is: its SLA window as a share of the global SLA figure
 * (the policy card's "Max SLA Deferral (days)"), capped at 100. A category longer than the
 * global figure shows a full bar.
 */
export function slaBarPercent(slaDays: number, referenceDays: number): number {
  if (!Number.isFinite(slaDays) || !Number.isFinite(referenceDays) || referenceDays <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((slaDays / referenceDays) * 100)));
}
