"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortfolioCvState } from "@/core/portfolioCv/types";
import type { Language } from "@/core/types";
import { getPortfolioCvStore } from "@/lib/storage";

export interface UsePortfolioCv {
  state: PortfolioCvState;
  loading: boolean;
  /** Record the current master version as the one now live on the portfolio. */
  markPublished: (language: Language, version: number) => Promise<void>;
}

/** React access to the portfolio-CV publication store: per-language published version. */
export function usePortfolioCv(): UsePortfolioCv {
  const [state, setState] = useState<PortfolioCvState>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setState(await getPortfolioCvStore().get());
  }, []);

  useEffect(() => {
    let active = true;
    getPortfolioCvStore()
      .get()
      .then((value) => {
        if (active) setState(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const markPublished = useCallback(
    async (language: Language, version: number) => {
      await getPortfolioCvStore().setPublished(language, version);
      await reload();
    },
    [reload],
  );

  return { state, loading, markPublished };
}
