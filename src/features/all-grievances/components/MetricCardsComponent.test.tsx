/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({ metricsPrevious: 'Previous cards', metricsNext: 'Next cards' })[key] ?? key,
}));

import { MetricCardsComponent } from './MetricCardsComponent';
import type { GrievanceSummaryCard } from '../types';

const cards: GrievanceSummaryCard[] = [
  { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
  { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  { status: 'Require More Info', label: 'Require More Info', order: 3, is_open: 1, is_terminal: 0, count: 4 },
  { status: 'Rejected', label: 'Rejected', order: 4, is_open: 0, is_terminal: 1, count: 3 },
  { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
  { status: 'Closed', label: 'Closed', order: 6, is_open: 0, is_terminal: 1, count: 7 },
];

function visuals(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-visual]')].map(
    (node) => node.getAttribute('data-visual') ?? ''
  );
}

describe('MetricCardsComponent', () => {
  // jsdom has no layout (every size is 0). By default the card row overflows its container, as it does
  // on a narrow screen; tests that need a row that fits override this.
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 400, configurable: true });
  });
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
  });

  it('gives every workflow status its own icon rather than the placeholder', () => {
    const status = (name: string, label = name) => ({ status: name, label, order: 1, is_open: 1, is_terminal: 0, count: 1 });
    const { container } = render(
      <MetricCardsComponent
        cards={[
          status('Submitted'),
          status('Assigned'),
          status('Reopened'),
          status('In Progress'),
          status('Duplicate', 'Duplicates'),
          status('Rejected'),
          status('Resolved'),
          status('Closed'),
        ]}
      />
    );

    const keys = visuals(container);
    expect(keys).toEqual(['submitted', 'assigned', 'reopened', 'in-progress', 'duplicate', 'rejected', 'resolved', 'closed']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('lists the parts of a card under its count', () => {
    const { container } = render(
      <MetricCardsComponent
        cards={[
          {
            status: 'In Progress',
            label: 'In Progress',
            order: 1,
            is_open: 1,
            is_terminal: 0,
            count: 23,
            breakdown: [
              { label: 'In Progress', count: 20 },
              { label: 'More Info Needed', count: null },
            ],
          },
        ]}
      />
    );
    const parts = within(within(container).getByRole('list', { name: 'In Progress' }));

    expect(parts.getByText('More Info Needed')).toBeTruthy();
    expect(parts.getByText('20')).toBeTruthy();
    expect(parts.getByText('—')).toBeTruthy();
  });

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

  it('matches icons to status even when the backend reorders the cards', () => {
    const rejected = cards.find((card) => card.status === 'Rejected');
    const all = cards.find((card) => card.status === 'All');
    const resolved = cards.find((card) => card.status === 'Resolved');
    if (!rejected || !all || !resolved) throw new Error('fixture cards missing');

    const { container } = render(<MetricCardsComponent cards={[rejected, all, resolved]} />);

    expect(visuals(container)).toEqual(['rejected', 'all', 'resolved']);
  });

  it('keeps the Assigned icon when that officer card is inserted ahead of later statuses', () => {
    const all = cards.find((card) => card.status === 'All');
    const rejected = cards.find((card) => card.status === 'Rejected');
    if (!all || !rejected) throw new Error('fixture cards missing');

    const withAssigned: GrievanceSummaryCard[] = [
      all,
      { status: 'Assigned', label: 'Assigned', order: 2, is_open: 1, is_terminal: 0, count: 6 },
      { ...rejected, order: 5 },
    ];

    const { container } = render(<MetricCardsComponent cards={withAssigned} />);

    expect(visuals(container)).toEqual(['all', 'assigned', 'rejected']);
  });

  it('falls back to the label when the status string is unfamiliar', () => {
    const byLabel: GrievanceSummaryCard[] = [
      { status: 'queue-4', label: 'Rejected', order: 1, is_open: 0, is_terminal: 1, count: 3 },
    ];

    const { container } = render(<MetricCardsComponent cards={byLabel} />);

    expect(visuals(container)).toEqual(['rejected']);
  });

  it('uses a neutral visual for a status that is neither known nor labelled as one', () => {
    const extraCards: GrievanceSummaryCard[] = [
      ...cards,
      { status: 'Escalated', label: 'Escalated', order: 7, is_open: 1, is_terminal: 0, count: 2 },
    ];

    const { container } = render(<MetricCardsComponent cards={extraCards} />);
    const view = within(container);

    expect(view.getByText('Escalated')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(visuals(container).at(-1)).toBe('fallback');
    expect(visuals(container)).toContain('rejected');
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

  it('shows skeleton cards while the summary is loading instead of a zero count', () => {
    const { container } = render(<MetricCardsComponent cards={[]} isLoading />);
    const view = within(container);

    expect(view.getByRole('status', { name: 'Loading grievance summary' })).toBeTruthy();
    expect(container.querySelectorAll('[data-visual]')).toHaveLength(0);
    expect(view.queryByText('0')).toBeNull();
  });

  it('shows the summary error and retries instead of an empty card row', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <MetricCardsComponent cards={[]} error="Network down" onRetry={onRetry} />
    );
    const view = within(container);

    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.getByText('Could not load grievance summary')).toBeTruthy();
    expect(view.getByText('Network down')).toBeTruthy();
    expect(container.querySelectorAll('[data-visual]')).toHaveLength(0);

    fireEvent.click(view.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the arrows when every card fits and there is nothing to scroll', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { value: 400, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 400, configurable: true });

    const view = render(<MetricCardsComponent cards={cards} />);

    expect(view.container.querySelectorAll('[data-visual]').length).toBeGreaterThan(1);
    expect(view.queryByRole('button', { name: 'Next cards' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Previous cards' })).toBeNull();
  });

  it('shows labelled previous / next buttons, with Previous disabled at the start and Next disabled at the end', async () => {
    const view = render(<MetricCardsComponent cards={cards} />);
    const previous = view.getByRole('button', { name: 'Previous cards' });
    const next = view.getByRole('button', { name: 'Next cards' });
    expect(view.container.querySelectorAll('button[aria-label^="Go to page"]')).toHaveLength(0);

    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    const scrollContainer = view.container.querySelector('.overflow-x-auto') as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 600, writable: true, configurable: true });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(next).toBeDisabled();
      expect(previous).toBeEnabled();
    });
  });

  it('moves to the neighbouring card when an arrow is pressed', () => {
    const view = render(<MetricCardsComponent cards={cards} />);
    const scrollContainer = view.container.querySelector('.overflow-x-auto') as HTMLDivElement;
    const scrolled = vi.fn();
    Array.from(scrollContainer.children).forEach((child) => {
      (child as HTMLElement).scrollIntoView = () => scrolled(child);
    });

    fireEvent.click(view.getByRole('button', { name: 'Next cards' }));

    // The first card is active, so Next brings the second into view.
    expect(scrolled).toHaveBeenCalledWith(scrollContainer.children[1]);
  });

  it('shows the arrows even when it first mounted in the loading state', () => {
    const view = render(<MetricCardsComponent cards={[]} isLoading />);
    expect(view.queryByRole('button', { name: 'Next cards' })).toBeNull();

    view.rerender(<MetricCardsComponent cards={cards} isLoading={false} />);
    expect(view.getByRole('button', { name: 'Next cards' })).toBeInTheDocument();
  });
});
