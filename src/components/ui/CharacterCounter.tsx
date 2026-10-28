'use client';

import { useTranslations } from 'next-intl';

interface CharacterCounterProps {
  readonly id: string;
  readonly count: number;
  readonly max: number;
  readonly className?: string;
}

/**
 * "123 / 500" under a long text field. Wire it to the field with
 * `aria-describedby`, so the limit is read when the field is focused.
 *
 * The visible count never announces itself — a live region per keystroke would
 * narrate every character. A separate status region, always mounted so screen
 * readers register it, stays empty until the person is within 10% of the limit
 * and then says how many characters remain.
 */
export function CharacterCounter({ id, count, max, className = '' }: CharacterCounterProps) {
  const t = useTranslations('validation');
  const nearLimit = count >= max * 0.9;
  return (
    <>
      <p
        id={id}
        className={`text-[11px] font-medium tabular-nums ${nearLimit ? 'text-amber-600' : 'text-gray-400'} ${className}`}
      >
        {t('characterCount', { count, max })}
      </p>
      <span role="status" aria-atomic="true" className="sr-only">
        {nearLimit ? t('charactersRemaining', { count: Math.max(0, max - count) }) : ''}
      </span>
    </>
  );
}
