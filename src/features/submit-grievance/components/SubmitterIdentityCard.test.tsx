// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { makeStore } from '../testFixtures';

const fetchSubmitterOptions = vi.fn();
vi.mock('@/features/metadata/api/metadataApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/metadata/api/metadataApi')>()),
  fetchSubmitterOptions: (...args: unknown[]) => fetchSubmitterOptions(...args),
}));
import { SubmitterIdentityCard } from './SubmitterIdentityCard';

afterEach(cleanup);

/** Owns the wizard state the card is controlled by, the way page.tsx does. */
function Harness({
  initialType = '',
  initialChannel = '',
  profile,
  onNext,
}: {
  initialType?: string;
  initialChannel?: string;
  profile?: { submitterType: string; submissionChannel: string };
  onNext: () => void;
}) {
  const [submitterType, setSubmitterType] = useState(initialType);
  const [submissionChannel, setSubmissionChannel] = useState(initialChannel);
  const [identityValues, setIdentityValues] = useState<Record<string, string>>({});

  // Mirrors page.tsx's handleSubmitterTypeChange: switching type drops
  // whatever was entered for the previous type's fields.
  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SubmitterIdentityCard
      onNext={onNext}
      submitterType={submitterType}
      setSubmitterType={handleSubmitterTypeChange}
      submissionChannel={submissionChannel}
      setSubmissionChannel={setSubmissionChannel}
      identityValues={identityValues}
      setIdentityValue={setIdentityValue}
      profileSubmitterType={profile?.submitterType}
      profileSubmissionChannel={profile?.submissionChannel}
    />
  );
}

/** A store whose submitter-type list covers both types these tests switch between. */
function storeWithTypes() {
  return makeStore({
    submitterOptions: {
      submitter_types: [
        { type_name: 'Individual Farmer', code: 'IND', description: 'Farmer' },
        { type_name: 'Development Agent', code: 'DA', description: 'Agent' },
      ],
      submission_types: [{ type_name: 'Web Portal', code: 'WEB', description: '' }],
      preferred_languages: [],
      service_categories: [],
      grievance_types: [],
    },
  });
}

function renderCard(
  props: { initialType?: string; initialChannel?: string; profile?: { submitterType: string; submissionChannel: string } } = {},
  store = storeWithTypes()
) {
  const onNext = vi.fn();
  render(
    <Provider store={store}>
      <NextIntlClientProvider locale="en" messages={en}>
        <Harness {...props} onNext={onNext} />
      </NextIntlClientProvider>
    </Provider>
  );
  return { onNext };
}

const saveAndContinue = () => fireEvent.click(screen.getByRole('button', { name: /Save & Continue/ }));
const byId = (id: string) => document.getElementById(id)!;

describe('Step 1 — inline validation', () => {
  it('flags the submitter type and submission channel when neither is chosen, and does not advance', () => {
    const { onNext } = renderCard();

    saveAndContinue();

    expect(screen.getAllByText('This field is required.')).toHaveLength(2);
    expect(byId('submitter-type')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('submission-channel')).toHaveAttribute('aria-invalid', 'true');
    expect(onNext).not.toHaveBeenCalled();
  });

  it('requires the Individual Farmer type-specific fields once that type is picked', () => {
    const { onNext } = renderCard({ initialType: 'individual', initialChannel: 'web' });

    saveAndContinue();

    // Full Name, Fayda ID, Contact Number and Contact Email ID.
    expect(screen.getAllByText('This field is required.')).toHaveLength(4);
    expect(byId('si-fullName')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('si-faydaId')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('si-phoneNumber')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('si-email')).toHaveAttribute('aria-invalid', 'true');
    expect(onNext).not.toHaveBeenCalled();
  });

  it('rejects a Fayda ID that is not exactly 16 digits, and clears the message once it is', () => {
    renderCard({ initialType: 'individual', initialChannel: 'web' });
    const faydaInput = byId('si-faydaId');

    fireEvent.change(faydaInput, { target: { value: '12345' } });
    fireEvent.blur(faydaInput);
    expect(screen.getByText('Enter a valid Fayda ID: exactly 16 digits.')).toBeInTheDocument();

    fireEvent.change(faydaInput, { target: { value: '1234567890123456' } });
    expect(screen.queryByText('Enter a valid Fayda ID: exactly 16 digits.')).not.toBeInTheDocument();
  });

  it('marks the contact email required, and rejects a malformed one', () => {
    renderCard({ initialType: 'individual', initialChannel: 'web' });
    const email = byId('si-email');

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);
    expect(screen.getByText('Enter a valid email address, e.g. name@example.com.')).toBeInTheDocument();

    // Empty is now a missing required field, not a malformed one.
    fireEvent.change(email, { target: { value: '' } });
    fireEvent.blur(email);
    expect(screen.queryByText('Enter a valid email address, e.g. name@example.com.')).not.toBeInTheDocument();
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
    expect(screen.getByText('Contact Email ID', { selector: 'label' }).textContent).toContain('*');
  });

  it('advances once every required field for the chosen type is filled in validly', () => {
    const { onNext } = renderCard({ initialType: 'individual', initialChannel: 'web' });

    fireEvent.change(byId('si-fullName'), { target: { value: 'Abebe Kebede' } });
    fireEvent.change(byId('si-faydaId'), { target: { value: '1234567890123456' } });
    fireEvent.change(byId('si-phoneNumber'), { target: { value: '0912345678' } });
    fireEvent.change(byId('si-email'), { target: { value: 'abebe@example.com' } });

    saveAndContinue();

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('This field is required.')).not.toBeInTheDocument();
  });
});

describe('Step 1 — switching submitter type', () => {
  it('shows the Development Agent fields instead of the Individual Farmer ones', () => {
    renderCard({ initialType: 'individual', initialChannel: 'web' });

    fireEvent.click(screen.getByRole('option', { name: 'Development Agent' }));

    expect(screen.getByText('Farmer Name (on behalf of)')).toBeInTheDocument();
    expect(screen.queryByText('Full Name')).not.toBeInTheDocument();
  });

  it('clears the previous type’s validation errors when the type changes', () => {
    renderCard({ initialType: 'individual', initialChannel: 'web' });

    saveAndContinue();
    expect(screen.getAllByText('This field is required.').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('option', { name: 'Development Agent' }));

    expect(screen.queryByText('This field is required.')).not.toBeInTheDocument();
  });
});

describe('Step 1 — submission channel', () => {
  const noChannels = {
    submitterOptions: {
      submitter_types: [{ type_name: 'Individual Farmer', code: 'IND', description: 'Farmer' }],
      submission_types: [],
      preferred_languages: [],
      service_categories: [],
      grievance_types: [],
    },
  };

  it('has no clear (×) button on the required channel field, though the type field keeps its own', () => {
    renderCard({ initialType: 'individual', initialChannel: 'web' });

    const channel = byId('submission-channel').closest('div')!.parentElement!;
    expect(within(channel).queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear selection' })).toHaveLength(1);
  });

  it('says so, and offers a retry, when the options request failed', async () => {
    fetchSubmitterOptions.mockRejectedValue(new Error('boom'));
    const store = makeStore({ ...noChannels, submitterOptionsStatus: 'failed', submitterOptionsError: 'boom' });
    renderCard({ initialType: 'individual' }, store);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the submission channels.");
    fetchSubmitterOptions.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fetchSubmitterOptions).toHaveBeenCalledTimes(1);
  });

  it('tries again once on its own when it opens after an earlier failure, and fills the list in', async () => {
    fetchSubmitterOptions.mockResolvedValue({
      ...noChannels.submitterOptions,
      submission_types: [{ type_name: 'Web Portal', code: 'WEB', description: '' }],
    });
    const store = makeStore({ ...noChannels, submitterOptionsStatus: 'failed', submitterOptionsError: 'boom' });
    renderCard({ initialType: 'individual', initialChannel: 'web' }, store);

    await waitFor(() => expect(store.getState().metadata.submitterOptionsStatus).toBe('succeeded'));
    expect(fetchSubmitterOptions).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('still shows the account’s own submitter type and channel while the options are unavailable', async () => {
    fetchSubmitterOptions.mockRejectedValue(new Error('boom'));
    const store = makeStore({ submitterOptions: null, submitterOptionsStatus: 'failed', submitterOptionsError: 'boom' });
    renderCard(
      {
        initialType: 'individual',
        initialChannel: 'web',
        profile: { submitterType: 'Individual Farmer', submissionChannel: 'Web Portal' },
      },
      store
    );

    expect(byId('submitter-type')).toHaveValue('Individual Farmer');
    expect(byId('submission-channel')).toHaveValue('Web Portal');
    await screen.findByRole('alert');
  });

  it('says so when the request succeeded with no channels at all', () => {
    renderCard({ initialType: 'individual' }, makeStore(noChannels));

    expect(screen.getByRole('alert')).toHaveTextContent('No submission channels are available right now.');
  });

  it('shows no message while the channels are there, or still loading', () => {
    renderCard({ initialType: 'individual' });
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    cleanup();
    renderCard({ initialType: 'individual' }, makeStore({ ...noChannels, submitterOptionsStatus: 'loading' }));
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
