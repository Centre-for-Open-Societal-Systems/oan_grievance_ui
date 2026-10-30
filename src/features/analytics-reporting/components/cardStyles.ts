/** Border, radius and shadow of every analytics card. */
export const CARD_WHITE =
  "bg-white rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)]";

/**
 * The lift cards share on hover. Only `transform` is animated (the shadow change is
 * instant), and nothing moves for a viewer who prefers reduced motion.
 */
export const CARD_HOVER =
  "transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0";
