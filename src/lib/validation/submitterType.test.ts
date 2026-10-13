import { describe, expect, it } from 'vitest';
import { backendSubmitterTypeFor, registrableSubmitterTypeSchema } from './submitterType';

describe('backendSubmitterTypeFor', () => {
  it("maps each supported type to the backend's name for it", () => {
    expect(backendSubmitterTypeFor('individual')).toBe('Individual Farmer');
    expect(backendSubmitterTypeFor('development_agent')).toBe('Development Agent');
  });

  it('leaves the organisation types, which need a registration number, to the backend default', () => {
    for (const type of ['cooperative', 'ngo', 'woreda_kebele', '', 'unknown']) {
      expect(backendSubmitterTypeFor(type)).toBeUndefined();
    }
  });
});

describe('registrableSubmitterTypeSchema', () => {
  it('accepts only the backend names registration supports', () => {
    for (const value of ['Individual Farmer', 'Development Agent']) {
      expect(registrableSubmitterTypeSchema.safeParse(value).success).toBe(true);
    }
    for (const value of ['Cooperative', 'Grievance Admin', 'individual', 'development_agent', '', null, 1]) {
      expect(registrableSubmitterTypeSchema.safeParse(value).success).toBe(false);
    }
  });
});
