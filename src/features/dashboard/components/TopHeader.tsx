"use client";

import { useTranslations } from "next-intl";
import { CARD_HOVER, CARD_WHITE } from "./cardStyles";

export function TopHeader() {
  const t = useTranslations("dashboard.overview");

  return (
    <div className={`${CARD_WHITE} ${CARD_HOVER} p-6`}>
      <h1 className="text-[22px] font-bold text-[#111827]">{t("title")}</h1>
      <p className="text-sm text-gray-500 mt-1.5">{t("subtitle")}</p>
    </div>
  );
}
