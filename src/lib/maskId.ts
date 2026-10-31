/**
 * An ID number with everything but its last four characters replaced by bullets,
 * for showing a government ID on screen without exposing it. A value of four
 * characters or fewer is masked entirely, since showing it would show all of it.
 */
export function maskIdKeepLast4(value: string): string {
  const id = value.trim();
  if (id.length <= 4) return "•".repeat(id.length);
  return "•".repeat(id.length - 4) + id.slice(-4);
}
