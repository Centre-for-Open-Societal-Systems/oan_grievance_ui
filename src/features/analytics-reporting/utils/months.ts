const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Whether `value` is a complete `YYYY-MM` month. A half-typed one ("2026-1") is not. */
export function isMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** The current month as `YYYY-MM`, in the viewer's time zone. */
export function currentMonth(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/** Whether `value` is a month that can be asked for: complete, and not after `max`. */
export function isSelectableMonth(value: string, max: string): boolean {
  return isMonth(value) && value <= max;
}
