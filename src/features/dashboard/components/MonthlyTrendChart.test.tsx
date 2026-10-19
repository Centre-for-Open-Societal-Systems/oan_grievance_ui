/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import amMessages from '../../../../messages/am.json';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { ServiceCategoryChart } from './ServiceCategoryChart';

const TREND = [{ month: 'Apr 2026', submitted: 4, resolved: 1 }];

describe('MonthlyTrendChart', () => {
  it('titles the chart and labels both series in the legend', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <MonthlyTrendChart data={TREND} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Monthly Submission & Resolution Trend' })).toBeTruthy();
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.getByText('Resolved')).toBeTruthy();
  });

  it('reads the title and legend from the active locale', () => {
    render(
      <NextIntlClientProvider locale="am" messages={amMessages as typeof messages}>
        <MonthlyTrendChart data={TREND} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('heading').textContent).toBe(amMessages.dashboard.overview.monthlyTrend);
    expect(screen.queryByText('Submitted')).toBeNull();
  });
});

describe('ServiceCategoryChart', () => {
  const CATEGORIES = [
    { key: 'category:Inputs', kind: 'category' as const, name: 'Inputs', value: 34, max: 34, color: 'bg-[#2563eb]' },
    { key: 'uncategorised', kind: 'uncategorised' as const, name: '', value: 2, max: 34, color: 'bg-[#6366f1]' },
    { key: 'remainder', kind: 'remainder' as const, name: '', value: 5, max: 34, color: 'bg-gray-400', categories: 2 },
  ];

  it('words the uncategorised and remainder rows itself and counts each bar', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ServiceCategoryChart data={CATEGORIES} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'By Service Category' })).toBeTruthy();
    expect(screen.getByText('Inputs')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
    expect(screen.getByText('Uncategorised')).toBeTruthy();
    expect(screen.getByText('2 other categories')).toBeTruthy();
  });

  it('says there is nothing to group when the list is empty', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ServiceCategoryChart data={[]} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('No grievances to group by category yet.')).toBeTruthy();
  });
});
