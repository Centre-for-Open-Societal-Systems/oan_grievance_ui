// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function renderForm() {
  const onExecuteAction = vi.fn().mockResolvedValue({});
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResponseForm
        ticketNumber="3001002A0"
        canManageCase
        actions={ACTIONS}
        isLoadingActions={false}
        onExecuteAction={onExecuteAction}
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

    fireEvent.click(screen.getByRole('button', { name: /Select Response Type/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fillAndSubmit();

    expect(onExecuteAction).toHaveBeenCalledWith({
      action: 'Reject',
      template: null,
      reason: 'Action taken:\nChecked records.\n\nResolution summary:\nDuplicate of 3001001A0.',
      internal_notes: null,
    });
  });

  it('sends another action', () => {
    const { onExecuteAction } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Select Response Type/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit Response' })[0]!);
    fillAndSubmit();

    expect(onExecuteAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Submit Response' })
    );
  });
});
