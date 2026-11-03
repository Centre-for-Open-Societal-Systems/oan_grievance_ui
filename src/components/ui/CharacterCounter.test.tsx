// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';
import { CharacterCounter } from './CharacterCounter';

afterEach(cleanup);

function renderCounter(count: number, max = 100, className?: string) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CharacterCounter id="counter" count={count} max={max} className={className} />
    </NextIntlClientProvider>
  );
  return screen.getByText(`${count} / ${max}`);
}

describe('CharacterCounter', () => {
  it('shows the count against the limit', () => {
    expect(renderCounter(12)).toHaveAttribute('id', 'counter');
  });

  it('never makes the visible count a live region, so typing is not narrated', () => {
    expect(renderCounter(50)).not.toHaveAttribute('aria-live');
  });

  it('keeps an empty status region mounted while there is plenty of room', () => {
    renderCounter(50);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toBeEmptyDOMElement();
  });

  it('says how many characters remain once within 10% of the limit', () => {
    const counter = renderCounter(90);
    expect(counter).toHaveClass('text-amber-600');
    expect(screen.getByRole('status')).toHaveTextContent('10 characters remaining');
  });

  it('uses the singular for the last character', () => {
    renderCounter(99);
    expect(screen.getByRole('status')).toHaveTextContent('1 character remaining');
  });

  it('is at the limit, with nothing remaining, when count equals max', () => {
    const counter = renderCounter(100);
    expect(counter).toHaveClass('text-amber-600');
    expect(screen.getByRole('status')).toHaveTextContent('0 characters remaining');
  });

  it('never reports a negative remainder when the count is over the limit', () => {
    renderCounter(120);
    expect(screen.getByRole('status')).toHaveTextContent('0 characters remaining');
  });

  it('adds the caller className alongside its own', () => {
    expect(renderCounter(10, 100, 'text-right mt-1')).toHaveClass('text-right', 'mt-1', 'tabular-nums');
  });
});
