export interface PasswordRule {
  /** Shown in the checklist under a password field. */
  label: string;
  message: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: ReadonlyArray<PasswordRule> = [
  {
    label: 'At least 8 characters',
    message: 'Password must be between 8 and 64 characters long.',
    test: (value) => value.length >= 8 && value.length <= 64,
  },
  {
    label: 'A letter',
    message: 'Password must contain at least 1 letter.',
    test: (value) => /[A-Za-z]/.test(value),
  },
  {
    label: 'A number',
    message: 'Password must contain at least 1 number.',
    test: (value) => /\d/.test(value),
  },
  {
    label: 'A symbol',
    message: 'Password must contain at least 1 special character.',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

/** Returns the message for the first unmet rule, or null if `value` satisfies all of them. */
export function validatePassword(value: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? failed.message : null;
}
