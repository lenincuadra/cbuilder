"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow } from "./assets/Arrow";
import { Diana } from "./assets/Diana";
import { motionTokens, registerFor, gapForEvents } from "./motionTokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type ArrowShot = {
  id: number;
  /** Landing position, % of the container box. */
  x: number;
  y: number;
  /** Final stuck angle, deg. */
  restRotation: number;
  /** Horizontal spawn offset, px (always negative — arrows come from the left). */
  ox: number;
  /** How high the arc rises above the landing point at its midpoint, px (negative). */
  peak: number;
  /** Where in [0,1] the arc peaks — off-center so arcs aren't all symmetric humps. */
  peakAt: number;
  delay: number;
  flightMs: number;
};

/** Per-index pseudo-random, offset by a per-mount session seed: stable across
 * re-renders of the same mount (already-landed arrows never reshuffle) but
 * genuinely different from one mount/replay to the next. */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 999.7) * 10000;
  return x - Math.floor(x);
}

// The Diana artwork isn't centered in its own square viewBox — the stand
// pushes the rings up — so landing spots are distributed around the rings'
// actual center, not the box center, or arrows would land in empty air below
// the target.
const RING_CENTER_X = 50;
const RING_CENTER_Y = 38;

// Progress is warped through this power before it drives position, in the
// real sampled path in buildFlightKeyframes below.
const FLIGHT_EASE_IN_POWER = 1.7;

/**
 * `restRotation` (the angle an arrow is left stuck at, in screen deg — 0 =
 * flat/pointing right, 90 = pointing straight down) went through three
 * designs before landing here. Worth keeping this history: the "obvious"
 * options both looked wrong for non-obvious reasons, and it's easy to
 * reintroduce either mistake while touching this code later.
 *
 * 1. **Tangent to the ring** (original): rotate each arrow to lie flush
 *    against the curve of whatever ring it lands on. Reads fine for any
 *    *one* arrow in isolation, but the tangent angle swings wildly with
 *    landing position — near-horizontal at the top/bottom of the ring,
 *    near-vertical at the sides. Since every arrow's actual flight comes
 *    from the same side (see `ox`), arrows landing at different clock
 *    positions ended up stuck at wildly different angles despite having
 *    flown in identically — reported as "the landing point is right, but it
 *    looks like this one fell from below" (screenshot of a near-vertical
 *    arrow, next to several near-horizontal ones).
 * 2. **Blend of a fixed angle and each shot's own "real" arrival angle**
 *    (computed from the flight path's direction one sample before landing):
 *    fixes #1's inconsistency, but the "real" angle turned out to be a bad
 *    signal — thanks to the ease-in (`FLIGHT_EASE_IN_POWER`), the *last*
 *    sample before landing is disproportionately steep/vertical compared to
 *    the flight's overall direction (which is mostly horizontal — `ox`'s
 *    range is 2-3x `peak`'s). So even blended 50/50 with a flat-ish fixed
 *    angle, arrows still read as steeper than they actually flew — "looks
 *    like it fell from above even though the trajectory wasn't like that".
 * 3. **Current: a single near-flat rest angle, plus jitter, full stop** —
 *    no per-shot physics involved. Matched to a reference photo the user
 *    provided of real arrows stuck in a target: all of them lie close to
 *    horizontal and close to parallel to each other, with only minor,
 *    non-systematic variation — not tangent to the target's rings, not
 *    tracking each arrow's individual flight arc. `REST_ANGLE_JITTER_DEG`
 *    was reverse-engineered off that same photo (arrows in it measured
 *    roughly -14deg to +12deg off horizontal).
 */
const BASE_REST_ANGLE_DEG = 0;
const REST_ANGLE_JITTER_DEG = 14;

/**
 * The 5 rings, outermost first, as {min,max} radius (% of the container box)
 * — read off the Diana artwork's own circles. In "funnel" mode each ring is
 * one funnel milestone (see MILESTONE_KEYS in core/registry/types.ts): an
 * arrow lands in the band for how far that application got, sent-only stays
 * on the outer white ring, referral lands in the gold bullseye.
 */
// Scaled to ~71% of the rings' true radius (27-31/21-27/etc.) so even the
// outermost band leaves room for an arrow's half-length before it pokes past
// the diana's edge — see RANDOM_MODE_MAX_RADIUS below for the full
// explanation. Order/spacing is preserved; only the absolute radius shrinks,
// so bands stay visually distinct without exactly hugging their ring's true
// paint (a deliberate trade-off: inside-the-diana beats pixel-perfect ring
// alignment).
const RING_BANDS = [
  { min: 19.2, max: 22 }, // white — sent (baseline: every arrow shown got at least this far)
  { min: 14.9, max: 19.2 }, // dark — responded
  { min: 10.7, max: 14.9 }, // blue — interview
  { min: 6.4, max: 10.7 }, // red — offer
  { min: 0, max: 6.4 }, // gold bullseye — referral
] as const;
// An arrow centered at radius R has endpoints up to R + halfLength from
// center (worst case: an arrow oriented radially, pointing straight out —
// since the rest angle is now ~fixed/near-horizontal (see
// BASE_REST_ANGLE_DEG) rather than tangent to the ring, that worst case does
// happen for arrows landing near the left/right of the ring). 19 leaves
// enough margin for the arrow's half-length at its current (enlarged) size —
// verified visually at `dianaVisualCap` in both random and funnel modes
// (funnel's outer band, RING_BANDS[0].max = 22, is the tighter case and was
// checked too) rather than re-derived algebraically, since the true bulge
// depends on the angle between each arrow's near-fixed rest angle and its
// own landing position's radial direction, which isn't a single clean
// formula any more.
const RANDOM_MODE_MAX_RADIUS = 19;

export type ArrowLandingMode = "random" | "funnel";

function landingSpot(rand: (i: number) => number, i: number, mode: ArrowLandingMode, funnelRank?: number) {
  const theta = rand(i) * Math.PI * 2;
  let radius: number;
  if (mode === "funnel") {
    const band = RING_BANDS[Math.min(RING_BANDS.length - 1, Math.max(0, funnelRank ?? 0))];
    radius = band.min + Math.sqrt(rand(i + 0.5)) * (band.max - band.min);
  } else {
    radius = 3 + Math.sqrt(rand(i + 0.5)) * RANDOM_MODE_MAX_RADIUS;
  }
  return {
    x: RING_CENTER_X + Math.cos(theta) * radius,
    y: RING_CENTER_Y + Math.sin(theta) * radius,
    theta,
  };
}

function buildShots(count: number, mode: ArrowLandingMode, funnelRanks: number[] | undefined, sessionSeed: number): ArrowShot[] {
  const visualCount = Math.min(count, motionTokens.dianaVisualCap);
  if (visualCount <= 0) return [];
  const register = registerFor(count);
  const rand = (i: number) => seededRandom(i + sessionSeed);

  const groupSize = register === "volley" ? motionTokens.volleySize : register === "rain" ? Math.max(6, Math.ceil(visualCount / 2)) : 1;
  const groups = Math.ceil(visualCount / groupSize);
  const groupGap = gapForEvents(groups);

  const shots: ArrowShot[] = [];
  for (let i = 0; i < visualCount; i++) {
    const groupIndex = Math.floor(i / groupSize);
    const withinGroup = i % groupSize;
    const delay = Math.round(groupIndex * groupGap + withinGroup * 18);
    const { x, y } = landingSpot(rand, i, mode, funnelRanks?.[i]);
    const ox = -Math.round(170 + rand(i + 0.1) * 110);
    const peak = -Math.round(45 + rand(i + 0.6) * 65);
    const peakAt = 0.32 + rand(i + 0.85) * 0.3;
    // See BASE_REST_ANGLE_DEG above for why this isn't derived from the
    // flight path or the landing ring.
    const jitter = -REST_ANGLE_JITTER_DEG + rand(i + 0.25) * (2 * REST_ANGLE_JITTER_DEG);

    shots.push({
      id: i,
      x,
      y,
      restRotation: BASE_REST_ANGLE_DEG + jitter,
      ox,
      peak,
      peakAt,
      delay,
      flightMs: Math.round(motionTokens.flightDurationMin + rand(i + 0.15) * (motionTokens.flightDurationMax - motionTokens.flightDurationMin)),
    });
  }
  return shots;
}

/**
 * Ballistic arc, sampled directly (not via a CSS easing curve on top of a
 * hand-picked midpoint — that's what made earlier passes look kinked/floaty).
 * Horizontal motion is linear-in-progress (constant "velocity" once warped
 * through the ease-in above); vertical follows a real parabola around
 * `peakAt`, so it *also* decelerates into the apex and accelerates back down
 * — arriving at full speed and just stopping, not gliding to a halt.
 * Rotation is the actual tangent of the path at each sample, so the nose
 * always leads the direction of travel; the final frame is forced flat
 * (0deg) so the visible angle lands exactly on `restRotation` (applied by
 * the static outer wrapper).
 *
 * The outer wrapper's `rotate(restRotation)` is applied unconditionally,
 * from the very first frame — not eased in — so it rotates this element's
 * whole local coordinate system for the entire flight, not just the resting
 * pose. Landing angles are spread around the full ring, so left uncorrected
 * this drags each arrow's path around by a different amount depending on
 * where it lands (a path built to arrive "from the left" ends up swooping in
 * from below/above/the right for anything not landing near the top or
 * bottom) — the reported "spiral". Counter-rotating the sampled path by
 * `-restRotation` here cancels that ancestor rotation out, so every arrow's
 * *visual* approach direction stays the same regardless of where it lands;
 * only the final resting angle (still owned by the wrapper) differs.
 */
function buildFlightKeyframes(shot: ArrowShot): Keyframe[] {
  const samples = 16;
  const restRad = (shot.restRotation * Math.PI) / 180;
  const cos = Math.cos(restRad);
  const sin = Math.sin(restRad);
  const points = Array.from({ length: samples }, (_, k) => {
    const t = k / (samples - 1);
    const te = Math.pow(t, FLIGHT_EASE_IN_POWER);
    const worldX = shot.ox * (1 - te);
    const distFromPeak = te < shot.peakAt ? (shot.peakAt - te) / shot.peakAt : (te - shot.peakAt) / (1 - shot.peakAt);
    const worldH = shot.peak * (1 - distFromPeak * distFromPeak);
    // Counter-rotate into the wrapper's frame (inverse of its rotate(restRotation)).
    const x = worldX * cos + worldH * sin;
    const h = worldH * cos - worldX * sin;
    return { t, x, h };
  });

  return points.map((p, i) => {
    const isLast = i === points.length - 1;
    const next = points[i + 1] ?? p;
    const deg = isLast ? 0 : (Math.atan2(next.h - p.h, next.x - p.x) * 180) / Math.PI;
    return {
      offset: p.t,
      opacity: p.t < 0.06 ? p.t / 0.06 : 1,
      transform: `translate(${p.x.toFixed(1)}px, ${p.h.toFixed(1)}px) rotate(${deg.toFixed(1)}deg)`,
    };
  });
}

/**
 * Scene 1 — a CV sent, plotted as an arrow landing on the target. See
 * docs/animations.md §2. `mode: "funnel"` needs `funnelRanks` — one entry per
 * arrow (same order/length as the count that produced it), each 0-4 indexing
 * MILESTONE_KEYS (sent/responded/interview/offer/referral); computed by the
 * caller's adapter, never read from `core/registry` in here.
 */
export function ArrowToTarget({
  count,
  mode = "random",
  funnelRanks,
  onDone,
  className,
}: {
  count: number;
  mode?: ArrowLandingMode;
  funnelRanks?: number[];
  onDone?: () => void;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  // SSR-safe: `null` on the first pass so server and client render the same
  // (arrow-less) markup, then rerolls client-side right after mount. Stable
  // across later re-renders of the same mount (a growing `count` doesn't
  // reshuffle arrows already on the board), but a fresh value — and so a
  // genuinely different layout — every time the scene remounts.
  //
  // Deliberately `null`, not a fixed placeholder number like 0: `shots`
  // below must render as empty (no shots at all) until the real seed lands.
  // The flight-scheduling effect keys its "already started" bookkeeping
  // (`animatedIds`) by `shot.id` alone, not by the shot's actual values — if
  // a placeholder seed produced a real (0-length or not) `shots` array that
  // got scheduled, those ids would be marked "animated" against the
  // placeholder's numbers, and the effect would then skip them forever once
  // the real seed's `shots` (same ids, different random values) came in on
  // the next render. That desync is exactly what caused arrows to fly in
  // from the wrong side / on a rotation that didn't match where they
  // actually land — the wrapper's resting rotation would update to the real
  // seed, but the flight path animating into it was still built from the
  // placeholder's numbers.
  const [sessionSeed, setSessionSeed] = useState<number | null>(null);
  useEffect(() => {
    // Math.random() can only run client-side without a hydration mismatch —
    // there's no non-effect way to get a fresh value right after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionSeed(Math.random() * 10000);
  }, []);
  const shots = useMemo(() => (sessionSeed === null ? [] : buildShots(count, mode, funnelRanks, sessionSeed)), [count, mode, funnelRanks, sessionSeed]);
  const visualCount = shots.length;
  const totalFlightDuration = shots.length ? Math.max(...shots.map((s) => s.delay + s.flightMs)) : 0;

  // Reset the animated tally when `count` changes, following React's "adjust
  // state during render" pattern instead of an effect — keeps this a plain
  // render-time derivation rather than a setState-in-effect cascade.
  const [prevCount, setPrevCount] = useState(count);
  const [animatedCount, setAnimatedCount] = useState(0);
  if (count !== prevCount) {
    setPrevCount(count);
    setAnimatedCount(0);
  }
  const displayCount = reducedMotion ? count : animatedCount;

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const animatedIds = useRef<Set<number>>(new Set());
  const animations = useRef<Animation[]>([]);

  // Play each shot's flight exactly once via the Web Animations API — no new
  // dependency, just the native browser API, but it lets the arc be sampled
  // from a real parabola per-shot instead of a fixed set of CSS keyframes.
  // No cleanup here on purpose: `shots` growing (count going up) must not
  // cancel/restart arrows that already started or landed.
  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;
    for (const shot of shots) {
      if (animatedIds.current.has(shot.id)) continue;
      const el = container.querySelector<HTMLElement>(`[data-shot-id="${shot.id}"]`);
      if (!el) continue;
      animatedIds.current.add(shot.id);
      const anim = el.animate(buildFlightKeyframes(shot), {
        duration: shot.flightMs,
        delay: shot.delay,
        easing: "linear",
        fill: "forwards",
      });
      animations.current.push(anim);
    }
  }, [shots, reducedMotion]);

  // Unmount-only cleanup, deliberately on its own empty-deps effect so it
  // never fires just because `shots` changed. It clears *both* refs (not
  // just cancelling the animations) so React Strict Mode's dev-only
  // mount→cleanup→remount dance self-heals: the immediate remount re-runs
  // the effect above, finds `animatedIds` empty again, and recreates the
  // animations it just lost — instead of leaving shots marked "done" with no
  // actual Animation behind them.
  useEffect(() => {
    return () => {
      animations.current.forEach((a) => a.cancel());
      animations.current = [];
      // Intentionally reading .current live at cleanup time, not a
      // mount-time snapshot — it must reflect whatever the scheduling
      // effect has accumulated by then.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      animatedIds.current.clear();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      doneRef.current?.();
      return;
    }

    const tickDuration = 500;
    const grandTotal = totalFlightDuration + (count > visualCount ? tickDuration : 0);
    const start = performance.now();
    let raf = 0;
    let fired = false;

    const step = () => {
      const elapsed = performance.now() - start;

      if (elapsed <= totalFlightDuration) {
        const landed = shots.reduce((n, s) => (elapsed >= s.delay + s.flightMs ? n + 1 : n), 0);
        setAnimatedCount(landed);
      } else if (count > visualCount) {
        const t = Math.min(1, (elapsed - totalFlightDuration) / tickDuration);
        setAnimatedCount(Math.round(visualCount + (count - visualCount) * t));
      } else {
        setAnimatedCount(visualCount);
      }

      if (elapsed < grandTotal) {
        raf = requestAnimationFrame(step);
      } else if (!fired) {
        fired = true;
        setAnimatedCount(count);
        doneRef.current?.();
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // `shots` (not just `count`) is a real dependency here, not an
    // exhaustive-deps false positive: `shots` is empty on the very first
    // client render (see `sessionSeed` above) and only gets its real,
    // randomized values a render later. Without `shots` in this list, the
    // counter tick loop launched on mount would capture that placeholder
    // (empty) closure — landing count stuck at 0, `totalFlightDuration`
    // stuck at 0 — and never re-sync once the real shots (and their real
    // flight animations) actually show up, decoupling the tally from what's
    // on screen.
  }, [count, reducedMotion, shots, totalFlightDuration, visualCount]);

  return (
    <div className={className}>
      <div className="relative aspect-square w-full" ref={containerRef}>
        <Diana className="h-full w-full" />
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="absolute"
            style={{
              left: `${shot.x}%`,
              top: `${shot.y}%`,
              transform: `translate(-50%, -50%) rotate(${shot.restRotation}deg)`,
            }}
          >
            <div data-shot-id={shot.id} style={reducedMotion ? undefined : { opacity: 0 }}>
              <Arrow className="h-[29px] w-[106px]" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {displayCount} CV{displayCount === 1 ? "" : "s"} enviado{displayCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
