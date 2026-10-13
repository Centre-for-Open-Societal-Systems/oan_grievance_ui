/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { AddNodalOfficerModal } from './AddNodalOfficerModal';
import { createOfficer } from '../api/officerApi';

vi.mock('../api/officerApi', () => ({
  createOfficer: vi.fn().mockResolvedValue({
    officer: { name: 'depthead@example.et' },
    message: 'Officer created successfully',
  }),
  fetchCategoryAssignments: vi.fn().mockResolvedValue({ assignments: [], pagination: {} }),
}));

vi.mock('@/features/metadata/api/metadataApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/metadata/api/metadataApi')>()),
  fetchAdministrativeAreas: vi.fn().mockResolvedValue({
    areas: [],
    count: 0,
    level_name: 'Region',
    parent: null,
  }),
  fetchGrievanceOptions: vi.fn().mockResolvedValue({
    departments: [{ department_id: 'DEP-1', department_name: 'Ministry of Agriculture' }],
    service_categories: [
      { category_id: 'CAT-1', category_name: 'Inputs', is_active: true },
      { category_id: 'CAT-2', category_name: 'Markets', is_active: true },
    ],
    statuses: [],
    grievance_types: [],
    submission_channels: [],
  }),
}));

function renderModal(props: Partial<Parameters<typeof AddNodalOfficerModal>[0]> = {}) {
  const store = makeStore();
  const onCreated = vi.fn();
  const onClose = vi.fn();

  render(
    <Provider store={store}>
      <AddNodalOfficerModal
        isOpen={true}
        onClose={onClose}
        role="Officer"
        level="L3"
        tabLabel="Department Admin"
        onCreated={onCreated}
        {...props}
      />
    </Provider>
  );

  return { store, onCreated, onClose };
}

describe('AddNodalOfficerModal for Department Admins', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a text input with datalist for department when level is L3', async () => {
    renderModal({ level: 'L3' });

    const deptInput = screen.getByPlaceholderText('Enter or select department');
    expect(deptInput).toBeTruthy();
    expect(deptInput.getAttribute('list')).toBe('existing-departments');
  });

  it('allows typing a new department name and selecting available system categories', async () => {
    const { onCreated, onClose } = renderModal({ level: 'L3' });

    fireEvent.change(screen.getByPlaceholderText('Enter Full Name'), {
      target: { value: 'Abebe Bikila' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'abebe@example.et' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Inputs Quality Grievance Officer'), {
      target: { value: 'Head of Inputs' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter or select department'), {
      target: { value: 'Department of Irrigation' },
    });

    // Wait for categories to populate once department is entered
    const inputsCategoryBtn = await screen.findByRole('button', { name: 'Inputs' });
    expect(inputsCategoryBtn).toBeTruthy();
    fireEvent.click(inputsCategoryBtn);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(createOfficer).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Officer',
          level: 'L3',
          full_name: 'Abebe Bikila',
          email: 'abebe@example.et',
          designation: 'Head of Inputs',
          department: 'Department of Irrigation',
          service_categories: ['Inputs'],
        })
      );
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('displays available service categories immediately for Department Admin without entering department first', async () => {
    renderModal({ level: 'L3' });

    expect(screen.queryByText(/select a department first/i)).toBeNull();
    const inputsCategoryBtn = await screen.findByRole('button', { name: 'Inputs' });
    expect(inputsCategoryBtn).toBeTruthy();
  });
});
