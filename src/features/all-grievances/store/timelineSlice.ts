import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  fetchGrievanceTimeline,
  postGrievanceMessage,
  addGrievanceNote,
  executeGrievanceAction,
  deferGrievanceSLA,
  reassignGrievance,
} from '../api/grievanceApi';
import type {
  DeferSLAPayload,
  GrievanceActionPayload,
  GrievanceActionResult,
  GrievanceChangeResponseData,
  GrievanceTimelineData,
  GrievanceTimelineQueryParams,
  ReassignGrievancePayload,
  TimelineEntry,
  TimelineEventItem,
} from '../types';


export interface TimelineState {
  selectedTicketNumber: string | null;
  timelineData: GrievanceTimelineData | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  isSubmitting: boolean;
  submitError: string | null;
}

const initialState: TimelineState = {
  selectedTicketNumber: null,
  timelineData: null,
  status: 'idle',
  error: null,
  isSubmitting: false,
  submitError: null,
};

export const fetchTimelineThunk = createAsyncThunk<
  GrievanceTimelineData,
  { ticketNumber: string; params?: GrievanceTimelineQueryParams },
  { rejectValue: string }
>('timeline/fetchTimeline', async ({ ticketNumber, params }, { rejectWithValue }) => {
  try {
    return await fetchGrievanceTimeline(ticketNumber, params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load timeline';
    return rejectWithValue(msg);
  }
});

export const postTimelineMessageThunk = createAsyncThunk<
  GrievanceActionResult,
  { ticketNumber: string; body: string },
  { rejectValue: string }
>('timeline/postMessage', async ({ ticketNumber, body }, { dispatch, rejectWithValue }) => {
  try {
    const result = await postGrievanceMessage(ticketNumber, body);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to post message';
    return rejectWithValue(msg);
  }
});

export const addTimelineNoteThunk = createAsyncThunk<
  GrievanceActionResult,
  { ticketNumber: string; body: string; isInternal?: boolean },
  { rejectValue: string }
>('timeline/addNote', async ({ ticketNumber, body, isInternal = true }, { dispatch, rejectWithValue }) => {
  try {
    const result = await addGrievanceNote(ticketNumber, body, isInternal);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to add note';
    return rejectWithValue(msg);
  }
});

export const executeTimelineActionThunk = createAsyncThunk<
  GrievanceActionResult,
  { ticketNumber: string; payload: GrievanceActionPayload },
  { rejectValue: string }
>('timeline/executeAction', async ({ ticketNumber, payload }, { dispatch, rejectWithValue }) => {
  try {
    const result = await executeGrievanceAction(ticketNumber, payload);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to execute action';
    return rejectWithValue(msg);
  }
});

export const deferSLAGrievanceThunk = createAsyncThunk<
  GrievanceChangeResponseData,
  { ticketNumber: string; payload: DeferSLAPayload },
  { rejectValue: string }
>('timeline/deferSLA', async ({ ticketNumber, payload }, { dispatch, rejectWithValue }) => {
  try {
    const result = await deferGrievanceSLA(ticketNumber, payload);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to request SLA deferral';
    return rejectWithValue(msg);
  }
});

export const reassignGrievanceThunk = createAsyncThunk<
  GrievanceChangeResponseData,
  { ticketNumber: string; payload: ReassignGrievancePayload },
  { rejectValue: string }
>('timeline/reassign', async ({ ticketNumber, payload }, { dispatch, rejectWithValue }) => {
  try {
    const result = await reassignGrievance(ticketNumber, payload);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reassign grievance';
    return rejectWithValue(msg);
  }
});


export const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setSelectedTicketNumber(state, action: PayloadAction<string | null>) {
      state.selectedTicketNumber = action.payload;
      if (!action.payload) {
        state.timelineData = null;
        state.status = 'idle';
        state.error = null;
      }
    },
    clearTimeline(state) {
      state.selectedTicketNumber = null;
      state.timelineData = null;
      state.status = 'idle';
      state.error = null;
      state.isSubmitting = false;
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTimelineThunk
    builder
      .addCase(fetchTimelineThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTimelineThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.timelineData = action.payload;
        state.error = null;
      })
      .addCase(fetchTimelineThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to fetch timeline';
      });

    // postTimelineMessageThunk
    builder
      .addCase(postTimelineMessageThunk.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(postTimelineMessageThunk.fulfilled, (state) => {
        state.isSubmitting = false;
        state.submitError = null;
      })
      .addCase(postTimelineMessageThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload ?? 'Failed to post message';
      });

    // addTimelineNoteThunk
    builder
      .addCase(addTimelineNoteThunk.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(addTimelineNoteThunk.fulfilled, (state) => {
        state.isSubmitting = false;
        state.submitError = null;
      })
      .addCase(addTimelineNoteThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload ?? 'Failed to add note';
      });

    // executeTimelineActionThunk
    builder
      .addCase(executeTimelineActionThunk.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(executeTimelineActionThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submitError = null;

        const result = action.payload;
        if (state.timelineData) {
          if (result.current_state) {
            state.timelineData.status = result.current_state.status;
            state.timelineData.current_status = result.current_state.status;
            state.timelineData.escalated = Boolean(result.current_state.escalated);
            if (result.current_state.available_actions) {
              state.timelineData.available_actions = result.current_state.available_actions;
            }
            if (state.timelineData.assignment) {
              if (result.current_state.assigned_to !== undefined) {
                state.timelineData.assignment.assigned_to = result.current_state.assigned_to;
              }
              if (result.current_state.department !== undefined) {
                state.timelineData.assignment.department = result.current_state.department;
              }
            }
          } else if (result.status) {
            state.timelineData.status = result.status;
            state.timelineData.current_status = result.status;
            if (result.available_actions) {
              state.timelineData.available_actions = result.available_actions;
            }
          }

          if (result.timeline_event) {
            const list = state.timelineData.timeline || [];
            const eventId = result.timeline_event.id || result.timeline_event.name;
            const exists = list.some((e) => (e.id && e.id === eventId) || (e.name && e.name === eventId));
            if (!exists) {
              state.timelineData.timeline = [...list, result.timeline_event];
            }
          }
        }
      })
      .addCase(executeTimelineActionThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload ?? 'Failed to execute action';
      });

    // deferSLAGrievanceThunk
    builder
      .addCase(deferSLAGrievanceThunk.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(deferSLAGrievanceThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submitError = null;

        const result = action.payload;
        if (state.timelineData) {
          if (result.sla_due_date && state.timelineData.sla) {
            state.timelineData.sla.sla_due_date = result.sla_due_date;
          }
          if (result.current_state) {
            state.timelineData.status = result.current_state.status;
            state.timelineData.current_status = result.current_state.status;
            state.timelineData.escalated = Boolean(result.current_state.escalated);
            if (result.current_state.available_actions) {
              state.timelineData.available_actions = result.current_state.available_actions;
            }
          }
          if (result.timeline_event) {
            const list = state.timelineData.timeline || [];
            const eventId = result.timeline_event.id || result.timeline_event.name;
            const exists = list.some((e) => (e.id && e.id === eventId) || (e.name && e.name === eventId));
            if (!exists) {
              state.timelineData.timeline = [...list, result.timeline_event];
            }
          }
        }
      })
      .addCase(deferSLAGrievanceThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload ?? 'Failed to request SLA deferral';
      });

    // reassignGrievanceThunk
    builder
      .addCase(reassignGrievanceThunk.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(reassignGrievanceThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submitError = null;

        const result = action.payload;
        if (state.timelineData) {
          if (state.timelineData.assignment) {
            if (result.assigned_dept) {
              state.timelineData.assignment.department = result.assigned_dept;
            }
            if (result.assigned_to !== undefined) {
              state.timelineData.assignment.assigned_to = result.assigned_to;
            }
          }
          if (result.current_state) {
            state.timelineData.status = result.current_state.status;
            state.timelineData.current_status = result.current_state.status;
            state.timelineData.escalated = Boolean(result.current_state.escalated);
            if (result.current_state.available_actions) {
              state.timelineData.available_actions = result.current_state.available_actions;
            }
            if (state.timelineData.assignment) {
              if (result.current_state.assigned_to !== undefined) {
                state.timelineData.assignment.assigned_to = result.current_state.assigned_to;
              }
              if (result.current_state.department !== undefined) {
                state.timelineData.assignment.department = result.current_state.department;
              }
            }
          }
          if (result.timeline_event) {
            const list = state.timelineData.timeline || [];
            const eventId = result.timeline_event.id || result.timeline_event.name;
            const exists = list.some((e) => (e.id && e.id === eventId) || (e.name && e.name === eventId));
            if (!exists) {
              state.timelineData.timeline = [...list, result.timeline_event];
            }
          }
        }
      })
      .addCase(reassignGrievanceThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload ?? 'Failed to reassign grievance';
      });
  },
});


export const { setSelectedTicketNumber, clearTimeline } = timelineSlice.actions;
export const timelineReducer = timelineSlice.reducer;

// Selectors
export const selectTimelineState = (state: RootState) => state.timeline;
export const selectSelectedTicketNumber = (state: RootState) => state.timeline.selectedTicketNumber;
export const selectTimelineData = (state: RootState) => state.timeline.timelineData;
export const selectTimelineStatus = (state: RootState) => state.timeline.status;
export const selectTimelineLoading = (state: RootState) => state.timeline.status === 'loading';
export const selectTimelineError = (state: RootState) => state.timeline.error;
export const selectTimelineIsSubmitting = (state: RootState) => state.timeline.isSubmitting;
export const selectTimelineSubmitError = (state: RootState) => state.timeline.submitError;

export const selectTimelineEntries = createSelector(
  [selectTimelineData],
  (data): Array<TimelineEntry | TimelineEventItem> => {
    return data?.timeline || data?.events || [];
  }
);

export const selectTimelineSummary = createSelector(
  [selectTimelineData],
  (data) => data?.summary ?? null
);

export const selectTimelineSubmitter = createSelector(
  [selectTimelineData],
  (data) => data?.submitter ?? null
);

export const selectTimelineSLA = createSelector(
  [selectTimelineData],
  (data) => data?.sla ?? null
);

export const selectTimelineAssignment = createSelector(
  [selectTimelineData],
  (data) => data?.assignment ?? null
);
