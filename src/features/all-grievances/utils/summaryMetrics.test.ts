import { describe, expect, it } from 'vitest';
import {
  needsMoreInfoCount,
  resolveSummaryTotalCount,
  sortSummaryCards,
  withInProgressBreakdown,
} from './summaryMetrics';
import type { GrievanceSummaryCard } from '../types';

const sampleCards: GrievanceSummaryCard[] = [
  { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
  { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
  { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  { status: 'Closed', label: 'Closed', order: 6, is_open: 0, is_terminal: 1, count: 7 },
  { status: 'Require More Info', label: 'Require More Info', order: 3, is_open: 1, is_terminal: 0, count: 4 },
  { status: 'Rejected', label: 'Rejected', order: 4, is_open: 0, is_terminal: 1, count: 3 },
];

describe('withInProgressBreakdown', () => {
  const card = (status: string, count: number, order = 1) => ({
    status,
    label: status,
    order,
    is_open: 1,
    is_terminal: 0,
    count,
  });

  it('adds the More Info count to In Progress and lists both parts under it', () => {
    const [all, inProgress] = withInProgressBreakdown([card('All', 40), card('In Progress', 20, 2)], 3);

    expect(all).toEqual(card('All', 40));
    expect(inProgress?.count).toBe(23);
    expect(inProgress?.breakdown).toEqual([
      { label: 'In Progress', count: 20 },
      { label: 'More Info Needed', count: 3 },
    ]);
  });

  it('takes the count from a More Info card of its own, and drops that card', () => {
    const result = withInProgressBreakdown([card('In Progress', 20, 2), card('Require More Info', 4, 3)], null);

    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(24);
    expect(result[0]?.breakdown?.[1]).toEqual({ label: 'Require More Info', count: 4 });
  });

  it('keeps the In Progress count and a null part when More Info is unknown', () => {
    const [inProgress] = withInProgressBreakdown([card('In Progress', 20)], null);

    expect(inProgress?.count).toBe(20);
    expect(inProgress?.breakdown?.[1]?.count).toBeNull();
  });

  it('leaves the cards alone when there is no In Progress card', () => {
    const cards = [card('All', 40)];
    expect(withInProgressBreakdown(cards, 3)).toBe(cards);
  });
});

describe('needsMoreInfoCount', () => {
  it('is true only when In Progress is there and More Info is not', () => {
    const inProgress = { status: 'In Progress', label: 'In Progress', order: 1, is_open: 1, is_terminal: 0, count: 1 };
    const moreInfo = { ...inProgress, status: 'More Info Needed', label: 'More Info Needed' };

    expect(needsMoreInfoCount([inProgress])).toBe(true);
    expect(needsMoreInfoCount([inProgress, moreInfo])).toBe(false);
    expect(needsMoreInfoCount([moreInfo])).toBe(false);
  });
});

describe('sortSummaryCards', () => {
  it('orders cards by the backend order field ascending', () => {
    const sorted = sortSummaryCards(sampleCards);

    expect(sorted.map((card) => card.status)).toEqual([
      'All',
      'In Progress',
      'Require More Info',
      'Rejected',
      'Resolved',
      'Closed',
    ]);
    expect(sorted.map((card) => card.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('does not mutate the original array', () => {
    const original = [...sampleCards];
    sortSummaryCards(sampleCards);
    expect(sampleCards).toEqual(original);
  });

  it('returns an empty array when given no cards', () => {
    expect(sortSummaryCards([])).toEqual([]);
  });
});

describe('resolveSummaryTotalCount', () => {
  it('uses the All card count for the page header total', () => {
    expect(resolveSummaryTotalCount(sampleCards)).toBe(42);
  });

  it('matches All status case-insensitively', () => {
    const cards: GrievanceSummaryCard[] = [
      { status: 'all', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 15 },
      { status: 'Resolved', label: 'Resolved', order: 2, is_open: 1, is_terminal: 0, count: 5 },
    ];
    expect(resolveSummaryTotalCount(cards)).toBe(15);
  });

  it('falls back to the first card count when All is missing', () => {
    const cards: GrievanceSummaryCard[] = [
      { status: 'In Progress', label: 'In Progress', order: 1, is_open: 1, is_terminal: 0, count: 20 },
      { status: 'Resolved', label: 'Resolved', order: 2, is_open: 1, is_terminal: 0, count: 8 },
    ];
    expect(resolveSummaryTotalCount(cards)).toBe(20);
  });

  it('returns 0 when there are no cards', () => {
    expect(resolveSummaryTotalCount([])).toBe(0);
  });
});
