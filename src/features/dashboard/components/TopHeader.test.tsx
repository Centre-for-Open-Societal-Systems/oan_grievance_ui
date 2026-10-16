/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import amMessages from '../../../../messages/am.json';
import { TopHeader } from './TopHeader';

function renderHeader(locale: string, catalog: typeof messages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={catalog}>
      <TopHeader />
    </NextIntlClientProvider>
  );
}

describe('TopHeader', () => {
  it('names the dashboard as the page heading, with no hardcoded fiscal year', () => {
    renderHeader('en', messages);

    expect(screen.getByRole('heading', { level: 1, name: 'OAN Grievance Dashboard' })).toBeTruthy();
    expect(screen.queryByText(/Fiscal Year/)).toBeNull();
  });

  it('reads its text from the active locale', () => {
    renderHeader('am', amMessages as typeof messages);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(amMessages.dashboard.overview.title);
  });
});
