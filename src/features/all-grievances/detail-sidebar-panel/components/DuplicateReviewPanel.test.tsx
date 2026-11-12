// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import type { PossibleDuplicate } from '../../types';
import { DuplicateReviewPanel } from './DuplicateReviewPanel';

afterEach(cleanup);

const FLAG: PossibleDuplicate = {
  ticket_number: 'B00100010',
  match_level: 'High',
  can_review: true,
  status: 'In Progress',
  service_category: 'Inputs',
  grievance_type: 'Fertilizer Shortage',
  description: 'Fertilizer has not reached the kebele store.',
  same_submitter: true,
  same_category: true,
  same_type: false,
};

function renderPanel(props: Partial<React.ComponentProps<typeof DuplicateReviewPanel>> = {}) {
  const handlers = {
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onDismiss: vi.fn().mockResolvedValue(undefined),
    onOpenTicket: vi.fn(),
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DuplicateReviewPanel ticketNumber="B00100020" possibleDuplicate={FLAG} {...handlers} {...props} />
    </NextIntlClientProvider>
  );
  return handlers;
}

describe('DuplicateReviewPanel: a flagged ticket', () => {
  it('shows what matched and the match level as a label', () => {
    renderPanel();

    expect(screen.getByText('Possible duplicate')).toBeInTheDocument();
    expect(screen.getByText('Match: High')).toBeInTheDocument();
    expect(screen.getByText('B00100010')).toBeInTheDocument();
    expect(screen.getByText('Inputs · Fertilizer Shortage')).toBeInTheDocument();
    expect(screen.getByText('Fertilizer has not reached the kebele store.')).toBeInTheDocument();
    expect(screen.getByText('Same farmer')).toBeInTheDocument();
    expect(screen.getByText('Same category')).toBeInTheDocument();
    expect(screen.queryByText('Same type')).not.toBeInTheDocument();
  });

  it('says so when the earlier ticket is one the officer cannot read', () => {
    renderPanel({ possibleDuplicate: { ticket_number: 'B00100010', match_level: 'Medium', can_review: true } });
    expect(screen.getByText(/not available to you/)).toBeInTheDocument();
  });

  it('confirms with the pre-filled main ticket and the note, stating the effects first', async () => {
    const { onConfirm } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm as duplicate' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('The status becomes Duplicate.');
    expect(dialog).toHaveTextContent('all further handling happens on the main ticket');
    expect(dialog).toHaveTextContent('This cannot be undone.');
    expect(screen.getByLabelText(/^Main ticket/)).toHaveValue('B00100010');

    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: '  Same complaint.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ main_ticket: 'B00100010', note: 'Same complaint.' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('will not confirm a ticket as a duplicate of itself, or with no main ticket', async () => {
    const { onConfirm } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm as duplicate' }));

    fireEvent.change(await screen.findByLabelText(/^Main ticket/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }));
    expect(await screen.findByText('Enter the main ticket.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Main ticket/), { target: { value: 'b00100020' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }));
    expect(await screen.findByText('The main ticket must be a different ticket.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the reason when the service refuses the ruling', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('The main ticket must be the same submitter.'));
    renderPanel({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm as duplicate' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }));

    expect(await screen.findByText('The main ticket must be the same submitter.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cannot be closed while the ruling is in flight, and still shows a failure afterwards', async () => {
    let refuse: (reason: Error) => void = () => undefined;
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          refuse = reject;
        })
    );
    renderPanel({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm as duplicate' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    refuse(new Error('The main ticket must be the same submitter.'));
    expect(await screen.findByText('The main ticket must be the same submitter.')).toBeInTheDocument();
  });

  it('shows the main ticket and what was sent when the service sends only category and type', () => {
    renderPanel({
      possibleDuplicate: {
        ticket_number: 'B00100010',
        match_level: 'Medium',
        can_review: true,
        service_category: 'Inputs',
        grievance_type: 'Fertilizer Shortage',
        description: null,
        status: null,
      },
    });
    expect(screen.getByText('Inputs · Fertilizer Shortage')).toBeInTheDocument();
    expect(screen.queryByText(/not available to you/)).not.toBeInTheDocument();
  });

  it('dismisses the flag so the case stays a normal one', async () => {
    const { onDismiss, onConfirm } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Not a duplicate' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getAllByRole('button', { name: 'Not a duplicate' }).at(-1)!);

    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith({}));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('offers no ruling to an officer who cannot make one', () => {
    renderPanel({ possibleDuplicate: { ...FLAG, can_review: false } });

    expect(screen.queryByRole('button', { name: 'Confirm as duplicate' })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot rule on it/)).toBeInTheDocument();
  });

  it('renders nothing when there is no flag and the ticket is not a duplicate', () => {
    renderPanel({ possibleDuplicate: null });
    expect(document.body).not.toHaveTextContent('Possible duplicate');
  });
});

describe('DuplicateReviewPanel: a confirmed duplicate', () => {
  it('points at the main ticket and opens it', () => {
    const { onOpenTicket } = renderPanel({ possibleDuplicate: null, duplicateOf: 'B00100010' });

    expect(screen.getByText('This ticket is a duplicate')).toBeInTheDocument();
    expect(screen.getByText(/main ticket B00100010/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open main ticket' }));
    expect(onOpenTicket).toHaveBeenCalledWith('B00100010');
    expect(screen.queryByRole('button', { name: 'Confirm as duplicate' })).not.toBeInTheDocument();
  });
});
