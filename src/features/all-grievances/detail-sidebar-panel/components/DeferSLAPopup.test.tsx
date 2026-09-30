// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeferSLAPopup } from './DeferSLAPopup';
import { timelineReducer } from '../../store/timelineSlice';
import * as grievanceApi from '../../api/grievanceApi';

afterEach(cleanup);

function renderWithStore(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      timeline: timelineReducer,
    },
  });

  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store,
  };
}

describe('DeferSLAPopup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with default values and validation', () => {
    const onClose = vi.fn();
    renderWithStore(<DeferSLAPopup ticketNumber="ET14IN000012026" onClose={onClose} />);

    expect(screen.getByText('Defer SLA')).toBeInTheDocument();
    expect(screen.getByText('Requires approval from a Senior Nodal Officer (L2)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe why the SLA requires extension/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit for Approval/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button only when reason meets 20 chars and days are valid', () => {
    const onClose = vi.fn();
    renderWithStore(<DeferSLAPopup ticketNumber="ET14IN000012026" onClose={onClose} />);

    const textarea = screen.getByPlaceholderText(/Describe why the SLA requires extension/i);
    const submitBtn = screen.getByRole('button', { name: /Submit for Approval/i });

    // Less than 20 chars
    fireEvent.change(textarea, { target: { value: 'Short reason' } });
    expect(screen.getByText('12 / 20 minimum characters')).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // 20+ chars
    fireEvent.change(textarea, { target: { value: 'Awaiting lab soil sample test results from regional research lab' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits deferral request via API and displays success message', async () => {
    const deferSpy = vi.spyOn(grievanceApi, 'deferGrievanceSLA').mockResolvedValue({
      ticket_number: 'ET14IN000012026',
      status: 'Under Investigation',
      change_request: {
        name: 'CR-0001',
        ticket_number: 'ET14IN000012026',
        subject: 'Defer SLA',
        status: 'Pending',
        requested_by: 'officer@example.com',
        changes: [{ fieldname: 'sla_due_date', new_value: '2026-05-17T17:00:00Z' }],
        trail: [],
      },
      current_state: {
        status: 'Under Investigation',
        escalated: false,
      },
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderWithStore(
      <DeferSLAPopup ticketNumber="ET14IN000012026" onClose={onClose} onSuccess={onSuccess} />
    );

    const textarea = screen.getByPlaceholderText(/Describe why the SLA requires extension/i);
    const daysInput = screen.getByDisplayValue('7');
    const submitBtn = screen.getByRole('button', { name: /Submit for Approval/i });

    fireEvent.change(textarea, {
      target: { value: 'Awaiting lab soil sample test results from regional research lab' },
    });
    fireEvent.change(daysInput, { target: { value: '14' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(deferSpy).toHaveBeenCalledWith('ET14IN000012026', {
        additional_days: 14,
        reason: 'Awaiting lab soil sample test results from regional research lab',
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(
        screen.getByText(/SLA deferral request for 14 days submitted \(pending L2 approval\)/i)
      ).toBeInTheDocument();
    });
  });

  it('displays error message when deferral API fails', async () => {
    vi.spyOn(grievanceApi, 'deferGrievanceSLA').mockRejectedValue(new Error('SLA deferral limit reached'));

    const onClose = vi.fn();

    renderWithStore(<DeferSLAPopup ticketNumber="ET14IN000012026" onClose={onClose} />);

    const textarea = screen.getByPlaceholderText(/Describe why the SLA requires extension/i);
    const submitBtn = screen.getByRole('button', { name: /Submit for Approval/i });

    fireEvent.change(textarea, {
      target: { value: 'Awaiting lab soil sample test results from regional research lab' },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('SLA deferral limit reached')).toBeInTheDocument();
    });
  });
});
