import { splitPhoneNumber } from '@/lib/validation/phone';
import { DEFAULT_COUNTRY } from '../config';
import { ORGANISATION_FIELDS, type OrganisationValues } from './validation';

/** The slice of the signed-in account the form pre-fills from. */
export interface ContactSource {
  email: string;
  mobile_no?: string;
  country_code?: string;
  phone_number?: string;
}

/**
 * The form's starting values: Ethiopia as the country, and the representative's
 * own sign-in email and mobile as the organisation's first contact — editable,
 * since a work email or office line may differ. Same phone sources, in the same
 * order, as Submit Grievance's pre-fill (`buildInitialIdentityValues`).
 */
export function buildInitialOrganisationValues(user: ContactSource | null): OrganisationValues {
  const values = Object.fromEntries(ORGANISATION_FIELDS.map((field) => [field, ''])) as OrganisationValues;
  values.phoneCode = '+251';
  values.country = DEFAULT_COUNTRY;
  if (!user) return values;

  values.email = user.email;
  if (user.phone_number) {
    values.phoneNumber = user.phone_number;
    values.phoneCode = user.country_code || '+251';
  } else if (user.mobile_no) {
    const parsed = splitPhoneNumber(user.mobile_no);
    values.phoneCode = parsed.phoneCode;
    values.phoneNumber = parsed.phoneNumber;
  }
  return values;
}
