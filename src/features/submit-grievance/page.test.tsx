// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { loginThunk, type User } from '@/features/auth/store/authSlice';
import SubmitGrievancePage from './page';
import { makeStore } from './testFixtures';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => '/submit-grievance',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  currentSearch = '';
});

const mockUser: User = {
  email: 'agent@example.com',
  roles: ['Grievance Submitter'],
  full_name: 'Tigist Agent',
  mobile_no: '+251911000000',
  fayda_id: 'ET-FAYDA-111',
  type: 'Individual Farmer',
};

function renderPage(preloadedUser: User = mockUser) {
  const store = makeStore();
  store.dispatch({
    type: loginThunk.fulfilled.type,
    payload: preloadedUser,
  });

  return render(
    <Provider store={store}>
      <NextIntlClientProvider locale="en" messages={en}>
        <SubmitGrievancePage />
      </NextIntlClientProvider>
    </Provider>
  );
}

describe('SubmitGrievancePage URL step filter', () => {
  it('renders Step 1 by default when no step parameter is present', async () => {
    currentSearch = '';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Submitter Identity', { selector: 'h3' })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Provide essential details about your grievance/).length).toBeGreaterThan(0);
  });

  it('renders Step 2 (Grievance Details) directly when URL has ?step=2', async () => {
    currentSearch = 'step=2';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Grievance Details', { selector: 'h3' })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Provide essential details about your grievance/).length).toBeGreaterThan(0);
  });

  it('sends ?step=3 back to Step 2 when the grievance details are still empty', async () => {
    currentSearch = 'step=3';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Grievance Details', { selector: 'h3' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Review & Submit', { selector: 'h3' })).not.toBeInTheDocument();
    // A separate effect from the one that renders Step 2 is what calls replace() — waiting
    // for it independently (rather than assuming it already happened by the time the DOM
    // waitFor above resolved) is what makes this deterministic instead of a timing race.
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/submit-grievance?step=2', { scroll: false });
    });
  });

  it('pushes the new step to the URL when Next is clicked', async () => {
    currentSearch = 'step=1';
    renderPage();

    const nextBtn = await screen.findByRole('button', { name: /Save & Continue/i });
    fireEvent.click(nextBtn);

    expect(pushMock).toHaveBeenCalledWith('/submit-grievance?step=2', { scroll: false });
  });

  it('pushes the previous step to the URL when Back is clicked', async () => {
    currentSearch = 'step=2';
    renderPage();

    const backButtons = await screen.findAllByRole('button', { name: /Back/i });
    if (backButtons[0]) {
      fireEvent.click(backButtons[0]);
    }

    expect(pushMock).toHaveBeenCalledWith('/submit-grievance?step=1', { scroll: false });
  });
});

describe('SubmitGrievancePage for a registered NGO', () => {
  const ngoUser: User = {
    email: 'test_ngo@gmail.com',
    roles: ['Grievance Submitter'],
    full_name: 'Test NGO',
    mobile_no: '+251987654312',
    phone_number: '987654312',
    country_code: '+251',
    type: 'NGO',
    organisation: {
      id: 'ORG-02216',
      legalName: 'Test NGO Org',
      brandName: 'NGO Org',
      orgType: 'NGO',
      entityType: 'International NGO',
      registrationNumber: '1234567890',
      representativeName: 'Test NGO',
      status: 'In Review',
      statusReason: null,
      canFile: false,
    },
  };

  it("opens Step 1 as the organisation: its details filled in and the submitter type fixed to NGO", async () => {
    renderPage(ngoUser);

    expect(await screen.findByLabelText(/^Organisation Name/)).toHaveValue('Test NGO Org');
    expect(screen.getByLabelText(/^Registration Number/)).toHaveValue('1234567890');
    expect(screen.getByLabelText(/^Authorised Representative/)).toHaveValue('Test NGO');
    expect(screen.getByLabelText(/^Contact Email ID/)).toHaveValue('test_ngo@gmail.com');
    // The type comes from the verified registration, so it cannot be switched to another.
    expect(screen.getByRole('combobox', { name: /Submitter Type/ })).toBeDisabled();
  });

  it("also fills the representative's Fayda ID, which the account got at sign-up", async () => {
    renderPage({ ...ngoUser, fayda_id: '6557092147530500' });

    await screen.findByLabelText(/^Organisation Name/);
    expect(document.getElementById('si-representativeFaydaId')).toBeInTheDocument();
    // masked on screen by default, like every national-ID field
    expect(document.getElementById('si-representativeFaydaId')).toHaveAttribute('type', 'password');
    expect(document.getElementById('si-representativeFaydaId')).toHaveValue('6557092147530500');
  });

  it('tells an organisation that is still In Review it cannot submit yet', async () => {
    renderPage(ngoUser);
    expect(await screen.findByText('Your organisation is awaiting verification')).toBeInTheDocument();
  });

  it('shows no such notice, and leaves the type editable, for a farmer', async () => {
    renderPage();
    await screen.findByText('Submitter Identity', { selector: 'h3' });
    expect(screen.queryByText('Your organisation is awaiting verification')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Submitter Type/ })).toBeEnabled();
  });
});

describe('SubmitGrievancePage Step 1 prefill from /auth/me', () => {
  const channels = {
    submitterOptions: {
      submitter_types: [{ type_name: 'Individual Farmer', code: 'IND', description: 'Farmer' }],
      submission_types: [
        { type_name: 'IVR Helpline', code: 'IVR', description: '' },
        { type_name: 'Web Portal', code: 'WEB', description: '' },
      ],
      preferred_languages: [],
      service_categories: [],
      grievance_types: [],
    },
  };

  function renderWithUser(user: User) {
    const store = makeStore(channels);
    store.dispatch({ type: loginThunk.fulfilled.type, payload: user });
    return render(
      <Provider store={store}>
        <NextIntlClientProvider locale="en" messages={en}>
          <SubmitGrievancePage />
        </NextIntlClientProvider>
      </Provider>
    );
  }

  const field = (id: string) => document.getElementById(id) as HTMLInputElement;

  it('shows the type, Fayda ID and channel the account was registered with, with nothing in localStorage', async () => {
    localStorage.clear();
    renderWithUser({
      ...mockUser,
      fayda_id: '6557092147530500',
      submitter_type: 'Individual Farmer',
      submission_channel: 'IVR Helpline',
    });

    await waitFor(() => expect(field('submitter-type')).toHaveValue('Individual Farmer'));
    expect(field('submission-channel')).toHaveValue('IVR Helpline');
    expect(field('si-faydaId')).toHaveValue('6557092147530500');
  });

  it('falls back to Web Portal when the account has no channel, and leaves a missing Fayda ID editable', async () => {
    renderWithUser({ ...mockUser, fayda_id: undefined, submitter_type: 'Individual Farmer', submission_channel: undefined });

    await waitFor(() => expect(field('submission-channel')).toHaveValue('Web Portal'));
    expect(field('si-faydaId')).toHaveValue('');
    expect(field('si-faydaId')).toBeEnabled();

    fireEvent.change(field('si-faydaId'), { target: { value: '1234567890123456' } });
    expect(field('si-faydaId')).toHaveValue('1234567890123456');
  });

  it('keeps the channel editable per grievance', async () => {
    renderWithUser({ ...mockUser, submission_channel: 'Web Portal' });
    await waitFor(() => expect(field('submission-channel')).toHaveValue('Web Portal'));

    fireEvent.click(screen.getByRole('option', { name: 'IVR Helpline' }));

    expect(field('submission-channel')).toHaveValue('IVR Helpline');
  });
});
