"use client";

import { useId } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CARD_HOVER, CARD_WHITE } from "./cardStyles";

interface TopHeaderProps {
  /** `YYYY-MM`. */
  month: string;
  /** Latest month that can be picked (`YYYY-MM`) — the service refuses a future one. */
  maxMonth: string;
  onMonthChange: (month: string) => void;
}

/** `2026-04` → a date in that month, safe from time-zone shifts. */
function monthStart(month: string): Date | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)) : null;
}

export function TopHeader({ month, maxMonth, onMonthChange }: TopHeaderProps) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const inputId = useId();
  const start = monthStart(month);
  const monthName = start ? format.dateTime(start, { month: "long", year: "numeric", timeZone: "UTC" }) : month;

  return (
    <div className={`${CARD_WHITE} ${CARD_HOVER} p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-gray-500 text-sm mt-2">{t("subtitle", { month: monthName })}</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-xs font-semibold text-gray-600">
          {t("monthLabel")}
        </label>
        <input
          id={inputId}
          type="month"
          value={month}
          max={maxMonth}
          required
          onChange={(event) => {
            // Clearing the field gives "": keep the month on screen rather than ask the service for none.
            if (event.target.value) onMonthChange(event.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
    </div>
  );
}
