"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CARD_WHITE } from "./cardStyles";

interface SectionUnavailableProps {
  readonly onRetry: () => void;
  readonly className?: string;
}

/** Stands in for one section whose chart could not be built — never an empty chart or zeros. */
export function SectionUnavailable({ onRetry, className = "" }: SectionUnavailableProps): ReactElement {
  const t = useTranslations("analytics");

  return (
    <div role="alert" className={`${CARD_WHITE} flex flex-col items-center justify-center gap-2 p-6 text-center ${className}`}>
      <p className="text-sm text-red-600">{t("sectionUnavailable")}</p>
      <button type="button" onClick={onRetry} className="text-sm font-semibold underline">
        {t("retry")}
      </button>
    </div>
  );
}
