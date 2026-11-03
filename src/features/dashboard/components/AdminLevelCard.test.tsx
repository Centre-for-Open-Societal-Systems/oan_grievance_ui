/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/en.json';
import amMessages from '../../../../messages/am.json';
import { AdminLevelCard } from './AdminLevelCard';
import type { UseAdminLevelsResult } from '../hooks/useAdminLevels';
import type { AdminLevelStatistics } from '../types';

const STATISTICS: AdminLevelStatistics = {
  federal: { name: 'Ethiopia', value: 10 },
  regions: [
    { code: 'ET04', name: 'Oromia', value: 6, regionCode: 'ET04' },
    { code: 'ET03', name: 'Amhara', value: 3, regionCode: 'ET03' },
  ],
  woredas: [
    { code: 'W1', name: 'Bishoftu', value: 4, regionCode: 'ET04' },
    { code: 'W2', name: 'Bahir Dar', value: 2, regionCode: 'ET03' },
  ],
};

function renderCard(
  levels: Partial<UseAdminLevelsResult> & Pick<UseAdminLevelsResult, 'status'>,
  selectedRegion: string | null = null,
  onSelectRegion = vi.fn(),
  locale = 'en',
  catalog: typeof messages = messages
) {
  render(
    <NextIntlClientProvider locale={locale} messages={catalog}>
      <AdminLevelCard
        levels={{ retry: vi.fn(), ...levels } as UseAdminLevelsResult}
        selectedRegion={selectedRegion}
        onSelectRegion={onSelectRegion}
      />
    </NextIntlClientProvider>
  );
  return onSelectRegion;
}

const ready = (statistics: AdminLevelStatistics) => ({ status: 'ready' as const, statistics, isRefreshing: false });

describe('AdminLevelCard', () => {
  it('shows the federal total, the regions and the top woredas across them', () => {
    renderCard(ready(STATISTICS));

    expect(screen.getByRole('heading', { name: 'Grievances by Administrative Level' })).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Oromia/ })).toBeTruthy();
    expect(screen.getByText('Top woredas')).toBeTruthy();
    expect(screen.getByText('Bishoftu')).toBeTruthy();
    expect(screen.getByText('Bahir Dar')).toBeTruthy();
  });

  it('caps each list and counts the rest', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      code: `W${i}`,
      name: `Woreda ${i}`,
      value: 10 - i,
      regionCode: 'ET04',
    }));
    renderCard(ready({ federal: null, regions: [], woredas: many }));

    expect(screen.getByText('Woreda 7')).toBeTruthy();
    expect(screen.queryByText('Woreda 8')).toBeNull();
    expect(screen.getByText('+2 more')).toBeTruthy();
  });

  it('selects a region on click and clears it on a second click', () => {
    const onSelect = renderCard(ready(STATISTICS));
    fireEvent.click(screen.getByRole('button', { name: /Oromia/ }));
    expect(onSelect).toHaveBeenCalledWith('ET04');

    const onClear = renderCard(ready(STATISTICS), 'ET04');
    fireEvent.click(screen.getAllByRole('button', { name: /Oromia/ })[1]!);
    expect(onClear).toHaveBeenCalledWith(null);
  });

  it("lists only the selected region's woredas and says the dashboard is narrowed", () => {
    renderCard(ready(STATISTICS), 'ET04');

    expect(screen.getByText('Woredas in Oromia')).toBeTruthy();
    expect(screen.getByText('Bishoftu')).toBeTruthy();
    expect(screen.queryByText('Bahir Dar')).toBeNull();
    expect(screen.getByText('Showing the dashboard for Oromia.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show all regions' })).toBeTruthy();
  });

  it('lists every woreda when the caller can read no region (a woreda officer)', () => {
    renderCard(ready({ federal: null, regions: [], woredas: STATISTICS.woredas }));

    expect(screen.getByText('Bishoftu')).toBeTruthy();
    expect(screen.getByText('Bahir Dar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Oromia/ })).toBeNull();
  });

  it('says there is nothing to count, not zero, when no level is readable', () => {
    renderCard(ready({ federal: null, regions: [], woredas: [] }));

    expect(screen.getByText('No grievances to count for your area yet.')).toBeTruthy();
  });

  it('offers a retry when the chart failed, and says so plainly when it is forbidden', () => {
    const retry = vi.fn();
    renderCard({ status: 'error', forbidden: false, retry });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });

  it('says the caller has no access without a retry when forbidden', () => {
    renderCard({ status: 'error', forbidden: true });

    expect(screen.getByRole('alert').textContent).toContain('do not have access');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows a loading note while the chart loads', () => {
    renderCard({ status: 'loading' });

    expect(screen.getByRole('status').textContent).toContain('Loading counts');
  });

  it('reads its text from the active locale', () => {
    renderCard(ready(STATISTICS), null, vi.fn(), 'am', amMessages as typeof messages);

    expect(screen.getByRole('heading', { name: amMessages.dashboard.overview.levels.title })).toBeTruthy();
  });

  it("keeps a picked region clearable when it is no longer in the list", () => {
    const onSelect = renderCard(ready(STATISTICS), "ET99");

    expect(screen.getAllByText(/ET99/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Bishoftu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show all regions" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
