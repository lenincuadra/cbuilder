"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { specVersionSupported } from "@/core/spec/validate";
import type { LinkSpec } from "@/core/spec/types";
import { fetchSpec, type SpecResult } from "@/lib/spec";

export interface SpecContextValue {
  spec: LinkSpec | null;
  loading: boolean;
  /** Error message when the load failed with no cache to fall back to. */
  error: string | null;
  /** "live" | "cache" for the loaded spec. */
  source: "live" | "cache" | null;
  reload: () => Promise<void>;
}

const SpecContext = createContext<SpecContextValue | null>(null);

/** Warn once if the spec is ahead of what cbuilder supports (still used best-effort). */
function warnIfAhead(spec: LinkSpec): void {
  if (!specVersionSupported(spec)) {
    toast.warning(
      `El link-spec del portfolio es una versión más nueva (v${spec.version}) que la que ` +
        `soporta esta app. Se usa lo que se entiende.`,
    );
  }
}

/**
 * Loads the link contract **once** for the whole app and shares it via context,
 * so per-row components (the table's focus icons, the panel, etc.) don't each
 * re-fetch it. Loading starts true, so the effect only sets state in the async
 * callback (no set-state-in-effect).
 */
export function SpecProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<LinkSpec | null>(null);
  const [source, setSource] = useState<"live" | "cache" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function apply(result: SpecResult) {
    setSpec(result.spec);
    setSource(result.source);
    setError(null);
    warnIfAhead(result.spec);
  }

  useEffect(() => {
    let active = true;
    fetchSpec()
      .then((result) => {
        if (active) apply(result);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo leer el spec.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      apply(await fetchSpec());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo leer el spec.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SpecContext.Provider value={{ spec, loading, error, source, reload }}>
      {children}
    </SpecContext.Provider>
  );
}

/** The link contract from context. Must be used within <SpecProvider>. */
export function useSpec(): SpecContextValue {
  const ctx = useContext(SpecContext);
  if (!ctx) throw new Error("useSpec must be used within <SpecProvider>.");
  return ctx;
}
