import type { GrievanceSummaryCard } from '../types';

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const MORE_INFO_STATUSES = new Set(['more info needed', 'require more info', 'more info']);

export const MORE_INFO_STATUS = 'More Info Needed';

const isInProgress = (card: GrievanceSummaryCard) => normalizeStatus(card.status) === 'in progress';
const isMoreInfo = (card: GrievanceSummaryCard) => MORE_INFO_STATUSES.has(normalizeStatus(card.status));

/** Whether the In Progress card exists but the summary has no More Info card, so its count has to be fetched. */
export function needsMoreInfoCount(cards: GrievanceSummaryCard[]): boolean {
  return cards.some(isInProgress) && !cards.some(isMoreInfo);
}

/**
 * Folds More Info Needed into the In Progress card: its count becomes the sum, with the two parts listed under
 * it, and a separate More Info card (an older service sends one) is dropped so it is not counted twice.
 *
 * `moreInfoCount` is used when the summary has no More Info card of its own; null means it could not be read,
 * so the card keeps its own count and shows a dash for the missing part rather than a made-up zero.
 */
export function withInProgressBreakdown(
  cards: GrievanceSummaryCard[],
  moreInfoCount: number | null
): GrievanceSummaryCard[] {
  const inProgress = cards.find(isInProgress);
  if (!inProgress) return cards;

  const moreInfoCard = cards.find(isMoreInfo);
  const moreInfo = moreInfoCard ? moreInfoCard.count : moreInfoCount;

  return cards
    .filter((card) => card !== moreInfoCard)
    .map((card) =>
      card === inProgress
        ? {
            ...card,
            count: card.count + (moreInfo ?? 0),
            breakdown: [
              { label: card.label, count: card.count },
              { label: moreInfoCard?.label ?? MORE_INFO_STATUS, count: moreInfo },
            ],
          }
        : card
    );
}

/** Sort KPI cards by backend-provided display order. */
export function sortSummaryCards(cards: GrievanceSummaryCard[]): GrievanceSummaryCard[] {
  return [...cards].sort((a, b) => a.order - b.order);
}

/**
 * Total for the page header: prefer the "All" card count,
 * otherwise fall back to the first card (after sort) or 0.
 */
export function resolveSummaryTotalCount(cards: GrievanceSummaryCard[]): number {
  const allCard = cards.find((card) => card.status.toLowerCase() === 'all');
  return allCard?.count ?? cards[0]?.count ?? 0;
}
