/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { fetchGrievanceOptionsThunk } from '@/features/metadata';
import { makeStore } from '@/store';
import { AddOfficerModal } from './AddOfficerModal';

function renderModal(onAdd = vi.fn(), tabLabel = 'Admin') {
  const store = makeStore();
  // Seeds the Department/Category dropdowns the same way a real fetchGrievanceOptionsThunk
  // resolution would, without hitting the network.
  store.dispatch({
    type: fetchGrievanceOptionsThunk.fulfilled.type,
    payload: {
      departments: [{ department_name: 'Ministry of Agriculture' }],
      service_categories: [{ category_name: 'Inputs' }],
    },
  });
  render(
    <Provider store={store}>
      <AddOfficerModal isOpen onClose={vi.fn()} tabLabel={tabLabel} onAdd={onAdd} />
    </Provider>
  );
  return onAdd;
}

function selectDropdownOption(labelText: string, optionText: string) {
  fireEvent.click(screen.getByText(labelText));
  fireEvent.click(screen.getByText(optionText));
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Test Officer' } });
  fireEvent.change(screen.getByLabelText('Role Title *'), { target: { value: 'Case Officer' } });
  selectDropdownOption('Select Department', 'Ministry of Agriculture');
  selectDropdownOption('Select Category', 'Inputs');
}

describe('AddOfficerModal', () => {
  it('blocks submission and shows inline errors when required fields are empty', () => {
    const onAdd = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Enter your full name.')).toBeTruthy();
    expect(screen.getByText('Enter a role title.')).toBeTruthy();
    expect(screen.getByText('Select a department.')).toBeTruthy();
    expect(screen.getByText('Select a category.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('rejects a malformed phone number for the selected country (Ethiopia by default)', () => {
    const onAdd = renderModal();

    fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText('Enter Phone Number'), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText(/Enter a valid Ethiopian mobile number/)).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('accepts a valid form, sends the phone number in E.164, and carries the chosen department/category', () => {
    const onAdd = renderModal();

    fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText('Enter Phone Number'), { target: { value: '911234567' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Officer',
        roleTitle: 'Case Officer',
        phone: '+251911234567',
        department: 'Ministry of Agriculture',
        tags: ['Inputs'],
      })
    );
  });

  it('pre-fills a valid temporary password and marks the new officer as awaiting first sign-in', () => {
    const onAdd = renderModal(vi.fn(), 'Reviewer');

    const passwordField = screen.getByLabelText('Temporary Password *') as HTMLInputElement;
    expect(passwordField.value.length).toBeGreaterThanOrEqual(8);

    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
  });

  it('rejects an empty temporary password', () => {
    const onAdd = renderModal();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Temporary Password *'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Enter a temporary password.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
