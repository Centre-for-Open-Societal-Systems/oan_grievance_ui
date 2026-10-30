import { describe, expect, it } from 'vitest';
import { generateRandomPassword, validatePassword } from './password';

describe('generateRandomPassword', () => {
  it('always satisfies validatePassword, across many runs', () => {
    for (let i = 0; i < 50; i++) {
      expect(validatePassword(generateRandomPassword())).toBeNull();
    }
  });

  it('honors a custom length', () => {
    expect(generateRandomPassword(20)).toHaveLength(20);
  });

  it('is not the same password twice in a row', () => {
    expect(generateRandomPassword()).not.toBe(generateRandomPassword());
  });

  it('never includes visually-confusable characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRandomPassword()).not.toMatch(/[0O1lI]/);
    }
  });
});

describe('validatePassword length', () => {
  it('accepts a password up to the backend maximum of 128 characters', () => {
    expect(validatePassword(`Aa1!${'x'.repeat(124)}`)).toBeNull();
  });

  it('rejects one character past 128, naming the real bounds', () => {
    expect(validatePassword(`Aa1!${'x'.repeat(125)}`)).toBe('Password must be between 8 and 128 characters long.');
  });
});
