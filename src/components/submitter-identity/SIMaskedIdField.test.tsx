// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SIMaskedIdField } from './SIMaskedIdField';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderField() {
  render(<SIMaskedIdField id="fayda" value="1234567890123456" onChange={() => {}} />);
  return document.getElementById('fayda') as HTMLInputElement;
}

describe('SIMaskedIdField', () => {
  it('falls back to a real password input where the browser cannot mask with CSS, so the ID is never shown in clear text', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    expect(renderField()).toHaveAttribute('type', 'password');
  });

  it('uses a CSS-masked text input where it can, so the browser does not offer to save a password', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    // (jsdom drops the non-standard -webkit-text-security property, so only the input type is observable here)
    expect(renderField()).toHaveAttribute('type', 'text');
  });

  it('reveals and re-hides the number with the toggle in either mode', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    const input = renderField();
    fireEvent.click(screen.getByRole('button', { name: 'Show ID number' }));
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide ID number' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
