// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';

const registerOrganisation = vi.fn();
const getMyOrganisation = vi.fn();

vi.mock('../api/organisationApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/organisationApi')>()),
  registerOrganisation: (...args: unknown[]) => registerOrganisation(...args),
  getMyOrganisation: (...args: unknown[]) => getMyOrganisation(...args),
}));

import { ApiError } from '@/lib/api/fetchApi';
import type { OrganisationKind } from '@/lib/organisationKind';
import { buildInitialOrganisationValues } from '../lib/defaults';
import { OrganisationRegistrationForm } from './OrganisationRegistrationForm';

afterEach(cleanup);

function renderForm(kind: OrganisationKind = 'ngo') {
  const onRegistered = vi.fn();
  const onBackToSignIn = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OrganisationRegistrationForm
        kind={kind}
        initialValues={buildInitialOrganisationValues({ email: 'rep@greenhighlands.org' })}
        onRegistered={onRegistered}
        onBackToSignIn={onBackToSignIn}
      />
    </NextIntlClientProvider>
  );
  return { onRegistered, onBackToSignIn };
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const registerButton = () => screen.getByRole('button', { name: /Register Organization/ });

function fillValidForm(entityType: string) {
  type(/^Legal entity name/, 'Green Highlands Development Association');
  fireEvent.click(screen.getByRole('option', { name: entityType }));
  type(/^Tax registration number/, '0012345678');
  type(/^Street address/, 'Bole Road, Block 4');
  type(/^Zone/, 'Addis Ababa');
  type(/^Region/, 'Addis Ababa');
  type(/^Postal code/, '1000');
  type(/^Phone/, '0911234567');
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('OrganisationRegistrationForm', () => {
  beforeEach(() => {
    registerOrganisation.mockResolvedValue(undefined);
    getMyOrganisation.mockResolvedValue(null);
  });
  afterEach(() => vi.clearAllMocks());

  it('lays out the three sections of the reference design', () => {
    renderForm();
    for (const heading of ['Organisation', 'Registered Address', 'Contact Details']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    for (const label of [
      /^Legal entity name/,
      /^Brand \/ display name/,
      /^Entity type/,
      /^Tax registration number/,
      /^Street address/,
      /^Kebele \/ Village/,
      /^Woreda \/ District/,
      /^Zone/,
      /^Region/,
      /^Country\s*\*/,
      /^Postal code/,
      /^Website/,
      /^Work email/,
      /^Phone/,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('starts with Ethiopia, the +251 dial code and the signed-in email', () => {
    renderForm();
    expect(screen.getByLabelText(/^Country\s*\*/)).toHaveValue('Ethiopia');
    expect(screen.getByLabelText(/^Work email/)).toHaveValue('rep@greenhighlands.org');
    expect(screen.getByRole('button', { name: /Country code, Ethiopia \+251/ })).toBeInTheDocument();
  });

  it('keeps Register disabled until the consent is ticked', () => {
    renderForm();
    expect(registerButton()).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(registerButton()).toBeEnabled();
  });

  it('reports every missing required field at once, focuses the first, and sends nothing', () => {
    renderForm();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(registerButton());

    expect(screen.getAllByText('This field is required.')).toHaveLength(8);
    expect(screen.getByLabelText(/^Legal entity name/)).toHaveFocus();
    expect(screen.getByLabelText(/^Legal entity name/)).toHaveAttribute('aria-invalid', 'true');
    expect(registerOrganisation).not.toHaveBeenCalled();
  });

  it('checks a field when it loses focus and clears the message once it is fixed', () => {
    renderForm();
    const tax = screen.getByLabelText(/^Tax registration number/);

    fireEvent.change(tax, { target: { value: '123' } });
    fireEvent.blur(tax);
    expect(screen.getByText(/Enter 9 or 10 letters or numbers/)).toBeInTheDocument();

    fireEvent.change(tax, { target: { value: '0012345678' } });
    expect(screen.queryByText(/Enter 9 or 10 letters or numbers/)).not.toBeInTheDocument();
  });

  it('offers NGO entity types on the NGO screen and FPO ones on the FPO screen', () => {
    renderForm('ngo');
    expect(screen.getByRole('option', { name: 'Local NGO' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Cooperative Union' })).not.toBeInTheDocument();
    cleanup();

    renderForm('fpo');
    expect(screen.getByRole('option', { name: 'Cooperative Union' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Local NGO' })).not.toBeInTheDocument();
  });

  it('registers an NGO with the backend contract and hands back the record it answers with', async () => {
    registerOrganisation.mockResolvedValue({
      id: 'ORG-0001',
      legalName: 'Green Highlands Development Association',
      brandName: null,
      orgType: 'NGO',
      entityType: 'Local NGO',
      registrationNumber: 'ET12345678',
      status: 'In Review',
      statusReason: null,
    });
    const { onRegistered } = renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    await waitFor(() => expect(onRegistered).toHaveBeenCalledTimes(1));
    expect(registerOrganisation).toHaveBeenCalledWith({
      legal_name: 'Green Highlands Development Association',
      org_type: 'NGO',
      entity_type: 'Local NGO',
      tax_registration_number: '0012345678',
      street_address: 'Bole Road, Block 4',
      zone: 'Addis Ababa',
      region: 'Addis Ababa',
      country: 'Ethiopia',
      postal_code: '1000',
      contact_email: 'rep@greenhighlands.org',
      contact_phone: '+251911234567',
    });
    expect(getMyOrganisation).not.toHaveBeenCalled();
    expect(onRegistered.mock.calls[0]![0]).toMatchObject({ id: 'ORG-0001', status: 'In Review' });
  });

  it('registers an FPO as org_type FPO', async () => {
    renderForm('fpo');
    fillValidForm('Primary Cooperative');
    fireEvent.click(registerButton());

    await waitFor(() => expect(registerOrganisation).toHaveBeenCalledTimes(1));
    expect(registerOrganisation.mock.calls[0]![0]).toMatchObject({
      org_type: 'FPO',
      entity_type: 'Primary Cooperative',
    });
  });

  it('still shows the organisation as In Review if the backend answers with nothing readable', async () => {
    registerOrganisation.mockResolvedValue(null);
    const { onRegistered } = renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    await waitFor(() => expect(onRegistered).toHaveBeenCalledTimes(1));
    expect(onRegistered.mock.calls[0]![0]).toMatchObject({
      legalName: 'Green Highlands Development Association',
      orgType: 'NGO',
      status: 'In Review',
    });
  });

  it('puts a backend rule broken on one field under that field, in plain words, and keeps what was typed', async () => {
    registerOrganisation.mockRejectedValue(
      new ApiError('Validation failed', { code: 'VALIDATION_ERROR', details: { postal_code: 'Value error, Postal code is not valid.' } }, 400)
    );
    const { onRegistered } = renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    expect(await screen.findByText('Postal code is not valid.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Postal code/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Postal code/)).toHaveFocus();
    expect(onRegistered).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Legal entity name/)).toHaveValue('Green Highlands Development Association');
    expect(registerButton()).toBeEnabled();
  });

  it('shows a rule only the backend can check (no field named) as an alert', async () => {
    registerOrganisation.mockRejectedValue(
      new ApiError('Entity type "Cooperative Union" is not valid for an NGO.', { details: {} }, 400)
    );
    renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Entity type "Cooperative Union" is not valid for an NGO.');
  });

  it('shows the organisation that already exists if the account has registered one (409, e.g. a second tab)', async () => {
    registerOrganisation.mockRejectedValue(
      new ApiError('Your account already represents a registered organization.', { code: 'DUPLICATE_ENTRY' }, 409)
    );
    const existing = {
      id: 'ORG-0001',
      legalName: 'Green Highlands Development Association',
      brandName: null,
      orgType: 'NGO',
      entityType: 'Local NGO',
      registrationNumber: 'ET12345678',
      status: 'In Review',
      statusReason: null,
    };
    getMyOrganisation.mockResolvedValue(existing);
    const { onRegistered } = renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    await waitFor(() => expect(onRegistered).toHaveBeenCalledWith(existing));
  });

  it('says so under the number when the registration number is already taken (409, no organisation of its own)', async () => {
    registerOrganisation.mockRejectedValue(
      new ApiError("An organization with registration number '0012345678' is already registered.", { code: 'DUPLICATE_ENTRY' }, 409)
    );
    getMyOrganisation.mockResolvedValue(null);
    const { onRegistered } = renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    expect(await screen.findByText(/already registered/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Tax registration number/)).toHaveAttribute('aria-invalid', 'true');
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it.each([
    ['FORBIDDEN', 'Your account is not permitted to register an organisation.'],
    ['CONNECTION', 'We could not reach the server. Please try again in a moment.'],
  ])('turns the bare %s sentinel into a readable alert', async (sentinel, message) => {
    registerOrganisation.mockRejectedValue(new Error(sentinel));
    renderForm('ngo');
    fillValidForm('Local NGO');
    fireEvent.click(registerButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByText(sentinel)).not.toBeInTheDocument();
  });

  it('sends Back to the sign-in handler', () => {
    const { onBackToSignIn } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }));
    expect(onBackToSignIn).toHaveBeenCalledTimes(1);
  });
});
