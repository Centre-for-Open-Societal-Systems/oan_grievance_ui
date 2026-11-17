"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode, type RefObject } from "react";
import { CARD_WHITE } from "./cardStyles";

/** Marks a dashboard section the pager can move to. */
const WIDGET_ATTRIBUTE = "data-dashboard-widget";

export type WidgetKey = "kpis" | "trend" | "status" | "levels" | "categories" | "recent";

/** Every widget is always rendered (a chart that failed to load stands in as an unavailable section), so the count is fixed. */
const WIDGET_COUNT = 6;

interface DashboardWidgetProps {
  widget: WidgetKey;
  className?: string;
  children: ReactNode;
}

/**
 * One section of the dashboard, reachable from the pager. Focusable (not tabbable) so the
 * pager can move keyboard focus to it, and named so a screen reader says where it landed.
 */
export function DashboardWidget({ widget, className = "", children }: DashboardWidgetProps) {
  const t = useTranslations("dashboard.overview.widgets");
  return (
    <div
      {...{ [WIDGET_ATTRIBUTE]: widget }}
      role="group"
      aria-label={t(widget)}
      tabIndex={-1}
      className={`min-w-0 scroll-mt-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] [&>*]:h-full ${className}`}
    >
      {children}
    </div>
  );
}

interface WidgetPagerProps {
  /** The element holding the dashboard's widgets, in reading order. */
  containerRef: RefObject<HTMLElement | null>;
}

/** Previous / next buttons that move between the dashboard's widgets, scrolling to each and focusing it. */
export function WidgetPager({ containerRef }: WidgetPagerProps) {
  const t = useTranslations("dashboard.overview.widgets");
  const [index, setIndex] = useState(0);

  const widgets = (): HTMLElement[] =>
    Array.from(containerRef.current?.querySelectorAll<HTMLElement>(`[${WIDGET_ATTRIBUTE}]`) ?? []);

  const go = (step: -1 | 1) => {
    const all = widgets();
    const next = Math.min(Math.max(index + step, 0), all.length - 1);
    const target = all[next];
    if (!target) return;
    setIndex(next);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };

  const count = WIDGET_COUNT;
  const button =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]";

  return (
    <nav aria-label={t("navigation")} className={`${CARD_WHITE} flex items-center justify-end gap-3 px-4 py-2`}>
      <span aria-live="polite" className="text-sm text-gray-600">
        {t("position", { current: index + 1, total: count })}
      </span>
      <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label={t("previous")} className={button}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => go(1)} disabled={index >= count - 1} aria-label={t("next")} className={button}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
