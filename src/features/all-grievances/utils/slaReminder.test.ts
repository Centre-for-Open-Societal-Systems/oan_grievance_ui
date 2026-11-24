import { describe, expect, it } from 'vitest';
import { getSlaReminder } from './slaReminder';

const NOW = new Date(2026, 9, 31, 15, 0, 0); // 31 Oct 2026, 15:00

describe('getSlaReminder', () => {
  it('counts the days left when the due date is within three days', () => {
    expect(getSlaReminder('2026-11-03', 'In Progress', NOW)).toEqual({ kind: 'dueSoon', days: 3 });
    expect(getSlaReminder('2026-11-01 09:00:00', 'Assigned', NOW)).toEqual({ kind: 'dueSoon', days: 1 });
  });

  it('says due today for any time later the same day', () => {
    expect(getSlaReminder('2026-10-31 23:59:00', 'Assigned', NOW)).toEqual({ kind: 'dueToday' });
  });

  it('flags a breached case with how many days late it is', () => {
    expect(getSlaReminder('2026-10-29', 'In Progress', NOW)).toEqual({ kind: 'overdue', days: 2 });
  });

  it('has no reminder beyond three days, without a due date, or once the case is finished', () => {
    expect(getSlaReminder('2026-11-04', 'In Progress', NOW)).toBeNull();
    expect(getSlaReminder(null, 'In Progress', NOW)).toBeNull();
    expect(getSlaReminder('not a date', 'In Progress', NOW)).toBeNull();
    expect(getSlaReminder('2026-10-30', 'Resolved', NOW)).toBeNull();
    expect(getSlaReminder('2026-11-01', 'closed', NOW)).toBeNull();
  });
});
