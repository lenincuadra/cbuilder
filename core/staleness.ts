import type { RegistryRow } from "./registry/types";

/** Days without activity before a row is flagged as needing attention (2 weeks). */
export const STALE_AFTER_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ActivityFields = Pick<RegistryRow, "date" | "updates">;

/**
 * The row's last activity date: the most recent follow-up update, or the
 * application date if there are no updates.
 */
export function lastActivityAt(row: ActivityFields): Date {
  const updates = row.updates ?? [];
  if (updates.length > 0) {
    const latest = updates.reduce((a, b) => (a.at >= b.at ? a : b));
    return new Date(latest.at);
  }
  return new Date(`${row.date}T00:00:00`);
}

/**
 * Whether the row has had no activity for STALE_AFTER_DAYS — i.e. it is probably
 * time to ask for feedback or close the search. `now` is injected for testing.
 */
export function isStale(row: ActivityFields, now: Date): boolean {
  const days = (now.getTime() - lastActivityAt(row).getTime()) / MS_PER_DAY;
  return days >= STALE_AFTER_DAYS;
}
