// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { AddCategoryModal, type AddCategoryModalProps } from './AddCategoryModal';

function renderModal(props: Partial<AddCategoryModalProps> = {}) {
  const handlers = { onCreate: vi.fn().mockResolvedValue({}), onClose: vi.fn() };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AddCategoryModal takenCodes={[]} {...handlers} {...props} />
    </NextIntlClientProvider>
  );
  return handlers;
}

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AddCategoryModal', () => {
  afterEach(cleanup);

  it('asks for a category name, and sends nothing until given', async () => {
    const { onCreate } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates the category with a ticket code made from its name and default SLA options', async () => {
    const { onCreate, onClose } = renderModal({ takenCodes: ['MAR'] });

    change(/^Category name/i, '  Markets  ');
    change(/^SLA Days/i, '10');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // "MAR" is taken, so the last character is varied; the toggles keep their defaults.
    expect(onCreate).toHaveBeenCalledWith({
      category_name: 'Markets',
      code: 'MA0',
      sla_days: 10,
      auto_escalate: true,
      notify_on_breach: true,
    });
  });

  it('includes custom SLA days and toggle states when specified', async () => {
    const { onCreate, onClose } = renderModal();

    change(/^Category name/i, 'Health');
    change(/^SLA Days/i, '14');
    fireEvent.click(screen.getByRole('switch', { name: /Notify on escalation/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onCreate).toHaveBeenCalledWith({
      category_name: 'Health',
      code: 'HEA',
      sla_days: 14,
      auto_escalate: true,
      notify_on_breach: false,
    });
  });

  it('opens the desk in an existing department, picked by id', async () => {
    const { onCreate, onClose } = renderModal({
      departments: [{ department_id: 'DEPT-0001', department_name: 'Agriculture Bureau' }],
    });

    change(/^Category name/i, 'Seeds');
    change(/^SLA Days/i, '5');
    fireEvent.change(screen.getByRole('combobox', { name: /^Department/i }), { target: { value: 'DEPT-0001' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ department: 'DEPT-0001' }));
  });

  it('offers only existing departments, never a free-text one', () => {
    renderModal({ departments: [{ department_id: 'DEPT-0001', department_name: 'Agriculture Bureau' }] });

    const select = screen.getByRole('combobox', { name: /^Department/i });
    expect(select.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['No department yet', 'Agriculture Bureau']);
  });

  it('rejects an SLA that is not a whole number of days', async () => {
    const { onCreate } = renderModal();

    change(/^Category name/i, 'Roads');
    change(/^SLA Days/i, '2.5');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(await screen.findByText('SLA days must be a whole number, 1 or more')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('stays open and shows the reason when the service refuses the category', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Grievance Service Category Roads already exists'));
    const { onClose } = renderModal({ onCreate });

    change(/^Category name/i, 'Roads');
    change(/^SLA Days/i, '7');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Grievance Service Category Roads already exists');
    expect(onClose).not.toHaveBeenCalled();
  });
});

