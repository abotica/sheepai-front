/**
 * Split-local calendar date for scheduling digests (Europe/Zagreb).
 */
export function calendarDateZagreb(instant: Date = new Date()): string {
  return instant.toLocaleDateString("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** `YYYY-MM-DD` → Croatian-style day label `17. 5. 2026.` */
export function formatIsoDateHr(isoDate: string): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  if (!y || !mo || !d) return isoDate;
  return `${d}. ${mo}. ${y}.`;
}
