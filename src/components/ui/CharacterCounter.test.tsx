// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';
import { CharacterCounter } from './CharacterCounter';

afterEach(cleanup);

function renderCounter(count: number, max = 100) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CharacterCounter id="counter" count={count} max={max} />
    </NextIntlClientProvider>
  );
  return screen.getByText(`${count} / ${max}`);
}

describe('CharacterCounter', () => {
  it('shows the count against the limit', () => {
    expect(renderCounter(12)).toHaveAttribute('id', 'counter');
  });

  it('stays quiet for screen readers while there is plenty of room', () => {
    expect(renderCounter(50)).toHaveAttribute('aria-live', 'off');
  });

  it('announces politely once within 10% of the limit', () => {
    const counter = renderCounter(90);
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveClass('text-amber-600');
  });
});
