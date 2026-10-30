"use client";

import { useId, type ReactElement } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { isSelectableMonth } from "../utils/months";
import { CARD_HOVER, CARD_WHITE } from "./cardStyles";

interface TopHeaderProps {
  /** `YYYY-MM`, or "" until the browser has said which month it is. */
  readonly month: string;
  /** Latest month that can be picked (`YYYY-MM`) — the service refuses a future one. */
  readonly maxMonth: string;
  readonly onMonthChange: (month: string) => void;
  /** ISO timestamp the data was last refreshed, once there is data. */
  readonly asOf?: string | null;
}

/** `2026-04` → a date in that month, safe from time-zone shifts. */
function monthStart(month: string): Date | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)) : null;
}

export function TopHeader({ month, maxMonth, onMonthChange, asOf = null }: TopHeaderProps): ReactElement {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const inputId = useId();
  const start = monthStart(month);
  const monthName = start ? format.dateTime(start, { month: "long", year: "numeric", timeZone: "UTC" }) : month;
  const refreshed = asOf && !Number.isNaN(Date.parse(asOf)) ? new Date(asOf) : null;

  return (
    <div className={`${CARD_WHITE} ${CARD_HOVER} p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        {month && <p className="text-gray-500 text-sm mt-2">{t("subtitle", { month: monthName })}</p>}
        {refreshed && (
          <p className="text-gray-400 text-xs mt-1">
            {/* The viewer's own time zone, named, so "12:46 PM" is not mistaken for the server's. */}
            {t("dataAsOf", {
              time: format.dateTime(refreshed, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              }),
            })}
          </p>
        )}
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
            // Clearing the field gives "", and a browser without a month picker (Firefox desktop) lets
            // "2026-1" or a future month through `max`: keep the month on screen rather than ask the
            // service for one it refuses, which would fail the whole page on a keystroke.
            if (isSelectableMonth(event.target.value, maxMonth)) onMonthChange(event.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
    </div>
  );
}
