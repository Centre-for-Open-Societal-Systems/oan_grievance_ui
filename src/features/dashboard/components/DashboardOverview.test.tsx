/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import { DashboardOverview } from './DashboardOverview';
import type { DashboardState, UseDashboardStatisticsResult } from '../hooks/useDashboardStatistics';
import { mapDashboardCharts } from '../utils/mapDashboardCharts';
import type { DashboardCharts } from '../types';

vi.mock('../hooks/useDashboardStatistics', () => ({
  useDashboardStatistics: vi.fn(),
}));
vi.mock('../hooks/useAdminLevels', () => ({
  useAdminLevels: () => ({ status: 'ready', isRefreshing: false, retry: () => {}, statistics: { federal: null, regions: [], woredas: [] } }),
}));
vi.mock('./MonthlyTrendChart', () => ({ MonthlyTrendChart: () => <div>monthly chart</div> }));
vi.mock('./StatusDistributionChart', () => ({ StatusDistributionChart: () => <div>status chart</div> }));

import { useDashboardStatistics } from '../hooks/useDashboardStatistics';

const mockHook = vi.mocked(useDashboardStatistics);

function renderOverview(state: DashboardState, retry = vi.fn()) {
  mockHook.mockReturnValue({ ...state, retry } as UseDashboardStatisticsResult);
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DashboardOverview recentGrievances={<div>recent grievances</div>} />
    </NextIntlClientProvider>
  );
  return retry;
}

const NO_CHARTS: DashboardCharts = {
  grvKpis: null,
  grvStatusDistribution: null,
  grvByCategory: null,
  grvMonthlyTrend: null,
};

function ready(charts: Partial<DashboardCharts>, isRefreshing = false): DashboardState {
  return { status: 'ready', statistics: mapDashboardCharts({ ...NO_CHARTS, ...charts }), isRefreshing };
}

const fullCharts: Partial<DashboardCharts> = {
  grvKpis: [
    { metric: 'total', value: 1128, delta_pct: 12 },
    { metric: 'awaiting_action', value: 40, delta: 5 },
    { metric: 'resolved', value: 48, delta: 8 },
    { metric: 'escalated', value: 1 },
  ],
  grvStatusDistribution: [{ status: 'Submitted', count: 4 }],
  grvByCategory: [{ category: 'Inputs', count: 34 }],
  grvMonthlyTrend: [{ month: '2026-04', submitted: 4, resolved: 1 }],
};

describe('DashboardOverview', () => {
  it('shows the KPI values, the sections and the escalated banner from the statistics', () => {
    renderOverview(ready(fullCharts));

    expect(screen.getByText('1,128')).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('48')).toBeTruthy();
    expect(screen.getByText('Inputs')).toBeTruthy();
    expect(screen.getByText('monthly chart')).toBeTruthy();
    expect(screen.getByText('status chart')).toBeTruthy();
    expect(screen.getByText('recent grievances')).toBeTruthy();
    expect(screen.getByText('1 escalated grievance')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('words the banner for several escalated cases', () => {
    renderOverview(ready({ grvKpis: [{ metric: 'escalated', value: 58 }] }));

    expect(screen.getByText('58 escalated grievances')).toBeTruthy();
  });

  it('hides the banner only when nothing is escalated', () => {
    renderOverview(ready({ ...fullCharts, grvKpis: [{ metric: 'escalated', value: 0 }] }));

    expect(screen.queryByText(/escalated grievance/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says the escalated count is unavailable, rather than hiding the banner, when the KPI chart failed', () => {
    renderOverview(ready({ ...fullCharts, grvKpis: null }));

    expect(screen.getByText('The number of escalated grievances could not be loaded.')).toBeTruthy();
    // The KPI row says so too, and shows no zeros in its place.
    expect(screen.getAllByRole('alert').some((el) => el.textContent?.includes('This section could not be loaded'))).toBe(true);
    expect(screen.queryByText('Awaiting Action')).toBeNull();
  });

  it('shows "unavailable" for a chart that failed in the place of the chart, and retries from it', () => {
    const retry = renderOverview(ready({ ...fullCharts, grvByCategory: null, grvMonthlyTrend: null }));

    expect(screen.queryByText('monthly chart')).toBeNull();
    expect(screen.queryByText('By Service Category')).toBeNull();
    expect(screen.getByText('status chart')).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Retry' });
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0] as HTMLElement);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps the retry button in place, inert, while a retry is in flight', () => {
    const retry = renderOverview(ready({ ...fullCharts, grvByCategory: null }, true));

    const button = screen.getByRole('button', { name: 'Retrying…' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });

  it('shows a loading skeleton and a placeholder for the banner, keeping recent grievances', () => {
    renderOverview({ status: 'loading' });

    expect(screen.getByRole('status').textContent).toContain('Loading dashboard statistics');
    expect(screen.getByText('recent grievances')).toBeTruthy();
    expect(screen.queryByText('Total Grievances')).toBeNull();
  });

  it('offers a retry when everything failed, and moves focus off the button that is about to unmount', () => {
    const retry = renderOverview({ status: 'error', error: 'failed' });

    expect(screen.getByRole('alert').textContent).toContain('Could not load the dashboard statistics');
    expect(screen.getByText('recent grievances')).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Retry' });
    button.focus();

    fireEvent.click(button);

    expect(retry).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(button);
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
  });

  it('says so, with no retry, when the caller may not see the statistics', () => {
    renderOverview({ status: 'error', error: 'forbidden' });

    expect(screen.getByRole('alert').textContent).toContain('do not have access');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
