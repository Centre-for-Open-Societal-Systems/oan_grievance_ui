/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { AddNodalOfficerModal } from './AddNodalOfficerModal';
import { createOfficer, fetchCategoryAssignments } from '../api/officerApi';

const wiredInputs = { assignments: [{ service_category: 'Inputs' }], pagination: {} } as unknown as Awaited<ReturnType<typeof fetchCategoryAssignments>>;

vi.mock('../api/officerApi', () => ({
  createOfficer: vi.fn().mockResolvedValue({
    officer: { name: 'depthead@example.et' },
    message: 'Officer created successfully',
  }),
  fetchCategoryAssignments: vi.fn().mockResolvedValue({ assignments: [], pagination: {} }),
  fetchOfficers: vi.fn().mockResolvedValue({ officers: [], pagination: { total_count: 0 } }),
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
        tabLabel="Category Admin"
        onCreated={onCreated}
        {...props}
      />
    </Provider>
  );

  return { store, onCreated, onClose };
}

describe('AddNodalOfficerModal for Category Admins', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('picks an existing department and its wired categories for a department head', async () => {
    vi.mocked(fetchCategoryAssignments).mockResolvedValueOnce(wiredInputs);
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
    fireEvent.click(screen.getByRole('button', { name: /^Department/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Ministry of Agriculture' }));

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
          department: 'Ministry of Agriculture',
          service_categories: ['Inputs'],
        })
      );
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('displays available service categories immediately for Category Admin without entering department first', async () => {
    renderModal({ level: 'L3' });

    expect(screen.queryByText(/select a department first/i)).toBeNull();
    const inputsCategoryBtn = await screen.findByRole('button', { name: 'Inputs' });
    expect(inputsCategoryBtn).toBeTruthy();
  });

  it('narrows the categories to the chosen department and clears earlier picks', async () => {
    vi.mocked(fetchCategoryAssignments).mockResolvedValueOnce(wiredInputs);
    renderModal({ level: 'L3' });

    fireEvent.click(await screen.findByRole('button', { name: 'Markets' }));
    fireEvent.click(screen.getByRole('button', { name: /^Department/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Ministry of Agriculture' }));

    // Only the department's wired category remains, and the old pick is gone.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Markets' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Inputs' }).className).not.toContain('bg-[#16A34A]');
  });

  it.each([
    ['an L1 officer', { role: 'Officer' as const, level: 'L1' as const, tabLabel: 'Nodal Officer' }],
    ['a Reviewer', { role: 'Reviewer' as const, level: undefined, tabLabel: 'Reviewer' }],
  ])('requires a department for %s and does not submit without one', async (_name, props) => {
    const { onCreated } = renderModal(props);

    expect(screen.getByText('Department').querySelector('.text-red-500')).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Enter Full Name'), { target: { value: 'Tola Degefa' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Email ID'), { target: { value: 'tola@example.et' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Inputs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Select a department.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('allows creating a Category Admin without department or designation', async () => {
    const { onCreated, onClose } = renderModal({ level: 'L3', tabLabel: 'Category Admin' });

    // Verify Department and Designation labels do not have a required asterisk
    const designationLabel = screen.getByText('Designation');
    expect(designationLabel.textContent).toBe('Designation');
    expect(designationLabel.querySelector('.text-red-500')).toBeNull();

    const departmentLabel = screen.getByText('Department');
    expect(departmentLabel.textContent).toBe('Department');
    expect(departmentLabel.querySelector('.text-red-500')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Enter Full Name'), {
      target: { value: 'Admin User' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'admin@example.et' },
    });

    const inputsCategoryBtn = await screen.findByRole('button', { name: 'Inputs' });
    fireEvent.click(inputsCategoryBtn);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(createOfficer).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Officer',
          level: 'L3',
          full_name: 'Admin User',
          email: 'admin@example.et',
          designation: null,
          department: null,
          service_categories: ['Inputs'],
        })
      );
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

