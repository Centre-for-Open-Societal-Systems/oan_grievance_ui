/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import { KpiCards } from './KpiCards';
import { mapDashboardCharts } from '../utils/mapDashboardCharts';
import type { DashboardCharts, KpiRow } from '../types';

function renderCards(rows: KpiRow[]) {
  const charts: DashboardCharts = {
    grvKpis: rows,
    grvStatusDistribution: null,
    grvByCategory: null,
    grvMonthlyTrend: null,
  };
  const kpis = mapDashboardCharts(charts).kpis ?? [];
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KpiCards data={kpis} />
    </NextIntlClientProvider>
  );
}

describe('KpiCards', () => {
  it('shows an increase with an arrow, the metric\'s own caption and its own colour', () => {
    renderCards([
      { metric: 'total', value: 113, delta_pct: 12.5 },
      { metric: 'awaiting_action', value: 40, delta: 18 },
      { metric: 'resolved', value: 48, delta: 8 },
      { metric: 'escalated', value: 1 },
    ]);

    expect(screen.getByText('+12.5%').className).toContain('text-slate-600');
    expect(screen.getByText('from last month')).toBeTruthy();
    expect(screen.getByText('+18').className).toContain('text-amber-600');
    expect(screen.getByText('new this week')).toBeTruthy();
    expect(screen.getByText('+8').className).toContain('text-emerald-600');
    expect(screen.getByText('resolved this week')).toBeTruthy();
  });

  it('shows a month-over-month decrease as a decrease, never in the good-news colour', () => {
    const { container } = renderCards([{ metric: 'total', value: 9, delta_pct: -4.5 }]);

    const delta = screen.getByText('-4.5%');
    expect(delta.className).toContain('text-slate-600');
    expect(delta.querySelector('[aria-hidden="true"]')?.textContent).toContain('↘');
    expect(container.textContent).not.toContain('+-');
  });

  it('shows no arrow and a neutral colour for zero, so "+0 resolved" is not good news', () => {
    renderCards([
      { metric: 'total', value: 9, delta_pct: 0 },
      { metric: 'resolved', value: 0, delta: 0 },
    ]);

    const zeroPercent = screen.getByText('0%');
    expect(zeroPercent.className).toContain('text-slate-500');
    expect(zeroPercent.querySelector('[aria-hidden="true"]')).toBeNull();
    const zeroResolved = screen.getByText('0', { selector: 'span.font-bold' });
    expect(zeroResolved.className).toContain('text-slate-500');
  });

  it('explains the escalated card in one neutral line, without an arrow or the good-news colour', () => {
    renderCards([{ metric: 'escalated', value: 11 }]);

    const caption = screen.getByText('Triggered by SLA breach');
    expect(caption.className).not.toContain('emerald');
    expect(caption.textContent).not.toMatch(/[↗↘]/);
  });

  it('hides the arrow glyphs from screen readers', () => {
    const { container } = renderCards([{ metric: 'awaiting_action', value: 4, delta: 2 }]);

    const arrows = [...container.querySelectorAll('span')].filter((el) => /^[↗↘]/.test(el.textContent ?? ''));
    expect(arrows.length).toBeGreaterThan(0);
    for (const arrow of arrows) {
      if (arrow.textContent?.trim().length === 1) expect(arrow.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('rounds a long percentage and groups thousands', () => {
    renderCards([{ metric: 'total', value: 12345, delta_pct: 12.3456 }]);

    expect(screen.getByText('12,345')).toBeTruthy();
    expect(screen.getByText('+12.3%')).toBeTruthy();
  });

  it('shows a metric the service did not report as unavailable, not as zero', () => {
    renderCards([{ metric: 'total', value: 9 }]);

    expect(screen.getAllByText('Not available')).toHaveLength(3);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('drops a negative weekly count instead of captioning it "-3 new this week"', () => {
    const { container } = renderCards([{ metric: 'awaiting_action', value: 4, delta: -3 }]);

    expect(container.textContent).not.toContain('new this week');
  });
});
