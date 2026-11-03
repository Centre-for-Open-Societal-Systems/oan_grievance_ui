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
  fetchOfficerCandidates: vi.fn().mockResolvedValue({ candidates: [] }),
  fetchCategoryAssignments: vi.fn().mockResolvedValue({ assignments: [], pagination: {} }),
  fetchOfficers: vi.fn().mockResolvedValue({ officers: [], pagination: { total_count: 0 } }),
  fetchServiceCategoryNames: vi.fn().mockResolvedValue(['Inputs', 'Markets']),
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

  it('creates an officer with the picked categories and no department or designation', async () => {
    const { onCreated, onClose } = renderModal({ level: 'L3' });

    expect(screen.queryByText('Department')).toBeNull();
    expect(screen.queryByText('Designation')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Enter Full Name'), { target: { value: 'Abebe Bikila' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Email ID'), { target: { value: 'abebe@example.et' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Inputs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(createOfficer).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Officer',
          level: 'L3',
          full_name: 'Abebe Bikila',
          email: 'abebe@example.et',
          department: null,
          service_categories: ['Inputs'],
        })
      );
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ['an L1 officer', { role: 'Officer' as const, level: 'L1' as const, tabLabel: 'Nodal Officer' }],
    ['a Reviewer', { role: 'Reviewer' as const, level: undefined, tabLabel: 'Reviewer' }],
  ])('requires a service category for %s and does not submit without one', async (_name, props) => {
    const { onCreated } = renderModal(props);

    fireEvent.change(screen.getByPlaceholderText('Enter Full Name'), { target: { value: 'Tola Degefa' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Email ID'), { target: { value: 'tola@example.et' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Select at least one service category.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
