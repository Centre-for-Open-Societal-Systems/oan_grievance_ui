import { describe, expect, it } from 'vitest';
import { DEFAULT_SUBMISSION_CHANNEL, registerSubmitterFieldsSchema } from './registerSubmitter';

describe('registerSubmitterFieldsSchema', () => {
  it('accepts a type, a 16-digit Fayda ID and a channel', () => {
    const input = {
      submitter_type: 'Individual Farmer',
      fayda_id: '6557092147530500',
      submission_channel: DEFAULT_SUBMISSION_CHANNEL,
    };
    expect(registerSubmitterFieldsSchema.parse(input)).toEqual(input);
  });

  it('treats all three as optional', () => {
    expect(registerSubmitterFieldsSchema.parse({})).toEqual({});
  });

  it('drops any other key instead of passing it through', () => {
    const parsed = registerSubmitterFieldsSchema.parse({
      fayda_id: '6557092147530500',
      dedupe_key: 'x',
      role: 'Grievance Admin',
    });
    expect(parsed).toEqual({ fayda_id: '6557092147530500' });
  });

  it('rejects a Fayda ID that is not exactly 16 digits, or not text', () => {
    for (const fayda_id of [
      '12345',
      '65570921475305001',
      '6557-0921-4753-0500',
      'ET-FAYDA-344012394',
      '',
      6557092147530500,
    ]) {
      const result = registerSubmitterFieldsSchema.safeParse({ fayda_id });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Fayda ID must be a 16-digit number.');
    }
  });

  it('rejects an unsupported type, and an empty or non-text channel', () => {
    expect(registerSubmitterFieldsSchema.safeParse({ submitter_type: 'Cooperative' }).success).toBe(false);
    for (const submission_channel of ['', '   ', 5, null]) {
      expect(registerSubmitterFieldsSchema.safeParse({ submission_channel }).success).toBe(false);
    }
  });
});
