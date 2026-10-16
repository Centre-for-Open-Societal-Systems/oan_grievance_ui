import { describe, expect, it } from 'vitest';
import { backendSubmitterTypeFor, registrableSubmitterTypeSchema } from './submitterType';

describe('backendSubmitterTypeFor', () => {
  it("maps each supported type to the backend's name for it", () => {
    expect(backendSubmitterTypeFor('individual')).toBe('Individual Farmer');
    expect(backendSubmitterTypeFor('development_agent')).toBe('Development Agent');
  });

  it('registers an NGO as NGO and the UI’s single Cooperative / FPO option as FPO', () => {
    expect(backendSubmitterTypeFor('ngo')).toBe('NGO');
    expect(backendSubmitterTypeFor('cooperative')).toBe('FPO');
  });

  it('leaves a Woreda/Kebele Body, and anything unknown, to the backend default', () => {
    for (const type of ['woreda_kebele', '', 'unknown']) {
      expect(backendSubmitterTypeFor(type)).toBeUndefined();
    }
  });
});

describe('registrableSubmitterTypeSchema', () => {
  it('accepts only the backend names registration supports', () => {
    for (const value of ['Individual Farmer', 'Development Agent', 'NGO', 'FPO']) {
      expect(registrableSubmitterTypeSchema.safeParse(value).success).toBe(true);
    }
    for (const value of ['Cooperative', 'Grievance Admin', 'individual', 'development_agent', '', null, 1]) {
      expect(registrableSubmitterTypeSchema.safeParse(value).success).toBe(false);
    }
  });
});
