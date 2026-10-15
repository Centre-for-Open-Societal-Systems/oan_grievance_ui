/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../../messages/en.json';
import { DashboardOverview } from './DashboardOverview';
import type { UseDashboardStatisticsResult } from '@/features/dashboard/hooks/useDashboardStatistics';
import { mapDashboardCharts } from '@/features/dashboard/utils/mapDashboardCharts';

vi.mock('@/features/dashboard/hooks/useDashboardStatistics', () => ({
  useDashboardStatistics: vi.fn(),
}));
vi.mock('./RecentGrievances', () => ({ RecentGrievances: () => <div>recent grievances</div> }));
vi.mock('./MonthlyTrendChart', () => ({ MonthlyTrendChart: () => <div>monthly chart</div> }));
vi.mock('./StatusDistributionChart', () => ({ StatusDistributionChart: () => <div>status chart</div> }));

import { useDashboardStatistics } from '@/features/dashboard/hooks/useDashboardStatistics';

const mockHook = vi.mocked(useDashboardStatistics);

function renderOverview(result: Partial<UseDashboardStatisticsResult>) {
  mockHook.mockReturnValue({
    statistics: null,
    isLoading: false,
    error: null,
    retry: vi.fn(),
    ...result,
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DashboardOverview />
    </NextIntlClientProvider>
  );
}

const statistics = mapDashboardCharts({
  grvKpis: [
    { metric: 'total', value: 128, delta_pct: 12 },
    { metric: 'awaiting_action', value: 40, delta: 5 },
    { metric: 'resolved', value: 48, delta: 8 },
    { metric: 'escalated', value: 1 },
  ],
  grvByCategory: [{ category: 'Inputs', count: 34 }],
});

describe('DashboardOverview', () => {
  it('shows the KPI values and the escalated banner from the statistics', () => {
    renderOverview({ statistics });

    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('48')).toBeTruthy();
    expect(screen.getByText('Inputs')).toBeTruthy();
    expect(screen.getByText('1 escalated grievance')).toBeTruthy();
  });

  it('shows a negative month-over-month change as a decrease', () => {
    renderOverview({
      statistics: mapDashboardCharts({ grvKpis: [{ metric: 'total', value: 9, delta_pct: -4.5 }] }),
    });

    expect(screen.getByText(/↘ -4\.5%/)).toBeTruthy();
  });

  it('hides the banner when nothing is escalated', () => {
    renderOverview({ statistics: mapDashboardCharts({ grvKpis: [{ metric: 'escalated', value: 0 }] }) });

    expect(screen.queryByText(/escalated grievance/)).toBeNull();
  });

  it('shows a loading state, keeping recent grievances', () => {
    renderOverview({ isLoading: true });

    expect(screen.getByRole('status').textContent).toContain('Loading dashboard statistics');
    expect(screen.getByText('recent grievances')).toBeTruthy();
  });

  it('offers a retry when the statistics fail to load', () => {
    const retry = vi.fn();
    renderOverview({ error: 'failed', retry });

    expect(screen.getByRole('alert').textContent).toContain('Could not load the dashboard statistics');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('says so, with no retry, when the caller may not see the statistics', () => {
    renderOverview({ error: 'forbidden' });

    expect(screen.getByRole('alert').textContent).toContain('do not have access');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
