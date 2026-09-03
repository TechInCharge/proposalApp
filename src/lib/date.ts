/**
 * Date-only helpers. A proposal date has no time component, so we anchor it to
 * noon UTC — that keeps `toISOString().slice(0, 10)` stable in every timezone.
 */

export function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "yyyy-mm-dd" (from a date input) -> Date at noon UTC. */
export function parseDateInput(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

/** Date -> "yyyy-mm-dd". */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
