// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import type { UserOrganisation } from '@/features/auth/store/authSlice';
import en from '../../../../messages/en.json';
import { OrganisationVerificationNotice } from './OrganisationVerificationNotice';

afterEach(cleanup);

const ORG: UserOrganisation = {
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
};

const renderNotice = (organisation: UserOrganisation | undefined) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OrganisationVerificationNotice organisation={organisation} />
    </NextIntlClientProvider>
  );

describe('OrganisationVerificationNotice', () => {
  it('says an In Review organisation can prepare a grievance but not submit it yet', () => {
    renderNotice(ORG);
    expect(screen.getByRole('status')).toHaveTextContent('Your organisation is awaiting verification');
    expect(screen.getByRole('status')).toHaveTextContent('Test NGO Org is still In Review');
  });

  it("shows a suspended organisation's reason", () => {
    renderNotice({ ...ORG, status: 'Suspended', statusReason: 'Certificate could not be confirmed' });
    expect(screen.getByRole('status')).toHaveTextContent('Your organisation is suspended');
    expect(screen.getByRole('status')).toHaveTextContent('Note from the administrator: Certificate could not be confirmed');
  });

  it('asks an NGO / FPO account with no organisation yet to register it, linking to its own screen', () => {
    const { rerender } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <OrganisationVerificationNotice organisation={undefined} unregisteredKind="ngo" />
      </NextIntlClientProvider>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Register your organisation first');
    expect(screen.getByRole('link', { name: 'Register your organisation' })).toHaveAttribute('href', '/ngo');

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <OrganisationVerificationNotice organisation={undefined} unregisteredKind="fpo" />
      </NextIntlClientProvider>
    );
    expect(screen.getByRole('link', { name: 'Register your organisation' })).toHaveAttribute('href', '/fpo');
  });

  it('renders nothing for an organisation that may file, or for a user with none', () => {
    const { container, rerender } = renderNotice({ ...ORG, status: 'Active', canFile: true });
    expect(container).toBeEmptyDOMElement();
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <OrganisationVerificationNotice organisation={undefined} />
      </NextIntlClientProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
