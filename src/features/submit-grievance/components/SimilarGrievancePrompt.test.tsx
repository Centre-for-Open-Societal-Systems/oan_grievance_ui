// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { SimilarGrievancePrompt } from './SimilarGrievancePrompt';

afterEach(cleanup);

const CANDIDATES = [{ ticket_number: 'B00100050', status: 'Assigned', match_level: 'High' }];

function renderPrompt(isSubmitting: boolean) {
  const onClose = vi.fn();
  const onFileAnyway = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SimilarGrievancePrompt
        candidates={CANDIDATES}
        onClose={onClose}
        onFileAnyway={onFileAnyway}
        isSubmitting={isSubmitting}
      />
    </NextIntlClientProvider>
  );
  return { onClose, onFileAnyway };
}

describe('SimilarGrievancePrompt', () => {
  it('lists the similar ticket and lets the submitter go back with Escape', () => {
    const { onClose } = renderPrompt(false);

    expect(screen.getByText('B00100050')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cannot be closed by Escape or the backdrop while the grievance is being filed', () => {
    const { onClose } = renderPrompt(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });
});
