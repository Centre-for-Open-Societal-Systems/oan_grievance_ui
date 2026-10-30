// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { GrievanceTypesSection } from './GrievanceTypesSection';
import type { GrievanceTypeRecord } from './taxonomyTypes';

const TYPES: GrievanceTypeRecord[] = [
  { grievance_type_id: 'GT-1', type_name: 'Late payment', service_category: 'Credit', is_active: true, has_grievances: true },
  { grievance_type_id: 'GT-2', type_name: 'Wrong amount', service_category: 'Credit', is_active: true, has_grievances: false },
];

function renderSection(props: Partial<React.ComponentProps<typeof GrievanceTypesSection>> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GrievanceTypesSection types={TYPES} {...props} />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GrievanceTypesSection', () => {
  it('adds a trimmed type name', async () => {
    const onAddType = vi.fn().mockResolvedValue(undefined);
    renderSection({ onAddType, onDeactivateType: vi.fn() });
    fireEvent.change(screen.getByLabelText('Add a grievance type'), { target: { value: '  Delayed disbursement ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(onAddType).toHaveBeenCalledWith('Delayed disbursement'));
  });

  it('refuses an empty name without calling the service', () => {
    const onAddType = vi.fn();
    renderSection({ onAddType, onDeactivateType: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Grievance type is required');
    expect(onAddType).not.toHaveBeenCalled();
  });

  it('deactivates a type only after confirming', async () => {
    const onDeactivateType = vi.fn().mockResolvedValue(undefined);
    renderSection({ onAddType: vi.fn(), onDeactivateType });
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Late payment' }));
    expect(onDeactivateType).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(onDeactivateType).toHaveBeenCalledWith('GT-1'));
  });

  it('shows the service’s reason when a change is refused', async () => {
    renderSection({ onAddType: vi.fn().mockRejectedValue(new Error('A type with this name already exists.')), onDeactivateType: vi.fn() });
    fireEvent.change(screen.getByLabelText('Add a grievance type'), { target: { value: 'Late payment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A type with this name already exists.');
  });

  it('is read-only without handlers (a Review Officer)', () => {
    renderSection();
    expect(screen.getByText('Late payment')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add a grievance type')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deactivate/ })).not.toBeInTheDocument();
  });
});
