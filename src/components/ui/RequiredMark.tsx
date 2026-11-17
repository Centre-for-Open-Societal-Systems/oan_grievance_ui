'use client';

import { useTranslations } from 'next-intl';

/**
 * The asterisk shown after a mandatory field's label. The glyph is hidden from
 * assistive technology (a screen reader would read it as "star"); the visually
 * hidden "required" is what is announced, as part of the label.
 */
export function RequiredMark({ className = 'text-red-500' }: { className?: string }) {
  const t = useTranslations('validation');
  return (
    <>
      <span aria-hidden="true" className={className}>
        *
      </span>
      <span className="sr-only"> {t('required')}</span>
    </>
  );
}
