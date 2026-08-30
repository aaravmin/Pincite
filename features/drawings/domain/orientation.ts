/**
 * The confidence gate on auto-detected drawing views. Assigning a wrong view is worse than
 * assigning none - a mislabeled figure misleads the reader and the Brief Description of the
 * Drawings - so a low-confidence read, or a label that is not one of the standard views,
 * leaves the figure unlabeled for the user to set by hand.
 */

/** Below this the model's guess is discarded. */
export const VIEW_CONFIDENCE_THRESHOLD = 0.45;

export function acceptDetectedView(
  result: { view: string; confidence: number },
  views: readonly string[],
): string {
  return result.view &&
    result.confidence >= VIEW_CONFIDENCE_THRESHOLD &&
    views.includes(result.view)
    ? result.view
    : "";
}
