/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddOfficerModal } from './AddOfficerModal';

describe('AddOfficerModal', () => {
  it('blocks submission and shows inline errors when required fields are empty', () => {
    const onAdd = vi.fn();
    render(<AddOfficerModal isOpen onClose={vi.fn()} tabLabel="Admin" onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Enter your full name.')).toBeTruthy();
    expect(screen.getByText('Enter a role title.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('rejects a malformed phone number for the selected country (Ethiopia by default)', () => {
    const onAdd = vi.fn();
    render(<AddOfficerModal isOpen onClose={vi.fn()} tabLabel="Admin" onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Test Officer' } });
    fireEvent.change(screen.getByLabelText('Role Title *'), { target: { value: 'Case Officer' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Phone Number'), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText(/Enter a valid Ethiopian mobile number/)).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('accepts a valid form and sends the phone number in E.164', () => {
    const onAdd = vi.fn();
    render(<AddOfficerModal isOpen onClose={vi.fn()} tabLabel="Admin" onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Test Officer' } });
    fireEvent.change(screen.getByLabelText('Role Title *'), { target: { value: 'Case Officer' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Phone Number'), { target: { value: '911234567' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Officer', roleTitle: 'Case Officer', phone: '+251911234567' })
    );
  });

  it('pre-fills a valid temporary password and marks the new officer as awaiting first sign-in', () => {
    const onAdd = vi.fn();
    render(<AddOfficerModal isOpen onClose={vi.fn()} tabLabel="Reviewer" onAdd={onAdd} />);

    const passwordField = screen.getByLabelText('Temporary Password *') as HTMLInputElement;
    expect(passwordField.value.length).toBeGreaterThanOrEqual(8);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Test Reviewer' } });
    fireEvent.change(screen.getByLabelText('Role Title *'), { target: { value: 'Compliance Reviewer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
  });

  it('rejects an empty temporary password', () => {
    const onAdd = vi.fn();
    render(<AddOfficerModal isOpen onClose={vi.fn()} tabLabel="Admin" onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Test Officer' } });
    fireEvent.change(screen.getByLabelText('Role Title *'), { target: { value: 'Case Officer' } });
    fireEvent.change(screen.getByLabelText('Temporary Password *'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Enter a temporary password.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
