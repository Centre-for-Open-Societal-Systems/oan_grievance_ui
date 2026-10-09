"use client";

import { useTranslations } from 'next-intl';

export function TopHeader() {
  const t = useTranslations('admin.header');
  return (
    <div className="bg-white rounded-xl p-6 font-sans border border-[#F1F3F4]">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
      <p className="text-[15px] text-gray-500 font-medium">
        {t('description')}
      </p>
    </div>
  );
}
