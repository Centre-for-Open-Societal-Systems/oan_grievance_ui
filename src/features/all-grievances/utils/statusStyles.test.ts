import { describe, expect, it } from 'vitest';
import { statusBadgeClass } from './statusStyles';

describe('statusBadgeClass', () => {
  it('matches however the backend spells a status', () => {
    expect(statusBadgeClass('In Progress')).toBe(statusBadgeClass('in_progress'));
    expect(statusBadgeClass('RESOLVED')).toContain('emerald');
  });

  it('gives both names of the more-info status the same colour', () => {
    expect(statusBadgeClass('More Info Needed')).toBe(statusBadgeClass('Require More Info'));
    expect(statusBadgeClass('Require More Info')).toContain('orange');
  });

  it('falls back to neutral for a status it does not know', () => {
    expect(statusBadgeClass('Awaiting Vendor')).toBe('bg-gray-100 text-gray-700');
    expect(statusBadgeClass(undefined)).toBe('bg-gray-100 text-gray-700');
  });
});
