"use client";

import { useTranslations } from "next-intl";
import { CARD_WHITE } from "./cardStyles";

interface SectionUnavailableProps {
  onRetry: () => void;
  /** A retry is already in flight: the button stays put (so focus is not lost) but does nothing. */
  isRetrying?: boolean;
  className?: string;
}

/** Stands in for one section whose chart could not be built — never an empty chart or zeros. */
export function SectionUnavailable({ onRetry, isRetrying = false, className = "" }: SectionUnavailableProps) {
  const t = useTranslations("dashboard.overview");

  return (
    <div role="alert" className={`${CARD_WHITE} flex flex-col items-center justify-center gap-2 p-6 text-center ${className}`}>
      <p className="text-sm text-red-600">{t("sectionUnavailable")}</p>
      <button
        type="button"
        aria-disabled={isRetrying}
        onClick={isRetrying ? undefined : onRetry}
        className="text-sm font-semibold underline"
      >
        {isRetrying ? t("retrying") : t("retry")}
      </button>
    </div>
  );
}
