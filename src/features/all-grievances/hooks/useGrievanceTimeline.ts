"use client";

import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchTimelineThunk,
  postTimelineMessageThunk,
  addTimelineNoteThunk,
  executeTimelineActionThunk,
  setSelectedTicketNumber,
  selectTimelineData,
  selectTimelineLoading,
  selectTimelineIsSubmitting,
  selectTimelineError,
} from '../store/timelineSlice';
import type { GrievanceActionPayload } from '../types';

interface UseGrievanceTimelineOptions {
  ticketNumber: string | null | undefined;
}

export function useGrievanceTimeline({ ticketNumber }: UseGrievanceTimelineOptions) {
  const dispatch = useAppDispatch();
  const timelineData = useAppSelector(selectTimelineData);
  const isLoading = useAppSelector(selectTimelineLoading);
  const isSubmitting = useAppSelector(selectTimelineIsSubmitting);
  const error = useAppSelector(selectTimelineError);

  useEffect(() => {
    if (!ticketNumber) {
      dispatch(setSelectedTicketNumber(null));
      return;
    }

    dispatch(setSelectedTicketNumber(ticketNumber));
    void dispatch(fetchTimelineThunk({ ticketNumber }));
  }, [ticketNumber, dispatch]);

  const refetch = useCallback(() => {
    if (ticketNumber) {
      void dispatch(fetchTimelineThunk({ ticketNumber }));
    }
  }, [ticketNumber, dispatch]);

  const postMessage = useCallback(
    async (body: string) => {
      if (!ticketNumber) return;
      return dispatch(postTimelineMessageThunk({ ticketNumber, body })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  const addNote = useCallback(
    async (body: string, isInternal = true) => {
      if (!ticketNumber) return;
      return dispatch(addTimelineNoteThunk({ ticketNumber, body, isInternal })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  const executeAction = useCallback(
    async (payload: GrievanceActionPayload) => {
      if (!ticketNumber) return;
      return dispatch(executeTimelineActionThunk({ ticketNumber, payload })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  return {
    timelineData,
    isLoading,
    isSubmitting,
    error,
    refetch,
    postMessage,
    addNote,
    executeAction,
  };
}
