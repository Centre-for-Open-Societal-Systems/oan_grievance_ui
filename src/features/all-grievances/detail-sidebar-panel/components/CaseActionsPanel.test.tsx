// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import { CaseActionsPanel, type CaseActionsPanelProps } from './CaseActionsPanel';

const RESOLVED_ACTIONS = [
  { action: 'Reopen', label: 'Reopen', requires_reason: true },
  { action: 'Close Case', label: 'Close Case', requires_reason: true },
];

function renderPanel(props: Partial<CaseActionsPanelProps> = {}) {
  const onExecute = props.onExecute ?? vi.fn().mockResolvedValue({});
  const { container } = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CaseActionsPanel
        actions={RESOLVED_ACTIONS}
        isSubmitting={false}
        {...props}
        onExecute={onExecute}
      />
    </NextIntlClientProvider>
  );
  return { onExecute, container };
}

/** The action buttons and the form's submit button share the action's label; this is the submit one. */
function submitButton(label: string) {
  return screen.getAllByRole('button', { name: label }).find((b) => b.getAttribute('type') === 'submit')!;
}

describe('CaseActionsPanel', () => {
  afterEach(cleanup);

  it('requires a star rating and a reason to close a resolved case, and sends both', async () => {
    const { onExecute } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Close Case' }));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Fertilizer arrived, thank you.' } });
    expect(submitButton('Close Case')).toBeDisabled();

    fireEvent.click(screen.getByLabelText('4 of 5 stars'));
    expect(submitButton('Close Case')).toBeEnabled();
    fireEvent.click(submitButton('Close Case'));

    expect(onExecute).toHaveBeenCalledWith({
      action: 'Close Case',
      reason: 'Fertilizer arrived, thank you.',
      rating: 4,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('"Close Case" done.');
  });

  it('does not ask for a rating on other actions', () => {
    const { onExecute } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(screen.queryByRole('group', { name: /How well/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Still no delivery.' } });
    fireEvent.click(submitButton('Reopen'));

    expect(onExecute).toHaveBeenCalledWith({ action: 'Reopen', reason: 'Still no delivery.', rating: null });
  });

  it('tells a submitter when nothing is waiting on them', () => {
    renderPanel({ actions: [] });
    expect(screen.getByText(/No action is needed from you/)).toBeInTheDocument();
  });

  it('shows the backend error when the action fails', async () => {
    renderPanel({ onExecute: vi.fn().mockRejectedValue(new Error('Action not allowed from this state')) });

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Still no delivery.' } });
    fireEvent.click(submitButton('Reopen'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Action not allowed from this state');
  });
});
