// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { SlaCategoryCard } from './SlaCategoryCard';
import type { SlaCategory } from './types';

const baseCategory: SlaCategory = {
  id: 'GR-SLA-1',
  category: 'Credit',
  categoryColor: 'bg-yellow-100 text-yellow-700',
  department: 'agriculture',
  configId: 'GR-SLA-1',
  slaDays: 7,
  autoEscalate: true,
  notifyOnBreach: true,
  progressPercentage: 23,
};

function renderCard(onSaveSla = vi.fn().mockResolvedValue(undefined)) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SlaCategoryCard categoryData={baseCategory} onSaveSla={onSaveSla} />
    </NextIntlClientProvider>
  );
  return onSaveSla;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SlaCategoryCard', () => {
  it('discards an edited SLA days value on Cancel instead of letting a later Save persist it', async () => {
    const onSaveSla = renderCard();
    fireEvent.click(screen.getByText('Credit'));

    const slaInput = await screen.findByLabelText(/SLA Days/i);
    fireEvent.change(slaInput, { target: { value: '99' } });
    expect(slaInput).toHaveValue(99);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Re-expand: the field must show the original server value, not the discarded edit.
    fireEvent.click(screen.getByText('Credit'));
    const reopenedInput = await screen.findByLabelText(/SLA Days/i);
    expect(reopenedInput).toHaveValue(7);

    fireEvent.click(screen.getByRole('button', { name: /Save SLA/i }));
    await waitFor(() => expect(onSaveSla).toHaveBeenCalledWith('GR-SLA-1', {
      sla_days: 7,
      auto_escalate: true,
      notify_on_breach: true,
    }));
  });

  it('does not snap the SLA days field to 0 when the input is cleared', async () => {
    renderCard();
    fireEvent.click(screen.getByText('Credit'));
    const slaInput = await screen.findByLabelText(/SLA Days/i);

    fireEvent.change(slaInput, { target: { value: '' } });
    expect(slaInput).toHaveValue(null);
  });

  it('does not render a grievance type dropdown', async () => {
    renderCard();
    fireEvent.click(screen.getByText('Credit'));
    await screen.findByLabelText(/SLA Days/i);
    // The SLA is per category: the card lists the category's types, but never picks one.
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('SlaCategoryCard category deactivation', () => {
  function renderWith(props: Partial<React.ComponentProps<typeof SlaCategoryCard>>) {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SlaCategoryCard categoryData={baseCategory} {...props} />
      </NextIntlClientProvider>
    );
    fireEvent.click(screen.getByText('Credit'));
  }

  it('deactivates the category only after confirming', async () => {
    const onDeactivateCategory = vi.fn().mockResolvedValue(undefined);
    renderWith({ onDeactivateCategory });
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate category' }));
    expect(onDeactivateCategory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(onDeactivateCategory).toHaveBeenCalledOnce());
  });

  it('offers no deactivation for the default category, which the service refuses', () => {
    renderWith({ onDeactivateCategory: vi.fn(), isDefaultCategory: true });
    expect(screen.queryByRole('button', { name: 'Deactivate category' })).not.toBeInTheDocument();
  });
});

describe('SlaCategoryCard rename', () => {
  function renderWith(props: Partial<React.ComponentProps<typeof SlaCategoryCard>>) {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SlaCategoryCard categoryData={baseCategory} onSaveSla={vi.fn().mockResolvedValue(undefined)} {...props} />
      </NextIntlClientProvider>
    );
    fireEvent.click(screen.getByText('Credit'));
  }

  it('renames the category on Save, after saving the SLA', async () => {
    const onRenameCategory = vi.fn().mockResolvedValue(undefined);
    renderWith({ onRenameCategory });
    fireEvent.change(screen.getByLabelText('Service Category'), { target: { value: ' Credit & Loans ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save SLA' }));
    await waitFor(() => expect(onRenameCategory).toHaveBeenCalledWith('Credit & Loans'));
    expect(await screen.findByRole('status')).toHaveTextContent('Renaming the category');
  });

  it('does not rename when the name is unchanged', async () => {
    const onRenameCategory = vi.fn();
    renderWith({ onRenameCategory });
    fireEvent.click(screen.getByRole('button', { name: 'Save SLA' }));
    expect(await screen.findByRole('status')).toHaveTextContent('SLA saved.');
    expect(onRenameCategory).not.toHaveBeenCalled();
  });

  it('locks the name while a rename is still running', () => {
    renderWith({ onRenameCategory: vi.fn(), renamingTo: 'Credit & Loans' });
    expect(screen.getByLabelText('Service Category')).toHaveAttribute('readonly');
    expect(screen.getByText('Being renamed to "Credit & Loans"…')).toBeInTheDocument();
  });

  it('is read-only without a rename handler', () => {
    renderWith({});
    expect(screen.getByLabelText('Service Category')).toHaveAttribute('readonly');
  });
});
