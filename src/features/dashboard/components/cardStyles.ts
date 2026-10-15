/** Border, radius and shadow of every dashboard card — with no fill, so a tinted card can bring its own. */
export const CARD_BASE =
  "rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)]";

/** The usual white card. */
export const CARD_WHITE = `bg-white ${CARD_BASE}`;

/** The lift the dashboard's cards share on hover. */
export const CARD_HOVER = "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg";
