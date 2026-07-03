import { describe, expect, it } from "vitest";
import { isStale, lastActivityAt } from "./staleness";

const NOW = new Date("2026-07-01T12:00:00.000Z");

function daysAgoISO(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("lastActivityAt", () => {
  it("uses the application date when there are no updates", () => {
    expect(lastActivityAt({ date: "2026-06-01" })).toEqual(new Date("2026-06-01T00:00:00"));
  });

  it("uses the most recent update when there are updates", () => {
    const at = lastActivityAt({
      date: "2026-06-01",
      updates: [
        { at: "2026-06-10T10:00:00.000Z", message: "a" },
        { at: "2026-06-20T10:00:00.000Z", message: "b" },
      ],
    });
    expect(at).toEqual(new Date("2026-06-20T10:00:00.000Z"));
  });
});

describe("isStale (14 days from last activity)", () => {
  it("is stale when the application is 14+ days old and has no updates", () => {
    expect(isStale({ date: "2026-06-10" }, NOW)).toBe(true); // ~21 days
    expect(isStale({ date: "2026-06-25" }, NOW)).toBe(false); // ~6 days
  });

  it("counts from the last update, not the application date", () => {
    const row = { date: "2026-05-01", updates: [{ at: daysAgoISO(3), message: "reciente" }] };
    expect(isStale(row, NOW)).toBe(false); // last activity 3 days ago -> fresh
  });

  it("is stale when the last update is 14+ days old", () => {
    const row = { date: "2026-05-01", updates: [{ at: daysAgoISO(20), message: "viejo" }] };
    expect(isStale(row, NOW)).toBe(true);
  });
});
