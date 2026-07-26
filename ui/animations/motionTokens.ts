/** Shared motion constants for the animation scenes. See docs/animations.md §5. */
export const motionTokens = {
  /** Total time budget for the arrow scene, independent of N. */
  tMax: 3000,
  /** Gap between arrows with small N (aimed shots). */
  gapMax: 500,
  /** Floor for the gap in barrage mode (never 0, so shots stay discrete). */
  gapMin: 60,
  /** End of the literal 1:1 register. */
  t1: 8,
  /** End of the volley register. */
  t2: 30,
  /** Arrows fired together per volley in the 9–30 register. */
  volleySize: 4,
  /** Max arrows actually drawn stuck in the target; the rest is covered by the counter. */
  dianaVisualCap: 40,
  /** Duration of one hammer-strike loop cycle. */
  hammerCycle: 1500,
  /** Range for a single arrow's flight time, ms — each shot picks its own value so a batch doesn't move in lockstep. ~20% faster than the original 253-360. */
  flightDurationMin: 211,
  flightDurationMax: 300,
} as const;

/** N -> visual register, per docs/animations.md §2 "Mapeo por registros". */
export type ArrowRegister = "idle" | "literal" | "volley" | "rain";

export function registerFor(count: number): ArrowRegister {
  if (count <= 0) return "idle";
  if (count <= motionTokens.t1) return "literal";
  if (count <= motionTokens.t2) return "volley";
  return "rain";
}

/**
 * Sublinear gap so the time budget holds regardless of how many discrete
 * "shot events" there are (see §2 "Presupuesto de tiempo fijo"). `events` is
 * the number of sequential beats to spread across `tMax` — individual arrows
 * in the literal register, volleys in the volley register, sweeps in rain.
 */
export function gapForEvents(events: number): number {
  const { tMax, gapMin, gapMax } = motionTokens;
  const gap = tMax / Math.sqrt(Math.max(1, events));
  return Math.min(gapMax, Math.max(gapMin, gap));
}
