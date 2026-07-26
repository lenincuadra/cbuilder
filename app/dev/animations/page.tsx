"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowToTarget, DEFAULT_ARROW_TUNING, type ArrowLandingMode, type ArrowTuning } from "@/ui/animations/ArrowToTarget";
import { HammerAnvil } from "@/ui/animations/HammerAnvil";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ControlKey = keyof ArrowTuning;

/** Every ArrowTuning field as a labeled slider control, grouped for the
 * playground panel below, with a plain-language `hint` shown on hover.
 * min/max/step are dev-harness guardrails only (loose enough to explore,
 * not a statement about sane production ranges). */
const CONTROLS: { key: ControlKey; label: string; hint: string; min: number; max: number; step: number; group: string }[] = [
  {
    key: "flightDurationMinMs",
    label: "Duración del vuelo, min (ms)",
    hint: "Cuánto tarda en volar la flecha más rápida del grupo. Bajarlo hace que esa flecha llegue antes.",
    min: 50,
    max: 500,
    step: 5,
    group: "Timing",
  },
  {
    key: "flightDurationMaxMs",
    label: "Duración del vuelo, max (ms)",
    hint: "Cuánto tarda en volar la flecha más lenta del grupo. Bajarlo acelera todo el conjunto.",
    min: 50,
    max: 700,
    step: 5,
    group: "Timing",
  },
  {
    key: "easeInPower",
    label: "Ease-in (potencia; 1 = lineal)",
    hint: "Qué tan bruscamente acelera cada flecha. En 1 vuela a velocidad pareja; más alto = arranca lenta y llega mucho más rápido, como un golpe seco al final.",
    min: 1,
    max: 3,
    step: 0.1,
    group: "Timing",
  },
  {
    key: "spawnOffsetMinPx",
    label: "Offset de spawn, min (px)",
    hint: "Desde qué tan lejos (a la izquierda) puede aparecer la flecha más cercana antes de empezar a volar.",
    min: 40,
    max: 350,
    step: 5,
    group: "Trayectoria",
  },
  {
    key: "spawnOffsetMaxPx",
    label: "Offset de spawn, max (px)",
    hint: "Desde qué tan lejos puede aparecer la flecha más lejana antes de empezar a volar.",
    min: 40,
    max: 450,
    step: 5,
    group: "Trayectoria",
  },
  {
    key: "arcHeightMinPx",
    label: "Altura del arco, min (px)",
    hint: "Qué tan bajo puede ser el arco más chico — cuánto sube la flecha en el aire antes de bajar. En 0, vuela derecho.",
    min: 0,
    max: 100,
    step: 1,
    group: "Trayectoria",
  },
  {
    key: "arcHeightMaxPx",
    label: "Altura del arco, max (px)",
    hint: "Qué tan alto puede ser el arco más grande.",
    min: 0,
    max: 150,
    step: 1,
    group: "Trayectoria",
  },
  {
    key: "arcPeakAtMin",
    label: "Dónde pica el arco, min (0-1)",
    hint: "Lo más temprano que puede caer el punto más alto del arco (0 = recién sale, 1 = a punto de aterrizar).",
    min: 0.05,
    max: 0.95,
    step: 0.01,
    group: "Trayectoria",
  },
  {
    key: "arcPeakAtMax",
    label: "Dónde pica el arco, max (0-1)",
    hint: "Lo más tarde que puede caer el punto más alto del arco.",
    min: 0.05,
    max: 0.95,
    step: 0.01,
    group: "Trayectoria",
  },
  {
    key: "restAngleBaseDeg",
    label: "Ángulo de reposo, base (deg)",
    hint: "El ángulo en el que quedan clavadas las flechas. En 0 quedan acostadas (horizontales); positivo las inclina hacia abajo, negativo hacia arriba.",
    min: -90,
    max: 90,
    step: 1,
    group: "Ángulo final",
  },
  {
    key: "restAngleJitterDeg",
    label: "Jitter del ángulo, ± (deg)",
    hint: "Cuánto puede variar el ángulo de una flecha a otra, para que no queden todas exactamente iguales.",
    min: 0,
    max: 45,
    step: 1,
    group: "Ángulo final",
  },
  {
    key: "arrowScalePct",
    label: "Tamaño de la flecha (%)",
    hint: "Qué tan grande se dibuja cada flecha. 100% es el tamaño original del dibujo.",
    min: 50,
    max: 250,
    step: 5,
    group: "Tamaño / densidad",
  },
  {
    key: "dianaVisualCap",
    label: "Máx. flechas dibujadas",
    hint: "Cuántas flechas como máximo se dibujan clavadas en el blanco. Si hay más CVs que este número, el resto solo suma al contador de texto de abajo.",
    min: 5,
    max: 100,
    step: 1,
    group: "Tamaño / densidad",
  },
  {
    key: "randomModeMaxRadiusPct",
    label: "Radio máx., modo random (%)",
    hint: "Qué tan lejos del centro pueden caer las flechas en modo random. Más alto = pueden caer más cerca del borde de la diana.",
    min: 5,
    max: 30,
    step: 1,
    group: "Tamaño / densidad",
  },
];
const GROUPS = [...new Set(CONTROLS.map((c) => c.group))];

/** localStorage key for saved tuning presets — dev-only, browser-local, never sent anywhere. */
const PRESETS_STORAGE_KEY = "cbuilder:dev-animations:arrow-tuning-presets";

function loadPresets(): Record<string, ArrowTuning> {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ArrowTuning>) : {};
  } catch {
    return {};
  }
}

/** Dev-only preview harness for the two animation scenes (docs/animations.md). Not linked from the app. */
export default function AnimationsPreviewPage() {
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<ArrowLandingMode>("random");
  const [ranksSeed, setRanksSeed] = useState(1);
  const [active, setActive] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [tuning, setTuning] = useState<ArrowTuning>(DEFAULT_ARROW_TUNING);

  // `null` until the client-only effect below hydrates it from localStorage
  // (same SSR-safety pattern as ArrowToTarget's sessionSeed: server has no
  // localStorage, so reading it during render/in a useState initializer
  // would produce a client/server markup mismatch on first paint).
  const [presets, setPresets] = useState<Record<string, ArrowTuning> | null>(null);
  const [presetName, setPresetName] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresets(loadPresets());
  }, []);

  function persistPresets(next: Record<string, ArrowTuning>) {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Dev-only harness — if localStorage is unavailable (private mode,
      // quota), just skip persistence rather than blocking the save.
    }
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    persistPresets({ ...(presets ?? {}), [name]: tuning });
    setPresetName("");
  }

  function handleDeletePreset(name: string) {
    const next = { ...(presets ?? {}) };
    delete next[name];
    persistPresets(next);
  }

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
    <TooltipProvider>
      <main className="mx-auto max-w-5xl space-y-10 p-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Flecha a la diana (data-driven)</h2>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Sticky: stays in view while the sliders below scroll past. */}
            <div className="w-72 shrink-0 lg:sticky lg:top-4 lg:self-start">
              <ArrowToTarget
                key={`${replayKey}-${mode}-${JSON.stringify(tuning)}`}
                count={count}
                mode={mode}
                funnelRanks={mode === "funnel" ? funnelRanks : undefined}
                tuning={tuning}
                onDone={() => console.log("arrow scene done")}
              />
            </div>

            <div className="flex-1 space-y-4">
              {/* Sticky too, same top offset as the animation, with an opaque
                  background + bottom border so the slider list scrolling
                  underneath doesn't bleed through visually. */}
              <div className="space-y-2 lg:sticky lg:top-4 lg:z-10 lg:border-b lg:border-border lg:bg-background lg:pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger render={<Label htmlFor="count" className="cursor-default" />}>count</TooltipTrigger>
                    <TooltipContent>Cuántos CVs enviados simula la escena — determina cuántas flechas (o el número final del contador) se muestran.</TooltipContent>
                  </Tooltip>
                  <Input id="count" type="number" className="w-24" value={count} onChange={(e) => setCount(Number(e.target.value))} />

                  <Tooltip>
                    <TooltipTrigger render={<span className="cursor-default text-sm text-muted-foreground" />}>modo</TooltipTrigger>
                    <TooltipContent>
                      Cómo se elige dónde cae cada flecha: random = posición aleatoria en toda la diana. funnel = según qué tan lejos llegó cada aplicación
                      en el embudo (sent → responded → interview → offer → referral).
                    </TooltipContent>
                  </Tooltip>
                  <Select value={mode} onValueChange={(v) => setMode(v as ArrowLandingMode)}>
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">random</SelectItem>
                      <SelectItem value="funnel">funnel</SelectItem>
                    </SelectContent>
                  </Select>

                  {mode === "funnel" && (
                    <Tooltip>
                      <TooltipTrigger render={<Button variant="outline" size="sm" onClick={() => setRanksSeed((s) => s + 1)} />}>
                        Shuffle ranks
                      </TooltipTrigger>
                      <TooltipContent>Genera un nuevo conjunto de hitos falsos (dev-only) para probar distintas formas del embudo en modo funnel.</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger render={<Button variant="outline" size="sm" onClick={() => setReplayKey((k) => k + 1)} />}>Replay</TooltipTrigger>
                    <TooltipContent>Vuelve a lanzar la escena desde cero con una nueva semilla aleatoria: nuevas posiciones y ángulos.</TooltipContent>
                  </Tooltip>
                </div>
                {mode === "funnel" && (
                  <p className="text-xs text-muted-foreground">
                    ranks (fake, dev-only): [{funnelRanks.join(", ")}] — 0=sent(outer) .. 4=referral(bullseye)
                  </p>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Playground — tuning en vivo</span>
                    <Button variant="outline" size="xs" onClick={() => setTuning(DEFAULT_ARROW_TUNING)}>
                      Reset a valores por defecto
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Presets guardados</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        placeholder="Nombre del preset"
                        className="w-40"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                      />
                      <Button variant="secondary" size="xs" onClick={handleSavePreset} disabled={!presetName.trim()}>
                        Guardar preset actual
                      </Button>
                    </div>
                    {presets && Object.keys(presets).length > 0 ? (
                      <ul className="space-y-1">
                        {Object.entries(presets).map(([name, savedTuning]) => (
                          <li key={name} className="flex items-center gap-2 text-xs">
                            <span className="flex-1 truncate">{name}</span>
                            <Button variant="outline" size="xs" onClick={() => setTuning(savedTuning)}>
                              Cargar
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => handleDeletePreset(name)}>
                              Borrar
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {presets === null ? "Cargando…" : "Sin presets guardados todavía — se pierden los cambios al Reset si no guardás uno."}
                      </p>
                    )}
                  </div>

                  {GROUPS.map((group, i) => (
                    <div key={group}>
                      {i > 0 && <Separator className="mb-4" />}
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">{group}</p>
                        {CONTROLS.filter((c) => c.group === group).map((c) => (
                          <div key={c.key} className="flex items-center gap-3 text-xs">
                            <Tooltip>
                              <TooltipTrigger render={<span className="w-52 shrink-0 cursor-default text-left text-muted-foreground" />}>
                                {c.label}
                              </TooltipTrigger>
                              <TooltipContent>{c.hint}</TooltipContent>
                            </Tooltip>
                            <Slider
                              value={tuning[c.key]}
                              min={c.min}
                              max={c.max}
                              step={c.step}
                              onValueChange={(v) => setTuning((t) => ({ ...t, [c.key]: v }))}
                              className="max-w-64"
                            />
                            <span className="w-12 shrink-0 text-right tabular-nums">{tuning[c.key]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Martillo en el yunque (ambient / loading)</h2>
          <Button variant="outline" size="sm" onClick={() => setActive((a) => !a)}>
            {active ? "Detener" : "Activar"}
          </Button>
          <div className="w-72">
            <HammerAnvil active={active} />
          </div>
        </section>
      </main>
    </TooltipProvider>
  );
}
