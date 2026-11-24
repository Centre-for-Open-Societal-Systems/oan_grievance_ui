import { describe, expect, it } from 'vitest';
import { isMoreInfoStatus, statusBadgeClass } from './statusStyles';

describe('statusBadgeClass', () => {
  it('matches however the backend spells a status', () => {
    expect(statusBadgeClass('In Progress')).toBe(statusBadgeClass('in_progress'));
    expect(statusBadgeClass('RESOLVED')).toContain('teal');
  });

  it('gives both names of the more-info status the same colour', () => {
    expect(statusBadgeClass('More Info Needed')).toBe(statusBadgeClass('Require More Info'));
    expect(statusBadgeClass('Require More Info')).toContain('pink');
  });

  it('falls back to neutral for a status it does not know', () => {
    expect(statusBadgeClass('Awaiting Vendor')).toBe('bg-gray-100 text-gray-700');
    expect(statusBadgeClass(undefined)).toBe('bg-gray-100 text-gray-700');
  });

  it("recognises the more-info status however it is spelled", () => {
    expect(isMoreInfoStatus("Require More Info")).toBe(true);
    expect(isMoreInfoStatus("more_info_needed")).toBe(true);
    expect(isMoreInfoStatus("In Progress")).toBe(false);
    expect(isMoreInfoStatus(null)).toBe(false);
  });
});
