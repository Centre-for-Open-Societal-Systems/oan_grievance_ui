/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import amMessages from '../../../../messages/am.json';
import { StatusDistributionChart } from './StatusDistributionChart';

const DATA = [
  { name: 'In Progress', value: 7, color: '#6366f1' },
  { name: 'Awaiting Review', value: 3, color: '#9ca3af' },
];

function renderChart(locale: string, catalog: typeof messages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={catalog}>
      <StatusDistributionChart data={DATA} />
    </NextIntlClientProvider>
  );
}

describe('StatusDistributionChart', () => {
  it('shows the title, the total of all slices and a legend entry per status', () => {
    renderChart('en', messages);

    expect(screen.getByRole('heading', { name: 'Status Distribution' })).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
  });

  it('says there is nothing to show instead of drawing an empty ring when every count is zero', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <StatusDistributionChart data={DATA.map((slice) => ({ ...slice, value: 0 }))} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('No grievances to show by status yet.')).toBeTruthy();
    expect(screen.queryByText('Total')).toBeNull();
  });

  it('translates a status it knows and keeps the label of one it does not', () => {
    renderChart('am', amMessages as typeof messages);

    expect(screen.getByText(amMessages.dashboard.overview.statuses.inProgress)).toBeTruthy();
    expect(screen.getByText('Awaiting Review')).toBeTruthy();
  });
});
