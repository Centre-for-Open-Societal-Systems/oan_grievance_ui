/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import { EscalationBanner, type EscalationBannerProps } from './EscalationBanner';

function renderBanner(props: EscalationBannerProps) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EscalationBanner {...props} />
    </NextIntlClientProvider>
  );
}

describe('EscalationBanner', () => {
  it('says how many cases are escalated and links to the full list', () => {
    renderBanner({ status: 'count', count: 3 });

    expect(screen.getByText('3 escalated grievances')).toBeTruthy();
    expect(screen.getByRole('link', { name: /view all/i }).getAttribute('href')).toBe('/all-grievances');
  });

  it('uses the singular for one case', () => {
    renderBanner({ status: 'count', count: 1 });

    expect(screen.getByText('1 escalated grievance')).toBeTruthy();
  });

  it('is absent when the count is known to be zero', () => {
    const { container } = renderBanner({ status: 'count', count: 0 });

    expect(container.innerHTML).toBe('');
  });

  it('says the count is unavailable rather than showing zero', () => {
    renderBanner({ status: 'unavailable' });

    expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
  });

  it('shows a placeholder, hidden from assistive tech, while loading', () => {
    const { container } = renderBanner({ status: 'loading' });

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
