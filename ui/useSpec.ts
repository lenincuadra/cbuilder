"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { specVersionSupported } from "@/core/spec/validate";
import type { LinkSpec } from "@/core/spec/types";
import { fetchSpec, type SpecResult } from "@/lib/spec";

export interface UseSpec {
  spec: LinkSpec | null;
  loading: boolean;
  /** The last load's error message, if it failed with no cache to fall back to. */
  error: string | null;
  /** "live" | "cache" for the loaded spec. */
  source: "live" | "cache" | null;
  reload: () => Promise<void>;
}

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
 * React access to the link contract. Loads once on mount (loading starts true,
 * so the effect only sets state in the async callback — no set-state-in-render/
 * effect); `reload` re-fetches on demand.
 */
export function useSpec(): UseSpec {
  const [spec, setSpec] = useState<LinkSpec | null>(null);
  const [source, setSource] = useState<"live" | "cache" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: SpecResult) => {
    setSpec(result.spec);
    setSource(result.source);
    setError(null);
    warnIfAhead(result.spec);
  }, []);

  useEffect(() => {
    let active = true;
    fetchSpec()
      .then((result) => {
        if (active) apply(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo leer el spec.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apply]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchSpec());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo leer el spec.");
    } finally {
      setLoading(false);
    }
  }, [apply]);

  return { spec, loading, error, source, reload };
}
