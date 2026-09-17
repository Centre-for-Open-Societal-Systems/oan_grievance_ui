export interface SIFormProps {
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  /**
   * Field keys to skip rendering — e.g. ones a caller already collected
   * earlier in its own flow (the register form reuses these components for
   * their per-type fields, but doesn't want Full Name/Phone/Email repeated
   * after already asking for them). Defaults to none.
   */
  hiddenFields?: string[];
}

export interface SIFieldMeta {
  key: string;
  label: string;
  required: boolean;
}
