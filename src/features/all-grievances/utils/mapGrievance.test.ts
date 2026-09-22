import { describe, expect, it } from 'vitest';
import { mapGrievanceListItem, getInitials, normalizeTimelineEntry } from './mapGrievance';
import { bucketStatuses } from '../hooks/useGrievanceMetrics';
import type { GrievanceListItem, TimelineEntry, TimelineEventItem } from '../types';

const baseItem: GrievanceListItem = {
  name: 'GRV-0001',
  ticket_number: 'SOMA-JIG-INP-09905',
  status: 'Submitted',
  escalated: false,
  is_anonymous: false,
  submitter_name: 'Abebe Bekele',
  administrative_area: 'ET.OR.BSH',
  service_category: 'Inputs',
  grievance_type: 'Fertilizer non-delivery or shortage',
  description: 'Fertiliser allocation delivered 6 weeks late\nSecond paragraph of detail',
  assigned_dept: 'Agriculture',
  submitted_on: '2026-05-28 10:42:13.123456',
};

describe('mapGrievanceListItem', () => {
  it('flattens a list row into the shape the table renders', () => {
    const grievance = mapGrievanceListItem(baseItem);

    expect(grievance.id).toBe('GRV-0001');
    expect(grievance.ticketId).toBe('SOMA-JIG-INP-09905');
    expect(grievance.title).toBe('Fertiliser allocation delivered 6 weeks late');
    expect(grievance.location).toBe('Abebe Bekele - ET / OR / BSH');
    expect(grievance.category).toBe('Inputs');
    expect(grievance.department).toBe('Agriculture');
    expect(grievance.submittedAt).toMatch(/May 28, 2026/);
  });

  it('withholds submitter identity on anonymous grievances', () => {
    const grievance = mapGrievanceListItem({
      ...baseItem,
      is_anonymous: true,
      submitter_name: 'Abebe Bekele',
      contact_mobile: '+251900000000',
      contact_email: 'abebe@example.com',
    });

    expect(grievance.submitterName).toBe('Anonymous');
    expect(grievance.contactMobile).toBe('');
    expect(grievance.contactEmail).toBe('');
    expect(grievance.location).toBe('Anonymous - ET / OR / BSH');
  });

  it('tolerates missing optional fields', () => {
    const grievance = mapGrievanceListItem({
      name: 'GRV-0002',
      ticket_number: '',
      status: 'Resolved',
      escalated: true,
      is_anonymous: false,
    });

    expect(grievance.ticketId).toBe('GRV-0002');
    expect(grievance.title).toBe('Untitled grievance');
    expect(grievance.location).toBe('');
    expect(grievance.submittedAt).toBe('');
    expect(grievance.escalated).toBe(true);
  });

  it('prefers ticket_number_display when provided by the backend', () => {
    const grievance = mapGrievanceListItem({
      ...baseItem,
      ticket_number_display: 'ET14IN000012026',
    });

    expect(grievance.ticketId).toBe('ET14IN000012026');
    expect(grievance.ticketNumberDisplay).toBe('ET14IN000012026');
    expect(grievance.id).toBe('GRV-0001');
  });
});

describe('getInitials', () => {
  it('extracts initials for various name patterns', () => {
    expect(getInitials('Abebe Bekele')).toBe('AB');
    expect(getInitials('Tigist Alemu')).toBe('TA');
    expect(getInitials('Admin')).toBe('AD');
    expect(getInitials('Yonas Mekonnen Kebede')).toBe('YK');
    expect(getInitials('')).toBe('??');
    expect(getInitials(null)).toBe('??');
  });
});

describe('normalizeTimelineEntry', () => {
  it('normalizes backend TimelineEntry correctly', () => {
    const entry: TimelineEntry = {
      name: 'GR-TIME-00001',
      entry_type: 'note',
      is_internal: true,
      body: 'Investigating warehouse logs.',
      author_user: 'officer@example.com',
      author_name: 'Tigist Alemu',
      author_type: 'officer',
      created_on: '2026-04-12T10:15:00Z',
    };

    const normalized = normalizeTimelineEntry(entry);
    expect(normalized.id).toBe('GR-TIME-00001');
    expect(normalized.typeLabel).toBe('Internal Note');
    expect(normalized.isInternal).toBe(true);
    expect(normalized.authorName).toBe('Tigist Alemu');
    expect(normalized.authorType).toBe('officer');
    expect(normalized.initials).toBe('TA');
    expect(normalized.body).toBe('Investigating warehouse logs.');
  });

  it('normalizes OpenAPI TimelineEventItem correctly', () => {
    const event: TimelineEventItem = {
      event_type: 'Status Change',
      from_status: 'Assigned',
      to_status: 'In Progress',
      actor: 'Tigist Alemu',
      actor_role: 'Grievance Officer',
      message: 'Status updated to In Progress',
      creation: '2026-04-28T19:40:00Z',
    };

    const normalized = normalizeTimelineEntry(event);
    expect(normalized.typeLabel).toBe('Status Change');
    expect(normalized.authorName).toBe('Tigist Alemu');
    expect(normalized.fromStatus).toBe('Assigned');
    expect(normalized.toStatus).toBe('In Progress');
  });
});

describe('bucketStatuses', () => {
  it('maps backend lifecycle statuses onto the metric cards', () => {
    const buckets = bucketStatuses([
      'Submitted',
      'Under Investigation',
      'More Info Needed',
      'Resolved',
      'Closed',
      'Rejected',
    ]);

    expect(buckets.pending).toEqual(['Submitted']);
    expect(buckets.inProgress).toEqual(['Under Investigation']);
    expect(buckets.underReview).toEqual(['More Info Needed']);
    expect(buckets.resolved).toEqual(['Resolved', 'Closed']);
    expect(buckets.rejected).toEqual(['Rejected']);
  });

  it('drops statuses it cannot classify rather than guessing', () => {
    const buckets = bucketStatuses(['Archived']);

    expect(Object.values(buckets).every((bucket) => bucket.length === 0)).toBe(true);
  });
});
