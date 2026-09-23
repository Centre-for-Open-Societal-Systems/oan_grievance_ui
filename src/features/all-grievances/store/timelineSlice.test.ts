import { describe, expect, it } from 'vitest';
import {
  clearTimeline,
  setSelectedTicketNumber,
  timelineReducer,
  type TimelineState,
  selectTimelineEntries,
  selectTimelineSummary,
  selectTimelineSubmitter,
  selectTimelineSLA,
  selectTimelineAssignment,
} from './timelineSlice';
import type { RootState } from '@/store';
import type { GrievanceTimelineData } from '../types';

describe('timelineSlice', () => {
  const initialTimelineState: TimelineState = {
    selectedTicketNumber: null,
    timelineData: null,
    status: 'idle',
    error: null,
    isSubmitting: false,
    submitError: null,
  };

  const sampleTimelineData: GrievanceTimelineData = {
    ticket_number: 'ET14IN000012026',
    ticket_number_display: 'ET14IN000012026',
    status: 'In Progress',
    escalated: false,
    summary: {
      description: '50kg certified maize seeds failed germination.',
      service_category: 'Inputs',
      grievance_type: 'Seed Quality',
    },
    submitter: {
      name: 'Abebe Bekele',
      mobile: '+251911223344',
      submitter_type: 'Individual Farmer',
      is_anonymous: false,
    },
    sla: {
      sla_days: 14,
      sla_consumed_percent: 65,
      sla_due_date: '2026-05-10T17:00:00Z',
    },
    assignment: {
      department: 'Inputs Supply & Distribution Agency',
      assigned_to: 'Tigist Alemu',
      routed_automatically: true,
    },
    timeline: [
      {
        name: 'GR-TIME-000001',
        entry_type: 'note',
        is_internal: true,
        body: 'Sample lab sent.',
        created_on: '2026-04-10T14:53:00Z',
      },
    ],
  };

  it('sets the selected ticket number and resets data if set to null', () => {
    let state = timelineReducer(initialTimelineState, setSelectedTicketNumber('ET14IN000012026'));
    expect(state.selectedTicketNumber).toBe('ET14IN000012026');

    state = {
      ...state,
      timelineData: sampleTimelineData,
      status: 'succeeded',
    };

    state = timelineReducer(state, setSelectedTicketNumber(null));
    expect(state.selectedTicketNumber).toBe(null);
    expect(state.timelineData).toBe(null);
    expect(state.status).toBe('idle');
  });

  it('clears all timeline state on clearTimeline', () => {
    const dirtyState: TimelineState = {
      selectedTicketNumber: 'ET14IN000012026',
      timelineData: sampleTimelineData,
      status: 'succeeded',
      error: 'Some error',
      isSubmitting: true,
      submitError: 'Submit failed',
    };

    const cleared = timelineReducer(dirtyState, clearTimeline());
    expect(cleared.selectedTicketNumber).toBe(null);
    expect(cleared.timelineData).toBe(null);
    expect(cleared.status).toBe('idle');
    expect(cleared.error).toBe(null);
    expect(cleared.isSubmitting).toBe(false);
    expect(cleared.submitError).toBe(null);
  });

  it('selects timeline sub-objects cleanly with memoized selectors', () => {
    const mockRootState = {
      timeline: {
        selectedTicketNumber: 'ET14IN000012026',
        timelineData: sampleTimelineData,
        status: 'succeeded' as const,
        error: null,
        isSubmitting: false,
        submitError: null,
      },
    } as RootState;

    expect(selectTimelineEntries(mockRootState)).toEqual(sampleTimelineData.timeline);
    expect(selectTimelineSummary(mockRootState)).toEqual(sampleTimelineData.summary);
    expect(selectTimelineSubmitter(mockRootState)).toEqual(sampleTimelineData.submitter);
    expect(selectTimelineSLA(mockRootState)).toEqual(sampleTimelineData.sla);
    expect(selectTimelineAssignment(mockRootState)).toEqual(sampleTimelineData.assignment);
  });
});
