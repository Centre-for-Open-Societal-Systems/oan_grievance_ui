// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/hooks', () => ({ useAppSelector: () => null }));
vi.mock('@/features/auth/api/authApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/api/authApi')>()),
  getFullProfile: vi.fn().mockResolvedValue({
    first_name: 'Demo',
    last_name: 'Farmer',
    profiles: { grievance: { identities: [{ scheme: 'fayda', value: '6557092147530500' }] } },
  }),
}));
import ProfilePage from './page';

afterEach(cleanup);

describe('ProfilePage Fayda ID', () => {
  it('shows only the last four characters, and the whole number only after the reveal', async () => {
    render(<ProfilePage />);

    const field = (await screen.findByLabelText('Fayda ID')) as HTMLInputElement;
    expect(field.value).toBe('••••••••••••0500');
    expect(field.value).not.toContain('6557');

    fireEvent.click(screen.getByRole('button', { name: 'Show Fayda ID' }));
    expect(field.value).toBe('6557092147530500');
    fireEvent.click(screen.getByRole('button', { name: 'Hide Fayda ID' }));
    expect(field.value).toBe('••••••••••••0500');
  });
});
