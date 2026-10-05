/**
 * A department response is one block of text on the wire — the action's
 * `reason`, and a response template's `body` — but officers and
 * administrators write it as two parts: what was done, and the outcome for
 * the submitter. These helpers join the two parts under fixed headings and
 * split them back apart, so a template authored in two boxes opens in two
 * boxes again and fills the officer's two boxes when used.
 *
 * The headings are fixed, not translated: they are stored inside templates
 * and must parse the same whatever language the reader's UI is in.
 */
export const ACTION_TAKEN_HEADING = 'Action taken:';
export const RESOLUTION_SUMMARY_HEADING = 'Resolution summary:';

export interface ResponseParts {
  actionTaken: string;
  resolutionSummary: string;
}

export function composeResponseBody({ actionTaken, resolutionSummary }: ResponseParts): string {
  return `${ACTION_TAKEN_HEADING}\n${actionTaken.trim()}\n\n${RESOLUTION_SUMMARY_HEADING}\n${resolutionSummary.trim()}`;
}

/**
 * The inverse of `composeResponseBody`. Text without both headings in order
 * (an older template, or one written by hand) is treated as all summary,
 * since the summary is what the submitter reads.
 */
export function splitResponseBody(body: string | null | undefined): ResponseParts {
  if (!body) {
    return { actionTaken: '', resolutionSummary: '' };
  }
  const actionAt = body.indexOf(ACTION_TAKEN_HEADING);
  const summaryAt = body.indexOf(RESOLUTION_SUMMARY_HEADING, actionAt + 1);
  if (actionAt === -1 || summaryAt === -1) {
    return { actionTaken: '', resolutionSummary: body.trim() };
  }
  return {
    actionTaken: body.slice(actionAt + ACTION_TAKEN_HEADING.length, summaryAt).trim(),
    resolutionSummary: body.slice(summaryAt + RESOLUTION_SUMMARY_HEADING.length).trim(),
  };
}
