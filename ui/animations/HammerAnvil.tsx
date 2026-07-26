"use client";

import { AnvilFire } from "./assets/AnvilFire";
import { Arrow } from "./assets/Arrow";
import { Hammer } from "./assets/Hammer";
import { motionTokens } from "./motionTokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/** Scene 2 — the CV/cover letter pipeline running, shown as a hammer forging the arrow. See docs/animations.md §3. */
export function HammerAnvil({ active = true, className }: { active?: boolean; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = active && !reducedMotion;
  const cycleVar = { "--cycle": `${motionTokens.hammerCycle}ms` } as React.CSSProperties;

  return (
    <div className={className}>
      <div className="relative aspect-[156/91] w-full">
        <AnvilFire className="h-full w-full" />
        {/* Anvil's flat table sits at roughly x 0-38%, y 38-42% of this box (the horn/fire start past x~55%) — everything below targets that spot, not the fire. */}
        <div className="absolute" style={{ left: "3%", top: "43%", width: "30%", transform: "rotate(-8deg)" }}>
          <Arrow className="h-auto w-full" />
        </div>
        <span
          className={`absolute rounded-full bg-warning ${animate ? "cb-hammer-flash" : ""}`}
          style={{ left: "19%", top: "40%", width: "9%", aspectRatio: "1", opacity: 0, ...cycleVar }}
        />
        {/* Hammer's native (unrotated) art is the strike/contact pose, positioned so its head lands on the table above; --raised rotates it up and back around the grip. */}
        <div
          className={`absolute ${animate ? "cb-hammer-swing" : ""}`}
          style={{ left: "4%", top: "2%", width: "46%", transformOrigin: "12% 83%", ...cycleVar }}
        >
          <Hammer className="h-auto w-full" />
        </div>
      </div>
    </div>
  );
}
