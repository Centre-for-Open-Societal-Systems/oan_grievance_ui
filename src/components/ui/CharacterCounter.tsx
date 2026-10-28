'use client';

import { useTranslations } from 'next-intl';

interface CharacterCounterProps {
  id: string;
  count: number;
  max: number;
  className?: string;
}

/**
 * "123 / 500" under a long text field. Wire it to the field with
 * `aria-describedby={id}`. It is not a live region on every keystroke — it only
 * announces (polite) once the person is within 10% of the limit, so a screen
 * reader isn't narrating each character.
 */
export function CharacterCounter({ id, count, max, className = '' }: CharacterCounterProps) {
  const t = useTranslations('validation');
  const nearLimit = count >= max * 0.9;
  return (
    <p
      id={id}
      aria-live={nearLimit ? 'polite' : 'off'}
      className={`text-[11px] font-medium tabular-nums ${nearLimit ? 'text-amber-600' : 'text-gray-400'} ${className}`}
    >
      {t('characterCount', { count, max })}
    </p>
  );
}
