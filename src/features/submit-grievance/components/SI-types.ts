export interface SIFormProps {
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
}

export interface SIFieldMeta {
  key: string;
  label: string;
  required: boolean;
}
