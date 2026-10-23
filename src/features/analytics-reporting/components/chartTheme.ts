import { CARD_HOVER, CARD_WHITE } from "./cardStyles";

/**
 * What the analytics cards and charts share, so one look is changed in one place.
 * Class names are written out in full so Tailwind sees them.
 */

/** Series and status colours. */
export const CHART_COLORS = {
  received: "#3b82f6",
  resolved: "#10b981",
  resolvedStroke: "#16a34a",
  receivedFill: "#eef6fd",
  axisText: "#6B7280",
  axisTextSlate: "#64748b",
  grid: "#F1F3F4",
  cursorFill: "#f8fafc",
  cursorStroke: "#e2e8f0",
  polarGrid: "#E5E7EB",
  legendText: "#475569",
} as const;

/** Entry-animation lengths, in milliseconds. Not played at all when the viewer prefers reduced motion. */
export const ANIMATION_MS = {
  bars: 1200,
  area: 1500,
} as const;

/** The frame of a chart card, with the lift it shares on hover. */
export const CHART_CARD = `${CARD_WHITE} ${CARD_HOVER} flex flex-col h-full`;

export const CHART_CARD_HEADER = "px-6 py-5 border-b border-[#E5E7EB]";
export const CHART_CARD_TITLE = "text-[16px] font-bold text-gray-900 tracking-tight";

/** The floating box a chart shows on hover. */
export const TOOLTIP_BOX =
  "bg-white p-3 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-35 z-50";
export const TOOLTIP_TITLE = "text-gray-900 font-semibold text-[13px] mb-2 pb-2 border-b border-[#F1F3F4]";

/** Room a chart is given. */
export const CHART_MIN_HEIGHT = "min-h-95";
export const CHART_HEIGHT = "h-95";
export const SKELETON_KPI_HEIGHT = "h-32.5";
export const SKELETON_CHART_HEIGHT = "h-115";

export const AXIS_TICK = { fontSize: 11, fill: CHART_COLORS.axisText, fontWeight: 500 } as const;
