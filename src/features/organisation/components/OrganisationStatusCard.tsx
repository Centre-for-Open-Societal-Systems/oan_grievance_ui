'use client';

import { CheckCircle2, Clock, PauseCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Organisation, OrganisationStatus } from '../api/organisationApi';

const STATUS_PRESENTATION: Record<
  OrganisationStatus,
  { key: 'inReview' | 'active' | 'suspended'; icon: typeof Clock; tone: string }
> = {
  'In Review': { key: 'inReview', icon: Clock, tone: 'bg-amber-50 text-amber-600 border-amber-200' },
  Active: { key: 'active', icon: CheckCircle2, tone: 'bg-green-50 text-green-600 border-green-200' },
  Suspended: { key: 'suspended', icon: PauseCircle, tone: 'bg-red-50 text-red-600 border-red-200' },
};

/**
 * Where a registered organisation stands: In Review until a platform
 * administrator activates it, then Active (and free to file grievances), or
 * Suspended. Shown instead of the registration form once one exists.
 */
export function OrganisationStatusCard({ organisation }: { organisation: Organisation }) {
  const t = useTranslations('organisation');
  const { key, icon: Icon, tone } = STATUS_PRESENTATION[organisation.status];

  const details: Array<[label: string, value: string | null]> = [
    [t('status.details.legalName'), organisation.legalName],
    [t('status.details.brandName'), organisation.brandName],
    [t('status.details.entityType'), organisation.entityType],
    [t('status.details.registrationNumber'), organisation.registrationNumber],
    [t('status.details.status'), t(`status.${key}.badge`)],
  ];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8" aria-labelledby="organisation-status-title">
      <div className="flex items-start gap-4">
        <span className={`shrink-0 w-12 h-12 rounded-full border flex items-center justify-center ${tone}`}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </span>
        <div>
          <h2 id="organisation-status-title" className="text-xl font-bold text-gray-900">
            {t(`status.${key}.title`)}
          </h2>
          <p className="mt-1 text-[14px] text-gray-600 font-medium leading-relaxed">{t(`status.${key}.body`)}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-6">
        {details
          .filter((detail): detail is [string, string] => Boolean(detail[1]))
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="mt-1 text-[15px] font-medium text-gray-900 break-words">{value}</dd>
            </div>
          ))}
      </dl>

      {organisation.statusReason && organisation.status !== 'Active' && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">{t('status.details.reason')}</p>
          <p className="mt-1 text-[14px] font-medium text-gray-800 break-words">{organisation.statusReason}</p>
        </div>
      )}

      {organisation.status === 'Active' && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/submit-grievance"
            className="inline-flex items-center h-11 px-5 rounded-[12px] bg-[#16A34A] text-white text-sm font-bold hover:bg-green-700 transition-colors"
          >
            {t('status.active.submit')}
          </Link>
          <Link
            href="/all-grievances"
            className="inline-flex items-center h-11 px-5 rounded-[12px] border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('status.active.track')}
          </Link>
        </div>
      )}
    </section>
  );
}
