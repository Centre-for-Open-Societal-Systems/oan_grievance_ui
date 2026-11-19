/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { RequiredMark } from './RequiredMark';

afterEach(cleanup);

function renderMark(props: { className?: string } = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <label>
        Full name <RequiredMark {...props} />
      </label>
    </NextIntlClientProvider>
  );
}

describe('RequiredMark', () => {
  it('hides the asterisk glyph from assistive technology', () => {
    renderMark();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces the translated word "required" as part of the label', () => {
    renderMark();
    const word = screen.getByText(en.validation.required);
    expect(word).toHaveClass('sr-only');
  });

  it('applies a custom colour class to the asterisk', () => {
    renderMark({ className: 'text-white' });
    expect(screen.getByText('*')).toHaveClass('text-white');
  });
});
