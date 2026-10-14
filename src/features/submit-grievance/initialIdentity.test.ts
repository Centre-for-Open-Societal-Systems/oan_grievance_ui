import { describe, expect, it } from 'vitest';
import type { User } from '@/features/auth/store/authSlice';
import {
  buildInitialIdentityValues,
  identityAfterReset,
  isSubmitterTypeLocked,
  resolveInitialSubmissionChannel,
  resolveInitialSubmitterType,
} from './initialIdentity';

const FULL_USER: User = {
  email: 'agent@example.com',
  roles: ['Grievance Submitter'],
  full_name: 'Tigist Agent',
  mobile_no: '+251911000000',
  fayda_id: 'ET-FAYDA-111',
  type: 'Individual Farmer',
  submitter_type: 'Individual Farmer',
  submission_channel: 'Web Portal',
};

describe('buildInitialIdentityValues', () => {
  it("prefills Step 1 from the signed-in account for a submitter who files for themselves", () => {
    expect(buildInitialIdentityValues(FULL_USER, null, 'individual')).toEqual({
      fullName: 'Tigist Agent',
      faydaId: 'ET-FAYDA-111',
      phoneCode: '+251',
      phoneNumber: '911000000',
      email: 'agent@example.com',
    });
  });

  it('lets the live account win over the registration snapshot, and keeps snapshot-only fields', () => {
    const saved = {
      submitterType: 'cooperative',
      identityValues: { fullName: 'Stale Name', organizationName: 'Green FPO' },
    };
    const values = buildInitialIdentityValues(FULL_USER, saved, 'cooperative');
    expect(values.fullName).toBe('Tigist Agent');
    expect(values.organizationName).toBe('Green FPO');
  });

  it("prefills nothing for a Development Agent, even though the account has a name, Fayda ID, phone and email", () => {
    // Those keys on the agent's form are the *farmer's* details.
    expect(buildInitialIdentityValues({ ...FULL_USER, type: 'Development Agent' }, null, 'development_agent')).toEqual({});
  });

  it('prefills nothing for a Development Agent even if a registration snapshot exists', () => {
    const saved = { submitterType: 'development_agent', identityValues: { farmerName: 'Someone', faydaId: 'X-1' } };
    expect(buildInitialIdentityValues(FULL_USER, saved, 'development_agent')).toEqual({});
  });

  it('takes the Fayda ID from the account, not the snapshot, and leaves the field empty when the account has none', () => {
    const saved = { submitterType: 'individual', identityValues: { faydaId: '0000000000000000' } };
    const withId = buildInitialIdentityValues({ ...FULL_USER, fayda_id: '6557092147530500' }, saved, 'individual');
    expect(withId.faydaId).toBe('6557092147530500');

    const withoutId = buildInitialIdentityValues({ ...FULL_USER, fayda_id: undefined }, null, 'individual');
    expect(withoutId).not.toHaveProperty('faydaId');
  });

  it('returns an empty object when there is no account and no snapshot', () => {
    expect(buildInitialIdentityValues(null, null, 'individual')).toEqual({});
  });
});

describe('a registered NGO / FPO', () => {
  const ORG_USER: User = {
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
      representativeName: 'Amanuel Tadesse',
      status: 'In Review',
      statusReason: null,
      canFile: false,
    },
  };

  it('starts Step 1 as that organisation: its name, registration number and representative, plus the account contact', () => {
    expect(buildInitialIdentityValues(ORG_USER, null, 'ngo')).toMatchObject({
      orgName: 'Test NGO Org',
      registrationNumber: '1234567890',
      representativeName: 'Amanuel Tadesse',
      phoneCode: '+251',
      phoneNumber: '987654312',
      email: 'test_ngo@gmail.com',
    });
  });

  it('shows the sign-up registration number even before the organisation is registered', () => {
    const signedUp: User = { ...ORG_USER, organisation: undefined, registration_number: 'REG-2024-0042' };
    const values = buildInitialIdentityValues(signedUp, null, 'ngo');
    expect(values.registrationNumber).toBe('REG-2024-0042');
    expect(values).not.toHaveProperty('orgName');
    // Not for anyone filing as something else.
    expect(buildInitialIdentityValues(signedUp, null, 'individual')).not.toHaveProperty('registrationNumber');
  });

  it("falls back to the account's name when the organisation has no representative name", () => {
    const user = { ...ORG_USER, organisation: { ...ORG_USER.organisation!, representativeName: null } };
    expect(buildInitialIdentityValues(user, null, 'ngo').representativeName).toBe('Test NGO');
  });

  it('takes the organisation on record over a stale registration snapshot', () => {
    const saved = { submitterType: 'ngo', identityValues: { orgName: 'Old Name' } };
    expect(buildInitialIdentityValues(ORG_USER, saved, 'ngo').orgName).toBe('Test NGO Org');
  });

  it('never carries a Fayda ID into an organisation — not from an old snapshot, not from the account', () => {
    const saved = {
      submitterType: 'ngo',
      identityValues: { representativeFaydaId: '1234567890123456', faydaId: '1234567890123456' },
    };
    for (const submitterType of ['ngo', 'cooperative']) {
      const values = buildInitialIdentityValues({ ...ORG_USER, fayda_id: 'ET-FAYDA-111' }, saved, submitterType);
      expect(values).not.toHaveProperty('representativeFaydaId');
      expect(values).not.toHaveProperty('faydaId');
    }
  });

  it('still carries the Fayda ID for an individual farmer', () => {
    expect(buildInitialIdentityValues(FULL_USER, null, 'individual').faydaId).toBe('ET-FAYDA-111');
  });

  it('fills the FPO form the same way', () => {
    const fpo = { ...ORG_USER, type: 'FPO', organisation: { ...ORG_USER.organisation!, orgType: 'FPO' } };
    expect(buildInitialIdentityValues(fpo, null, 'cooperative')).toMatchObject({
      orgName: 'Test NGO Org',
      registrationNumber: '1234567890',
    });
  });

  it('adds no organisation fields if Step 1 is on another type, or the user has no organisation', () => {
    expect(buildInitialIdentityValues(ORG_USER, null, 'individual')).not.toHaveProperty('orgName');
    expect(buildInitialIdentityValues({ ...ORG_USER, organisation: undefined }, null, 'ngo')).not.toHaveProperty('orgName');
  });

  it('opens Step 1 on the NGO type, and the type cannot be changed once the organisation is registered', () => {
    expect(resolveInitialSubmitterType(ORG_USER, null)).toBe('ngo');
    expect(isSubmitterTypeLocked(ORG_USER)).toBe(true);
    expect(isSubmitterTypeLocked({ ...ORG_USER, organisation: undefined })).toBe(false);
    expect(isSubmitterTypeLocked(FULL_USER)).toBe(false);
    expect(isSubmitterTypeLocked(null)).toBe(false);
  });
});

describe('resolveInitialSubmitterType', () => {
  it("uses the account's own type when it maps to a known one", () => {
    const withType = (type: string) => ({ ...FULL_USER, type, submitter_type: type });
    expect(resolveInitialSubmitterType(withType('Development Agent'), null)).toBe('development_agent');
    expect(resolveInitialSubmitterType(withType('Individual Farmer'), null)).toBe('individual');
  });

  it('still reads type when the backend sends no submitter_type yet', () => {
    expect(resolveInitialSubmitterType({ ...FULL_USER, type: 'Development Agent', submitter_type: undefined }, null)).toBe(
      'development_agent'
    );
  });

  it("uses the account's submitter_type from /auth/me, in preference to its type", () => {
    const agent = { ...FULL_USER, type: 'Grievance Submitter', submitter_type: 'Development Agent' };
    expect(resolveInitialSubmitterType(agent, null)).toBe('development_agent');

    const typeOnly = { ...FULL_USER, type: undefined, submitter_type: 'Individual Farmer' };
    expect(resolveInitialSubmitterType(typeOnly, null)).toBe('individual');
  });

  it('falls back to the registration snapshot, then to empty', () => {
    const saved = { submitterType: 'ngo', identityValues: {} };
    const unknownType = { ...FULL_USER, type: 'Grievance Submitter', submitter_type: undefined };
    expect(resolveInitialSubmitterType(unknownType, saved)).toBe('ngo');
    expect(resolveInitialSubmitterType(null, null)).toBe('');
  });
});

describe('resolveInitialSubmissionChannel', () => {
  it("maps the account's channel name onto the option value the channel dropdown uses", () => {
    const channelFor = (submission_channel: string) => resolveInitialSubmissionChannel({ ...FULL_USER, submission_channel });
    expect(channelFor('Web Portal')).toBe('web');
    expect(channelFor('Mobile App')).toBe('mobile');
    expect(channelFor('IVR Helpline')).toBe('ivr');
    expect(channelFor('Development Agent Assisted')).toBe('field_officer');
  });

  it('falls back to Web Portal only when the account has no channel', () => {
    expect(resolveInitialSubmissionChannel({ ...FULL_USER, submission_channel: undefined })).toBe('web');
  });

  it('is empty without a signed-in account', () => {
    expect(resolveInitialSubmissionChannel(null)).toBe('');
  });
});

describe('identityAfterReset', () => {
  const identity = { fullName: 'Tigist', faydaId: 'ET-1', phoneNumber: '+251911000000' };

  it('keeps Step 1 for the next grievance, so a returning submitter is not made to retype who they are', () => {
    for (const type of ['individual', 'cooperative', 'ngo', 'woreda_kebele']) {
      expect(identityAfterReset(type, identity)).toBe(identity);
    }
  });

  it('starts a Development Agent blank, because those fields are the last farmer’s details, not the agent’s', () => {
    expect(identityAfterReset('development_agent', identity)).toEqual({});
  });
});
