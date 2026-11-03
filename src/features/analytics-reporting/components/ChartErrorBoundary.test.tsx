/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { ChartErrorBoundary } from './ChartErrorBoundary';

let shouldThrow = true;

function Fragile() {
  if (shouldThrow) throw new Error('chart choked on a row');
  return <p>chart drawn</p>;
}

function renderBoundary() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ChartErrorBoundary>
        <Fragile />
      </ChartErrorBoundary>
    </NextIntlClientProvider>
  );
}

describe('ChartErrorBoundary', () => {
  afterEach(() => {
    shouldThrow = true;
    vi.restoreAllMocks();
  });

  it('shows the section as unavailable when a chart throws while drawing, instead of crashing the page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderBoundary();

    expect(screen.getByRole('alert')).toHaveTextContent(en.analytics.sectionUnavailable);
    expect(screen.queryByText('chart drawn')).not.toBeInTheDocument();
  });

  it('draws the chart again when Retry is pressed and it no longer throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderBoundary();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: en.analytics.retry }));

    expect(screen.getByText('chart drawn')).toBeInTheDocument();
  });
});
