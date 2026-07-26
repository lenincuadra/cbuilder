"use client";

import { useMemo, useState } from "react";
import { ArrowToTarget, DEFAULT_ARROW_TUNING, type ArrowLandingMode, type ArrowTuning } from "@/ui/animations/ArrowToTarget";
import { HammerAnvil } from "@/ui/animations/HammerAnvil";

type ControlKey = keyof ArrowTuning;

/** Every ArrowTuning field as a labeled range control, grouped for the
 * playground panel below. min/max/step are dev-harness guardrails only
 * (loose enough to explore, not a statement about sane production ranges). */
const CONTROLS: { key: ControlKey; label: string; min: number; max: number; step: number; group: string }[] = [
  { key: "flightDurationMinMs", label: "Duración del vuelo, min (ms)", min: 50, max: 500, step: 5, group: "Timing" },
  { key: "flightDurationMaxMs", label: "Duración del vuelo, max (ms)", min: 50, max: 700, step: 5, group: "Timing" },
  { key: "easeInPower", label: "Ease-in (potencia; 1 = lineal)", min: 1, max: 3, step: 0.1, group: "Timing" },
  { key: "spawnOffsetMinPx", label: "Offset de spawn, min (px)", min: 40, max: 350, step: 5, group: "Trayectoria" },
  { key: "spawnOffsetMaxPx", label: "Offset de spawn, max (px)", min: 40, max: 450, step: 5, group: "Trayectoria" },
  { key: "arcHeightMinPx", label: "Altura del arco, min (px)", min: 0, max: 100, step: 1, group: "Trayectoria" },
  { key: "arcHeightMaxPx", label: "Altura del arco, max (px)", min: 0, max: 150, step: 1, group: "Trayectoria" },
  { key: "arcPeakAtMin", label: "Dónde pica el arco, min (0-1)", min: 0.05, max: 0.95, step: 0.01, group: "Trayectoria" },
  { key: "arcPeakAtMax", label: "Dónde pica el arco, max (0-1)", min: 0.05, max: 0.95, step: 0.01, group: "Trayectoria" },
  { key: "restAngleBaseDeg", label: "Ángulo de reposo, base (deg)", min: -90, max: 90, step: 1, group: "Ángulo final" },
  { key: "restAngleJitterDeg", label: "Jitter del ángulo, ± (deg)", min: 0, max: 45, step: 1, group: "Ángulo final" },
  { key: "arrowScalePct", label: "Tamaño de la flecha (%)", min: 50, max: 250, step: 5, group: "Tamaño / densidad" },
  { key: "dianaVisualCap", label: "Máx. flechas dibujadas", min: 5, max: 100, step: 1, group: "Tamaño / densidad" },
  { key: "randomModeMaxRadiusPct", label: "Radio máx., modo random (%)", min: 5, max: 30, step: 1, group: "Tamaño / densidad" },
];
const GROUPS = [...new Set(CONTROLS.map((c) => c.group))];

/** Dev-only preview harness for the two animation scenes (docs/animations.md). Not linked from the app. */
export default function AnimationsPreviewPage() {
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<ArrowLandingMode>("random");
  const [ranksSeed, setRanksSeed] = useState(1);
  const [active, setActive] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [tuning, setTuning] = useState<ArrowTuning>(DEFAULT_ARROW_TUNING);

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
            key={`${replayKey}-${mode}-${JSON.stringify(tuning)}`}
            count={count}
            mode={mode}
            funnelRanks={mode === "funnel" ? funnelRanks : undefined}
            tuning={tuning}
            onDone={() => console.log("arrow scene done")}
          />
        </div>

        <div className="space-y-4 rounded border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Playground — tuning en vivo</h3>
            <button className="rounded border px-2 py-1 text-xs" onClick={() => setTuning(DEFAULT_ARROW_TUNING)}>
              Reset a valores por defecto
            </button>
          </div>
          {GROUPS.map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{group}</p>
              <div className="space-y-2">
                {CONTROLS.filter((c) => c.group === group).map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-xs">
                    <span className="w-52 shrink-0 text-muted-foreground">{c.label}</span>
                    <input
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={tuning[c.key]}
                      onChange={(e) => setTuning((t) => ({ ...t, [c.key]: Number(e.target.value) }))}
                      className="w-64"
                    />
                    <span className="w-12 shrink-0 text-right tabular-nums">{tuning[c.key]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
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
