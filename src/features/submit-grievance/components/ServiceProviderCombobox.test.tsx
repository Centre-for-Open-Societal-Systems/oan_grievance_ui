// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import type { ServiceProviderOption, ServiceProviderRef } from '../api/serviceProviderApi';

const { searchServiceProviders } = vi.hoisted(() => ({ searchServiceProviders: vi.fn() }));
vi.mock('../api/serviceProviderApi', () => ({ searchServiceProviders }));

import { ServiceProviderCombobox } from './ServiceProviderCombobox';

afterEach(cleanup);

const BASONA: ServiceProviderOption = {
  id: 'SP-1',
  name: 'Basona Cooperative',
  type: 'Cooperative',
  parent: { id: 'SP-0', name: 'Amhara Union' },
  area: { id: 'A-1', name: 'Basona', path_label: 'Amhara / North Shewa' },
};
const DEBRE: ServiceProviderOption = { id: 'SP-2', name: 'Debre Input Store', type: 'Input Store', parent: null, area: null };

const onChangeSpy = vi.fn();

function Harness({ initial = null }: { initial?: ServiceProviderRef | null }) {
  const [value, setValue] = useState<ServiceProviderRef | null>(initial);
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <form onSubmit={(e) => e.preventDefault()}>
        <ServiceProviderCombobox
          id="provider"
          value={value}
          onChange={(v) => {
            onChangeSpy(v);
            setValue(v);
          }}
        />
        <button type="submit">submit</button>
      </form>
    </NextIntlClientProvider>
  );
}

const input = () => screen.getByRole('combobox') as HTMLInputElement;
const copy = en.submitGrievance.serviceProvider;

beforeEach(() => {
  searchServiceProviders.mockReset();
  onChangeSpy.mockReset();
  searchServiceProviders.mockResolvedValue([BASONA, DEBRE]);
});

describe('ServiceProviderCombobox', () => {
  it('starts closed and does not search until opened', () => {
    render(<Harness />);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(searchServiceProviders).not.toHaveBeenCalled();
  });

  it('lists providers with their type, head office and area when focused', async () => {
    render(<Harness />);
    fireEvent.focus(input());

    expect(await screen.findByRole('option', { name: /Basona Cooperative/ })).toBeInTheDocument();
    expect(screen.getByText('Cooperative · Amhara Union · Amhara / North Shewa')).toBeInTheDocument();
    expect(screen.getByText('Input Store')).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  it('searches with the typed text, debounced to a single request', async () => {
    render(<Harness />);
    fireEvent.focus(input());
    await screen.findAllByRole('option');
    searchServiceProviders.mockClear();

    fireEvent.change(input(), { target: { value: 'B' } });
    fireEvent.change(input(), { target: { value: 'Ba' } });
    fireEvent.change(input(), { target: { value: 'Baso' } });

    await waitFor(() => expect(searchServiceProviders).toHaveBeenCalledTimes(1));
    expect(searchServiceProviders).toHaveBeenCalledWith('Baso', expect.any(AbortSignal));
  });

  it('shows a searching row while the first load is pending', async () => {
    searchServiceProviders.mockReturnValue(new Promise(() => {}));
    render(<Harness />);
    fireEvent.focus(input());
    expect(await screen.findByText(copy.searching, { exact: false })).toBeInTheDocument();
  });

  it('shows the no-match message for an empty result', async () => {
    searchServiceProviders.mockResolvedValue([]);
    render(<Harness />);
    fireEvent.focus(input());
    expect(await screen.findByText(copy.noMatch)).toBeInTheDocument();
  });

  it('shows the load error when the search fails', async () => {
    searchServiceProviders.mockRejectedValue(new Error('down'));
    render(<Harness />);
    fireEvent.focus(input());
    expect(await screen.findByText(copy.loadError)).toBeInTheDocument();
  });

  it('picks an option by mouse and shows its name', async () => {
    render(<Harness />);
    fireEvent.focus(input());
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Debre Input Store/ }));

    expect(onChangeSpy).toHaveBeenCalledWith({ id: 'SP-2', name: 'Debre Input Store' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input()).toHaveValue('Debre Input Store');
  });

  it('moves with arrow keys, wraps around, and picks with Enter without submitting the form', async () => {
    const submit = vi.fn((e: Event) => e.preventDefault());
    render(<Harness />);
    input().form!.addEventListener('submit', submit);
    fireEvent.focus(input());
    await screen.findAllByRole('option');

    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]?.id);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]?.id);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]?.id);
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]?.id);

    const notPrevented = fireEvent.keyDown(input(), { key: 'Enter' });
    expect(notPrevented).toBe(false);
    expect(onChangeSpy).toHaveBeenCalledWith({ id: 'SP-2', name: 'Debre Input Store' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('does nothing on Enter when no option is highlighted', async () => {
    render(<Harness />);
    fireEvent.focus(input());
    await screen.findAllByRole('option');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('closes on Escape without choosing', async () => {
    render(<Harness />);
    fireEvent.focus(input());
    await screen.findAllByRole('option');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('opens the list on ArrowDown after it was closed', async () => {
    render(<Harness />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(await screen.findByRole('listbox', { name: copy.listLabel })).toBeInTheDocument();
  });

  it('discards typed text that was never picked when focus leaves', async () => {
    render(<Harness />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'Unlisted Shop' } });
    fireEvent.blur(input());

    expect(input()).toHaveValue('');
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('marks the chosen provider as selected', async () => {
    render(<Harness initial={{ id: 'SP-1', name: 'Basona Cooperative' }} />);
    expect(input()).toHaveValue('Basona Cooperative');
    fireEvent.focus(input());

    const selected = await screen.findByRole('option', { name: /Basona Cooperative/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /Debre Input Store/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('clears the selection with the clear button, which only appears once a provider is chosen', () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('button', { name: copy.clear })).not.toBeInTheDocument();
    unmount();

    render(<Harness initial={{ id: 'SP-1', name: 'Basona Cooperative' }} />);
    fireEvent.click(screen.getByRole('button', { name: copy.clear }));
    expect(onChangeSpy).toHaveBeenCalledWith(null);
    expect(input()).toHaveValue('');
  });

  it('ignores a failure from a search that was already abandoned', async () => {
    let rejectFirst: (e: Error) => void = () => {};
    searchServiceProviders.mockImplementationOnce(
      (_q: string, signal: AbortSignal) =>
        new Promise((_, reject) => {
          rejectFirst = () => reject(new Error(signal.aborted ? 'aborted' : 'fail'));
        })
    );
    render(<Harness />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'Baso' } });
    await screen.findAllByRole('option');

    rejectFirst(new Error('late'));
    await Promise.resolve();
    expect(screen.queryByText(copy.loadError)).not.toBeInTheDocument();
  });
});
