// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';

const push = vi.fn();
const replace = vi.fn();
const getMyOrganisation = vi.fn();
const getMe = vi.fn();
const order: string[] = [];

// One router object for every render, like Next's: a fresh one each time would re-run the page's load effect.
const router = { push, replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/layout/OrganisationHeader', () => ({ OrganisationHeader: () => null }));
vi.mock('../api/organisationApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/organisationApi')>()),
  getMyOrganisation: (...args: unknown[]) => getMyOrganisation(...args),
}));
vi.mock('@/features/auth/api/authApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/api/authApi')>()),
  getMe: (...args: unknown[]) => getMe(...args),
}));
// The form itself is covered by its own test; here it just reports a successful registration.
vi.mock('./OrganisationRegistrationForm', () => ({
  OrganisationRegistrationForm: ({ onRegistered }: { onRegistered: (org: unknown) => void }) => (
    <button
      onClick={() =>
        onRegistered({
          id: 'ORG-02216',
          legalName: 'Test NGO Org',
          brandName: null,
          orgType: 'NGO',
          entityType: 'International NGO',
          registrationNumber: '1234567890',
          status: 'In Review',
          statusReason: null,
        })
      }
    >
      register
    </button>
  ),
}));

import { loginThunk, type User } from '@/features/auth/store/authSlice';
import { makeStore } from '@/store';
import { OrganisationPage } from './OrganisationPage';

const USER_BEFORE: User = { email: 'test_ngo@gmail.com', roles: ['Grievance Submitter'], type: 'Individual Farmer' };
const USER_AFTER: User = {
  ...USER_BEFORE,
  type: 'NGO',
  organisation: {
    id: 'ORG-02216',
    legalName: 'Test NGO Org',
    brandName: null,
    orgType: 'NGO',
    entityType: 'International NGO',
    registrationNumber: '1234567890',
    representativeName: 'Test NGO',
    status: 'In Review',
    statusReason: null,
    canFile: false,
  },
};

function renderPage(kind: 'ngo' | 'fpo' = 'ngo', user: User = USER_BEFORE) {
  const store = makeStore();
  store.dispatch({ type: loginThunk.fulfilled.type, payload: user });
  render(
    <Provider store={store}>
      <NextIntlClientProvider locale="en" messages={en}>
        <OrganisationPage kind={kind} />
      </NextIntlClientProvider>
    </Provider>
  );
  return store;
}

describe('OrganisationPage', () => {
  beforeEach(() => {
    order.length = 0;
    getMyOrganisation.mockResolvedValue(null);
    getMe.mockImplementation(async () => {
      order.push('getMe');
      return USER_AFTER;
    });
    push.mockImplementation((to: string) => order.push(`push ${to}`));
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('after registering, refreshes the profile and only then goes to Submit Grievance, which therefore sees the organisation', async () => {
    const store = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'register' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/submit-grievance'));
    expect(order).toEqual(['getMe', 'push /submit-grievance']);
    expect(store.getState().auth.user?.organisation?.legalName).toBe('Test NGO Org');
    expect(store.getState().auth.status).toBe('succeeded'); // never flipped to "loading" (the full-screen "Restoring your session…")
  });

  it('retries a failed profile refresh once before giving up', async () => {
    getMe.mockRejectedValueOnce(new Error('blip'));
    const store = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'register' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/submit-grievance'));
    expect(getMe).toHaveBeenCalledTimes(2);
    expect(store.getState().auth.user?.organisation?.legalName).toBe('Test NGO Org');
  });

  it('stays put with a note and a way to continue if the profile cannot be refreshed, rather than opening Submit Grievance on the old profile', async () => {
    getMe.mockRejectedValue(new Error('down'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('we could not refresh your profile');
    expect(screen.getByText('Your organisation is registered and in review')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    getMe.mockImplementation(async () => USER_AFTER);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Submit Grievance' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/submit-grievance'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('shows the status instead of the form for an organisation that is already registered, without redirecting', async () => {
    getMyOrganisation.mockResolvedValue({
      id: 'ORG-02216',
      legalName: 'Test NGO Org',
      brandName: null,
      orgType: 'NGO',
      entityType: 'International NGO',
      registrationNumber: '1234567890',
      status: 'In Review',
      statusReason: null,
    });
    renderPage();

    expect(await screen.findByText('Your organisation is registered and in review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'register' })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("sends an organisation to its own kind's screen if the URL says the other", async () => {
    getMyOrganisation.mockResolvedValue({
      id: 'ORG-1',
      legalName: 'Selam Union',
      brandName: null,
      orgType: 'FPO',
      entityType: 'Cooperative Union',
      registrationNumber: 'ET1',
      status: 'Active',
      statusReason: null,
    });
    renderPage('ngo');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/fpo'));
  });

  it("sends an account to the screen its type names, without loading anything on the wrong one", async () => {
    renderPage('ngo', { ...USER_BEFORE, type: 'FPO' });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/fpo'));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(getMyOrganisation).not.toHaveBeenCalled();
  });

  it("does not bounce between the two screens when the account's type and its organisation's recorded type disagree", async () => {
    getMyOrganisation.mockResolvedValue({
      id: 'ORG-1',
      legalName: 'Selam Union',
      brandName: null,
      orgType: 'FPO',
      entityType: 'Cooperative Union',
      registrationNumber: 'ET1',
      status: 'Active',
      statusReason: null,
    });
    // Typed NGO, organisation recorded as an FPO: /ngo is where the type says it belongs, and it stays.
    renderPage('ngo', { ...USER_BEFORE, type: 'NGO' });

    expect(await screen.findByText('Your organisation is active')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
