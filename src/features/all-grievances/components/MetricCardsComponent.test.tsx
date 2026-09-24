/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MetricCardsComponent } from './MetricCardsComponent';
import type { GrievanceSummaryCard } from '../types';

afterEach(() => {
  cleanup();
});

const cards: GrievanceSummaryCard[] = [
  { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
  { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  { status: 'Require More Info', label: 'Require More Info', order: 3, is_open: 1, is_terminal: 0, count: 4 },
  { status: 'Rejected', label: 'Rejected', order: 4, is_open: 0, is_terminal: 1, count: 3 },
  { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
  { status: 'Closed', label: 'Closed', order: 6, is_open: 0, is_terminal: 1, count: 7 },
];

describe('MetricCardsComponent', () => {
  it('renders labels and counts from the summary API cards', () => {
    const { container } = render(<MetricCardsComponent cards={cards} />);
    const view = within(container);

    expect(view.getByText('All')).toBeTruthy();
    expect(view.getByText('42')).toBeTruthy();
    expect(view.getByText('In Progress')).toBeTruthy();
    expect(view.getByText('20')).toBeTruthy();
    expect(view.getByText('Require More Info')).toBeTruthy();
    expect(view.getByText('4')).toBeTruthy();
    expect(view.getByText('Rejected')).toBeTruthy();
    expect(view.getByText('3')).toBeTruthy();
    expect(view.getByText('Resolved')).toBeTruthy();
    expect(view.getByText('8')).toBeTruthy();
    expect(view.getByText('Closed')).toBeTruthy();
    expect(view.getByText('7')).toBeTruthy();
  });

  it('renders nothing when the cards list is empty', () => {
    const { container } = render(<MetricCardsComponent cards={[]} />);
    expect(container.querySelectorAll('.group')).toHaveLength(0);
  });

  it('treats a missing count as zero', () => {
    const incomplete: GrievanceSummaryCard[] = [
      {
        status: 'All',
        label: 'All',
        order: 1,
        is_open: 1,
        is_terminal: 0,
        count: undefined as unknown as number,
      },
    ];

    const { container } = render(<MetricCardsComponent cards={incomplete} />);
    const view = within(container);

    expect(view.getByText('All')).toBeTruthy();
    expect(view.getByText('0')).toBeTruthy();
  });

  it('renders more than six cards using the fallback visual for extras', () => {
    const extraCards: GrievanceSummaryCard[] = [
      ...cards,
      { status: 'Escalated', label: 'Escalated', order: 7, is_open: 1, is_terminal: 0, count: 2 },
    ];

    const { container } = render(<MetricCardsComponent cards={extraCards} />);
    const view = within(container);

    expect(view.getByText('Escalated')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
  });
});
