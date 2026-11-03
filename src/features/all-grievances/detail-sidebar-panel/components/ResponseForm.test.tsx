// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import { ResponseForm } from './ResponseForm';

vi.mock('../../api/grievanceApi', () => ({
  fetchResponseTemplates: vi.fn().mockResolvedValue({ items: [] }),
}));

const ACTIONS = [
  {
    action: 'Submit Response',
    label: 'Submit Response',
    requires_reason: true,
  },
  { action: 'Reject', label: 'Reject', requires_reason: true },
];

function renderForm(
  onExecuteAction = vi.fn().mockResolvedValue({}),
  acceptsFiles?: boolean
) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResponseForm
        ticketNumber="3001002A0"
        canManageCase
        actions={ACTIONS}
        isLoadingActions={false}
        onExecuteAction={onExecuteAction}
        acceptsFiles={acceptsFiles}
      />
    </NextIntlClientProvider>
  );
  return { onExecuteAction };
}

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText(/specific action taken/), { target: { value: 'Checked records.' } });
  fireEvent.change(screen.getByPlaceholderText(/Summarize the outcome/), { target: { value: 'Duplicate of 3001001A0.' } });
  clickSubmit();
}

/** "Submit Response" is both an action option and the form's button; the button comes last. */
function clickSubmit() {
  fireEvent.click(screen.getAllByRole('button', { name: /^Submit Response$/ }).at(-1)!);
}

describe('ResponseForm', () => {
  afterEach(cleanup);

  it('sends an action without response types', () => {
    const { onExecuteAction } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Select Action/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fillAndSubmit();

    expect(onExecuteAction).toHaveBeenCalledWith(
      {
        action: 'Reject',
        template: null,
        reason: 'Action taken:\nChecked records.\n\nResolution summary:\nDuplicate of 3001001A0.',
        internal_notes: null,
      },
      []
    );
  });

  it('sends another action', () => {
    const { onExecuteAction } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Select Action/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit Response' })[0]!);
    fillAndSubmit();

    expect(onExecuteAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Submit Response' }),
      []
    );
  });

  it('uploads supporting documents along with sending the response', async () => {
    const onExecuteAction = vi.fn().mockResolvedValue({});
    renderForm(onExecuteAction, true);
    const file = new File(['x'], 'site_visit.jpg', { type: 'image/jpeg' });

    fireEvent.click(screen.getByRole('button', { name: /Select Action/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Supporting Documents'), { target: { files: [file] } });
    fillAndSubmit();

    await waitFor(() => expect(onExecuteAction).toHaveBeenCalled());
    expect(onExecuteAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Reject' }),
      [file]
    );
  });

  it('displays error when executing response action fails', async () => {
    const onExecuteAction = vi.fn().mockRejectedValue(new Error('Action failed'));
    renderForm(onExecuteAction, true);

    fireEvent.click(screen.getByRole('button', { name: /Select Action/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Supporting Documents'), {
      target: { files: [new File(['x'], 'memo.pdf', { type: 'application/pdf' })] },
    });
    fillAndSubmit();

    expect(await screen.findByText('Action failed')).toBeInTheDocument();
  });

  it('renders a terminal notice instead of the form when isTerminal is true', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResponseForm
          ticketNumber="3001002A0"
          canManageCase
          actions={ACTIONS}
          isLoadingActions={false}
          isTerminal={true}
          caseStatus="Closed"
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Case Closed')).toBeInTheDocument();
    expect(screen.getByText(/This grievance is closed\. No further responses can be submitted\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Select Action/i })).not.toBeInTheDocument();
  });
});
