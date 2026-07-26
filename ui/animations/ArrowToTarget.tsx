"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, type ArrowPalette } from "./assets/Arrow";
import { Diana } from "./assets/Diana";
import { motionTokens, registerFor, gapForEvents } from "./motionTokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type ArrowShot = {
  id: number;
  /** Landing position, % of the container box. */
  x: number;
  y: number;
  /** Which ring band it lands in (0 = outer/white/sent … 4 = gold bullseye/
   * referral) — see RING_BANDS. Drives the "landed" paint color, in both
   * funnel mode (where it's just the funnel rank) and random mode (derived
   * from the landing radius, since the physical rings are the same target
   * regardless of mode). */
  ringIndex: number;
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
  /** Copied from ArrowTuning.easeInPower at build time, so buildFlightKeyframes
   * doesn't need the whole tuning object threaded through separately. */
  easeInPower: number;
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

// The Arrow asset's own native size (its SVG viewBox rendered 1:1), before
// ArrowTuning.arrowScalePct scales it.
const ARROW_BASE_WIDTH_PX = 88;
const ARROW_BASE_HEIGHT_PX = 24;

// Where the arrowhead's actual point sits — "where it touches the target" —
// expressed as a fraction of the rendered box, used to anchor+pivot each
// shot on its tip instead of its bounding-box center (see the render below).
// Two things make this need real math instead of just reading the tip's
// raw (x,y) off the SVG's viewBox: (1) the viewBox (0 0 160 56, see
// assets/Arrow.tsx) isn't the same aspect ratio as the box it's rendered
// into (160:56 ≈ 2.86:1 vs 88:24 ≈ 3.67:1) — the browser's default
// `preserveAspectRatio="xMidYMid meet"` fits it by the *constraining*
// dimension (here, height) and centers it with empty margin on the other
// axis (here, ~9.7px on each side at the base size), rather than stretching
// it edge to edge; (2) that margin is a fraction of the *box*, not of the
// viewBox, so it has to be folded in — using the tip's raw viewBox fraction
// (150.1/160 ≈ 93.8%) lands short of where the tip actually renders
// (verified empirically with a zero-rotation shot + SVGPoint.matrixTransform
// against getScreenCTM(): true fraction ≈ 84.2%, not 93.8%). Both fractions
// below are scale-invariant (arrowScalePct multiplies width/height equally,
// so the ratios don't move), so this only needs computing once, not per
// render or per arrowScalePct value.
const ARROW_VIEWBOX_WIDTH = 160;
const ARROW_VIEWBOX_HEIGHT = 56;
// The arrowhead's rightmost vertex — see the triangle path in
// assets/Arrow.tsx ("M121.3 13.65L126.9 28.25L121.1 42.35L150.1 28.25
// L121.3 13.65Z").
const ARROW_TIP_VIEWBOX_X = 150.1;
const ARROW_TIP_VIEWBOX_Y = 28.25;
const ARROW_FIT_SCALE = Math.min(ARROW_BASE_WIDTH_PX / ARROW_VIEWBOX_WIDTH, ARROW_BASE_HEIGHT_PX / ARROW_VIEWBOX_HEIGHT);
const ARROW_FIT_MARGIN_X = (ARROW_BASE_WIDTH_PX - ARROW_VIEWBOX_WIDTH * ARROW_FIT_SCALE) / 2;
const ARROW_FIT_MARGIN_Y = (ARROW_BASE_HEIGHT_PX - ARROW_VIEWBOX_HEIGHT * ARROW_FIT_SCALE) / 2;
const ARROW_TIP_X_PCT = `${(((ARROW_FIT_MARGIN_X + ARROW_TIP_VIEWBOX_X * ARROW_FIT_SCALE) / ARROW_BASE_WIDTH_PX) * 100).toFixed(3)}%`;
const ARROW_TIP_Y_PCT = `${(((ARROW_FIT_MARGIN_Y + ARROW_TIP_VIEWBOX_Y * ARROW_FIT_SCALE) / ARROW_BASE_HEIGHT_PX) * 100).toFixed(3)}%`;

/**
 * Every tunable "feel" knob for this scene, gathered in one place so
 * `/dev/animations` can expose a live control for each of them (see that
 * page for the actual playground UI). Passing no `tuning` prop at all to
 * `ArrowToTarget` reproduces `DEFAULT_ARROW_TUNING` below exactly — these
 * *are* the production values, not separate defaults.
 *
 * Several of these went through multiple iterations that each looked
 * reasonable and turned out wrong for non-obvious reasons — see the long
 * comment on `DEFAULT_ARROW_TUNING` for the full history before changing a
 * default, so a "fix" doesn't silently reintroduce a previously-rejected
 * look.
 */
export type ArrowTuning = {
  /** Range for a single arrow's flight time, ms — each shot picks its own
   * value so a batch doesn't move in lockstep. */
  flightDurationMinMs: number;
  flightDurationMaxMs: number;
  /** Flight progress (0-1) is warped through `t ** easeInPower` before it
   * drives position. 1 = linear/constant speed; >1 = starts slow and
   * accelerates, arriving at full speed and simply stopping on landing. */
  easeInPower: number;
  /** Horizontal spawn offset range, px — arrows always spawn this far to
   * the left of their landing point, in world space (see the
   * counter-rotation note on buildFlightKeyframes for why "world space"
   * matters, not local/rotated space). */
  spawnOffsetMinPx: number;
  spawnOffsetMaxPx: number;
  /** How high the flight arcs above a straight line from spawn to landing, px. */
  arcHeightMinPx: number;
  arcHeightMaxPx: number;
  /** Where in [0,1] of (eased) progress the arc peaks — off-center so arcs
   * aren't all symmetric humps. */
  arcPeakAtMin: number;
  arcPeakAtMax: number;
  /** The angle (screen deg — 0 = flat/pointing right, 90 = pointing
   * straight down) an arrow is left stuck at, before jitter. */
  restAngleBaseDeg: number;
  /** Random +/- range added to restAngleBaseDeg per arrow, so they don't
   * all look like identical clones. */
  restAngleJitterDeg: number;
  /** Rendered arrow size, as % of the source asset's native size
   * (ARROW_BASE_WIDTH_PX x ARROW_BASE_HEIGHT_PX). */
  arrowScalePct: number;
  /** Max arrows actually drawn stuck in the target; past this the count
   * text ticks up on its own instead of drawing more arrows. */
  dianaVisualCap: number;
  /** Max landing radius in "random" mode, % of the container box — keeps
   * arrow tips inside the diana's outer edge. */
  randomModeMaxRadiusPct: number;
};

/**
 * Production defaults. Three of these fields (`restAngleBaseDeg` /
 * `restAngleJitterDeg`, and `arcHeightMinPx` / `arcHeightMaxPx`) carry real
 * design history worth reading before touching them again:
 *
 * **Rest angle** went through three designs:
 * 1. *Tangent to the ring* (original) — rotate each arrow to lie flush
 *    against the curve of whatever ring it lands on. Reads fine for any
 *    *one* arrow in isolation, but the tangent angle swings wildly with
 *    landing position — near-horizontal at the top/bottom of the ring,
 *    near-vertical at the sides. Since every arrow's actual flight comes
 *    from the same side (`spawnOffset*`), arrows landing at different clock
 *    positions ended up stuck at wildly different angles despite having
 *    flown in identically — reported as "the landing point is right, but it
 *    looks like this one fell from below" (screenshot: one near-vertical
 *    arrow next to several near-horizontal ones).
 * 2. *Blend of a fixed angle and each shot's own "real" arrival angle*
 *    (computed from the flight path's direction one sample before landing)
 *    — fixes #1's inconsistency, but the "real" angle turned out to be a
 *    bad signal: thanks to the ease-in (`easeInPower`), the *last* sample
 *    before landing is disproportionately steep/vertical compared to the
 *    flight's overall direction (which is mostly horizontal —
 *    `spawnOffset*`'s range is several times `arcHeight*`'s). So even
 *    blended 50/50 with a flat-ish fixed angle, arrows still read as
 *    steeper than they actually flew — "looks like it fell from above even
 *    though the trajectory wasn't like that".
 * 3. *Current: a single near-flat rest angle, plus jitter, full stop* — no
 *    per-shot physics involved. Matched to a reference photo the user
 *    provided of real arrows stuck in a target: all of them lie close to
 *    horizontal and close to parallel to each other, with only minor,
 *    non-systematic variation. `restAngleJitterDeg: 14` was
 *    reverse-engineered off that same photo (arrows in it measured roughly
 *    -14deg to +12deg off horizontal).
 *
 * **Arc height** was originally 45-110 (a visible lob — the arrow rises
 * well above the flight line before diving down). Once the rest angle above
 * went near-flat, that tall arc no longer matched: the flight would swoop
 * up and dive steeply right before snapping flat on landing. Dropped to
 * 10-25 after user feedback with an annotated screenshot (a tall arc marked
 * wrong, a nearly flat one with just a gentle bow marked right) — the whole
 * flight should read as close to horizontal end to end, not just the final
 * pose.
 *
 * `randomModeMaxRadiusPct: 19` — an arrow centered at radius R has endpoints
 * up to R + halfLength from center in the worst case (an arrow oriented
 * radially, pointing straight out — which does happen now that the rest
 * angle is ~fixed/near-horizontal rather than tangent to the ring, for
 * arrows landing near the left/right of the ring). 19 leaves enough margin
 * for the arrow's half-length at its current (enlarged) size — verified
 * visually at `dianaVisualCap` in both random and funnel modes (funnel's
 * outer band tops out at radius 22, the tighter case, and was checked too)
 * rather than re-derived algebraically, since the true bulge depends on the
 * angle between each arrow's near-fixed rest angle and its own landing
 * position's radial direction, which isn't a single clean formula any more.
 */
export const DEFAULT_ARROW_TUNING: ArrowTuning = {
  flightDurationMinMs: motionTokens.flightDurationMin,
  flightDurationMaxMs: motionTokens.flightDurationMax,
  easeInPower: 1.7,
  spawnOffsetMinPx: 170,
  spawnOffsetMaxPx: 280,
  arcHeightMinPx: 10,
  arcHeightMaxPx: 25,
  arcPeakAtMin: 0.32,
  arcPeakAtMax: 0.62,
  restAngleBaseDeg: 0,
  restAngleJitterDeg: 14,
  arrowScalePct: 120,
  dianaVisualCap: motionTokens.dianaVisualCap,
  randomModeMaxRadiusPct: 19,
};

/**
 * The 5 rings, outermost first, as {min,max} radius (% of the container box)
 * — read off the Diana artwork's own circles. In "funnel" mode each ring is
 * one funnel milestone (see MILESTONE_KEYS in core/registry/types.ts): an
 * arrow lands in the band for how far that application got, sent-only stays
 * on the outer white ring, referral lands in the gold bullseye.
 *
 * Not part of ArrowTuning/the playground: these are tied to the Diana
 * artwork's actual painted rings (scaled ~71% of their true radius so even
 * the outermost band leaves room for an arrow's half-length before it pokes
 * past the diana's edge — see randomModeMaxRadiusPct above for the same
 * margin reasoning), not a "feel" knob worth exposing as a slider.
 */
const RING_BANDS = [
  { min: 19.2, max: 22 }, // white — sent (baseline: every arrow shown got at least this far)
  { min: 14.9, max: 19.2 }, // dark — responded
  { min: 10.7, max: 14.9 }, // blue — interview
  { min: 6.4, max: 10.7 }, // red — offer
  { min: 0, max: 6.4 }, // gold bullseye — referral
] as const;

/** How long every shot sits landed-but-gray before the whole group paints
 * together (see the `paintedIds` effect) — a deliberate beat to actually
 * look at the impact, not a "feel" knob worth exposing as a slider. */
const PAINT_REVEAL_PAUSE_MS = 450;

/**
 * "Raw" arrow, in flight — light gray, the same for every shot regardless of
 * where it's headed, so the outcome color only shows up once it actually
 * lands. Feathers/head/shaft all use this one flat gray family: the point is
 * an unpainted arrow, not a themed one.
 */
const UNPAINTED_ARROW_PALETTE: ArrowPalette = {
  fill: "#C7C9CC",
  fillLight: "#E2E3E5",
  fillDark: "#A6A8AC",
  shaftFill: "#B3B5B8",
  line: "#5B5D61",
};

/**
 * "Landed" palettes, one per ring in RING_BANDS/MILESTONE_KEYS order —
 * "the arrow gets painted the color it touched" (docs/animations.md §2). Each
 * `fill` matches that ring's own paint in `assets/Diana.tsx` exactly, so an
 * arrow visually belongs to the ring it's stuck in; the other four fields
 * are hand-picked per color rather than algorithmically lightened/darkened —
 * a flat tint/shade reads muddy on some of these hues (the white ring in
 * particular needs an off-white the highlight facet can still stand out
 * against, and the near-black ring needs real lift on `fillLight` or its
 * highlight facet disappears). Treat these as a first pass, not final —
 * verify color by color against the actual artwork before assuming one is
 * right.
 */
const RING_ARROW_PALETTES: ArrowPalette[] = [
  // 0 — sent (outer white ring)
  { fill: "#F2F1EC", fillLight: "#FFFFFF", fillDark: "#D6D4C9", shaftFill: "#C7C5BB", line: "#8A8578" },
  // 1 — responded (dark ring)
  { fill: "#4B4B4E", fillLight: "#6E6E72", fillDark: "#232325", shaftFill: "#3A3A3D", line: "#141414" },
  // 2 — interview (blue ring)
  { fill: "#30ABE2", fillLight: "#6FC6ED", fillDark: "#1C7DA8", shaftFill: "#2489B8", line: "#0F4C66" },
  // 3 — offer (red ring)
  { fill: "#DF3C38", fillLight: "#EE6F63", fillDark: "#A8231F", shaftFill: "#B92E29", line: "#5C120F" },
  // 4 — referral (gold bullseye)
  { fill: "#DAA737", fillLight: "#EFC868", fillDark: "#A8791F", shaftFill: "#C1922B", line: "#5C4310" },
];

/** Which RING_BANDS index a given landing radius physically falls in —
 * shared by both modes: funnel mode already knows its band via funnelRank,
 * but random mode only ever computes a radius, and the target's rings are
 * the same physical circles either way. Checked innermost-out since bands
 * are listed outer-first; radii past the outermost band (possible in the
 * dev playground, where `randomModeMaxRadiusPct` can go well past 22) fall
 * back to the outer ring rather than going unmatched. */
function ringIndexForRadius(radius: number): number {
  for (let i = RING_BANDS.length - 1; i >= 0; i--) {
    if (radius <= RING_BANDS[i].max) return i;
  }
  return 0;
}

export type ArrowLandingMode = "random" | "funnel";

// RING_BANDS and randomModeMaxRadiusPct's margins were tuned/verified
// visually against a *center*-anchored arrow, where the worst-case overhang
// past the landing point is half the arrow's length (an arrow oriented
// radially, anchored at its middle). Anchoring shots on the arrowhead's tip
// instead (see ARROW_TIP_X_PCT and the render below) changed that worst
// case: nothing overhangs *forward* of the tip anymore (the part that
// determines which ring it's colored for is now exactly where it visually
// sits), but nearly the whole arrow can trail *behind* it in one direction —
// close to ARROW_TIP_X_PCT's own fraction of the length (~84%), not 50%.
// Deliberately *not* re-shrinking the landing radius to compensate (like
// this guard already does for oversized `arrowScalePct`): the radius is what
// keeps the tip inside its correct ring band in the first place, so pulling
// it inward to make room for the tail trades a real bug (tip in the wrong
// ring, contradicting its own color) for a cosmetic one (a shaft trailing
// past the diana's outer edge on some shots) — and a trailing shaft reads as
// a real arrow stuck near the target's boundary, not as broken. Left as-is;
// this guard still exists for genuinely oversized `arrowScalePct` (the
// playground's slider goes well past any size these margins were checked
// against — screenshot at the slider's max, 250%), a no-op at/under the
// production baseline (120%, `DEFAULT_ARROW_TUNING.arrowScalePct`).
function oversizeRadiusGuard(arrowScalePct: number): number {
  return Math.min(1, DEFAULT_ARROW_TUNING.arrowScalePct / arrowScalePct);
}

function landingSpot(
  rand: (i: number) => number,
  i: number,
  mode: ArrowLandingMode,
  funnelRank: number | undefined,
  randomModeMaxRadiusPct: number,
  arrowScalePct: number,
) {
  const theta = rand(i) * Math.PI * 2;
  let radius: number;
  let ringIndex: number;
  if (mode === "funnel") {
    ringIndex = Math.min(RING_BANDS.length - 1, Math.max(0, funnelRank ?? 0));
    const band = RING_BANDS[ringIndex];
    radius = band.min + Math.sqrt(rand(i + 0.5)) * (band.max - band.min);
  } else {
    radius = 3 + Math.sqrt(rand(i + 0.5)) * randomModeMaxRadiusPct;
    ringIndex = ringIndexForRadius(radius);
  }
  radius *= oversizeRadiusGuard(arrowScalePct);
  return {
    x: RING_CENTER_X + Math.cos(theta) * radius,
    y: RING_CENTER_Y + Math.sin(theta) * radius,
    theta,
    ringIndex,
  };
}

function buildShots(count: number, mode: ArrowLandingMode, funnelRanks: number[] | undefined, sessionSeed: number, tuning: ArrowTuning): ArrowShot[] {
  const visualCount = Math.min(count, tuning.dianaVisualCap);
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
    const { x, y, ringIndex } = landingSpot(rand, i, mode, funnelRanks?.[i], tuning.randomModeMaxRadiusPct, tuning.arrowScalePct);
    const ox = -Math.round(tuning.spawnOffsetMinPx + rand(i + 0.1) * (tuning.spawnOffsetMaxPx - tuning.spawnOffsetMinPx));
    const peak = -Math.round(tuning.arcHeightMinPx + rand(i + 0.6) * (tuning.arcHeightMaxPx - tuning.arcHeightMinPx));
    const peakAt = tuning.arcPeakAtMin + rand(i + 0.85) * (tuning.arcPeakAtMax - tuning.arcPeakAtMin);
    // See the history on DEFAULT_ARROW_TUNING for why this isn't derived
    // from the flight path or the landing ring.
    const jitter = -tuning.restAngleJitterDeg + rand(i + 0.25) * (2 * tuning.restAngleJitterDeg);

    shots.push({
      id: i,
      x,
      y,
      ringIndex,
      restRotation: tuning.restAngleBaseDeg + jitter,
      ox,
      peak,
      peakAt,
      delay,
      flightMs: Math.round(tuning.flightDurationMinMs + rand(i + 0.15) * (tuning.flightDurationMaxMs - tuning.flightDurationMinMs)),
      easeInPower: tuning.easeInPower,
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
    const te = Math.pow(t, shot.easeInPower);
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
 *
 * `tuning` overrides any subset of DEFAULT_ARROW_TUNING — omit it entirely
 * for production behavior. It exists so `/dev/animations` can expose live
 * controls for every "feel" knob without duplicating this component; pass a
 * stable object (e.g. from useState, not a fresh literal every render) if
 * you use it, since it flows into a useMemo dependency.
 */
export function ArrowToTarget({
  count,
  mode = "random",
  funnelRanks,
  tuning,
  onDone,
  className,
}: {
  count: number;
  mode?: ArrowLandingMode;
  funnelRanks?: number[];
  tuning?: Partial<ArrowTuning>;
  onDone?: () => void;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const resolvedTuning = useMemo<ArrowTuning>(() => ({ ...DEFAULT_ARROW_TUNING, ...tuning }), [tuning]);
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
  const shots = useMemo(
    () => (sessionSeed === null ? [] : buildShots(count, mode, funnelRanks, sessionSeed, resolvedTuning)),
    [count, mode, funnelRanks, sessionSeed, resolvedTuning],
  );
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
  // Which shots are showing their ring color instead of the gray "unpainted"
  // one (see the two palette families above). Deliberately *not* flipped
  // per-shot as each one's own flight finishes — the whole group waits for
  // every shot to land, holds a beat gray so there's a moment to actually
  // look at the impact, and only then paints together in one pass (see the
  // effect below). A single instance can still receive more shots later
  // (`count` growing live — see the render effect's own comment); their ids
  // just join this same set once *their* wave finishes landing, without
  // touching ids already painted from an earlier wave.
  const [paintedIds, setPaintedIds] = useState<ReadonlySet<number>>(() => new Set());

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

  // Paints every currently-flying shot's ring color in one batch, once the
  // *last* of them has landed — `totalFlightDuration` (below) is already the
  // max over every shot's own delay+duration, so it's the exact moment
  // "all of them are in". `PAINT_REVEAL_PAUSE_MS` on top is the deliberate
  // pause to actually look at the gray, just-landed result before it
  // resolves into color, instead of the two happening in the same instant.
  // Re-running this on every `shots` change (not just once) is what lets a
  // second wave (count growing live on the same mount) get its own
  // land-all-then-paint cycle without touching ids an earlier wave already
  // painted — the functional update below only ever adds ids, never removes.
  useEffect(() => {
    if (reducedMotion) return;
    const shotIds = shots.map((s) => s.id);
    if (shotIds.length === 0) return;
    const timer = setTimeout(() => {
      setPaintedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of shotIds) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, totalFlightDuration + PAINT_REVEAL_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [shots, totalFlightDuration, reducedMotion]);

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

  const arrowWidthPx = Math.round(ARROW_BASE_WIDTH_PX * (resolvedTuning.arrowScalePct / 100));
  const arrowHeightPx = Math.round(ARROW_BASE_HEIGHT_PX * (resolvedTuning.arrowScalePct / 100));

  return (
    <div className={className}>
      <div className="relative aspect-square w-full" ref={containerRef}>
        <Diana className="h-full w-full" />
        {shots.map((shot) => {
          // Reduced motion skips the flight entirely (arrows just appear),
          // so there's nothing to "arrive" — go straight to the landed
          // color instead of sitting gray forever.
          const landed = reducedMotion || paintedIds.has(shot.id);
          return (
            <div
              key={shot.id}
              className="absolute"
              style={{
                left: `${shot.x}%`,
                top: `${shot.y}%`,
                // Anchored and pivoted on the arrowhead's actual tip (not the
                // bounding-box center) — (x,y) is "where it touches", so the
                // part that visually touches it should be the part sitting
                // exactly there, both at rest and while `restRotation`'s
                // jitter rotates the shaft/feathers around it.
                transformOrigin: `${ARROW_TIP_X_PCT} ${ARROW_TIP_Y_PCT}`,
                transform: `translate(-${ARROW_TIP_X_PCT}, -${ARROW_TIP_Y_PCT}) rotate(${shot.restRotation}deg)`,
              }}
            >
              <div data-shot-id={shot.id} style={reducedMotion ? undefined : { opacity: 0 }}>
                <Arrow
                  palette={landed ? RING_ARROW_PALETTES[shot.ringIndex] : UNPAINTED_ARROW_PALETTE}
                  className="[&_path]:transition-colors [&_path]:duration-300"
                  style={{ width: arrowWidthPx, height: arrowHeightPx }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {displayCount} CV{displayCount === 1 ? "" : "s"} enviado{displayCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
