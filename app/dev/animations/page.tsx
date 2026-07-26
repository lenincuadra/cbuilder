"use client";

import { useMemo, useState } from "react";
import { ArrowToTarget, type ArrowLandingMode } from "@/ui/animations/ArrowToTarget";
import { HammerAnvil } from "@/ui/animations/HammerAnvil";

/** Dev-only preview harness for the two animation scenes (docs/animations.md). Not linked from the app. */
export default function AnimationsPreviewPage() {
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<ArrowLandingMode>("random");
  const [ranksSeed, setRanksSeed] = useState(1);
  const [active, setActive] = useState(true);
  const [replayKey, setReplayKey] = useState(0);

  // Dev-only stand-in for the real adapter (would read core/registry rows
  // and compute each one's milestoneRank). Regenerate to try different
  // funnel shapes.
  const funnelRanks = useMemo(() => {
    const rand = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + ranksSeed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => Math.floor(rand(i) * 5));
  }, [count, ranksSeed]);

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Flecha a la diana (data-driven)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="count">
            count
          </label>
          <input
            id="count"
            type="number"
            className="w-24 rounded border bg-background px-2 py-1"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <select
            className="rounded border bg-background px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as ArrowLandingMode)}
          >
            <option value="random">random</option>
            <option value="funnel">funnel</option>
          </select>
          {mode === "funnel" && (
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setRanksSeed((s) => s + 1)}>
              Shuffle ranks
            </button>
          )}
          <button className="rounded border px-2 py-1 text-sm" onClick={() => setReplayKey((k) => k + 1)}>
            Replay
          </button>
        </div>
        {mode === "funnel" && (
          <p className="text-xs text-muted-foreground">
            ranks (fake, dev-only): [{funnelRanks.join(", ")}] — 0=sent(outer) .. 4=referral(bullseye)
          </p>
        )}
        <div className="w-72">
          <ArrowToTarget
            key={`${replayKey}-${mode}`}
            count={count}
            mode={mode}
            funnelRanks={mode === "funnel" ? funnelRanks : undefined}
            onDone={() => console.log("arrow scene done")}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Martillo en el yunque (ambient / loading)</h2>
        <button className="rounded border px-2 py-1 text-sm" onClick={() => setActive((a) => !a)}>
          {active ? "Detener" : "Activar"}
        </button>
        <div className="w-72">
          <HammerAnvil active={active} />
        </div>
      </section>
    </main>
  );
}
