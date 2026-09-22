// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { makeStore } from '../testFixtures';
import { SubmitterIdentityCard } from './SubmitterIdentityCard';

afterEach(cleanup);

/** Owns the wizard state the card is controlled by, the way page.tsx does. */
function Harness({
  initialType = '',
  initialChannel = '',
  onNext,
}: {
  initialType?: string;
  initialChannel?: string;
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

function renderCard(props: { initialType?: string; initialChannel?: string } = {}, store = storeWithTypes()) {
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

    // Full Name, Fayda ID, Contact Number — Contact Email is optional.
    expect(screen.getAllByText('This field is required.')).toHaveLength(3);
    expect(byId('si-fullName')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('si-faydaId')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('si-phoneNumber')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('si-email')).not.toHaveAttribute('aria-invalid');
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

  it('rejects a malformed contact email, but leaves it alone when it is empty', () => {
    renderCard({ initialType: 'individual', initialChannel: 'web' });
    const email = byId('si-email');

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);
    expect(screen.getByText('Enter a valid email address, e.g. name@example.com.')).toBeInTheDocument();

    fireEvent.change(email, { target: { value: '' } });
    fireEvent.blur(email);
    expect(screen.queryByText('Enter a valid email address, e.g. name@example.com.')).not.toBeInTheDocument();
  });

  it('advances once every required field for the chosen type is filled in validly', () => {
    const { onNext } = renderCard({ initialType: 'individual', initialChannel: 'web' });

    fireEvent.change(byId('si-fullName'), { target: { value: 'Abebe Kebede' } });
    fireEvent.change(byId('si-faydaId'), { target: { value: '1234567890123456' } });
    fireEvent.change(byId('si-phoneNumber'), { target: { value: '0912345678' } });

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
