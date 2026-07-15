"use client";

import { useCallback, useEffect, useState } from "react";
import type { StableLink } from "@/core/stableLinks/types";
import { getStableLinksStore } from "@/lib/storage";

export interface UseStableLinks {
  links: StableLink[];
  loading: boolean;
  add: (link: Pick<StableLink, "name" | "ref">) => Promise<void>;
  update: (ref: string, fields: Pick<StableLink, "name" | "ref">) => Promise<void>;
  remove: (ref: string) => Promise<void>;
}

/** React access to the stable-links store: holds the list and keeps it in sync. */
export function useStableLinks(): UseStableLinks {
  const [links, setLinks] = useState<StableLink[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const value = await getStableLinksStore().list();
    setLinks(value);
  }, []);

  useEffect(() => {
    let active = true;
    getStableLinksStore()
      .list()
      .then((value) => {
        if (active) setLinks(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = useCallback(
    async (link: Pick<StableLink, "name" | "ref">) => {
      await getStableLinksStore().add(link as StableLink);
      await reload();
    },
    [reload],
  );

  const update = useCallback(
    async (ref: string, fields: Pick<StableLink, "name" | "ref">) => {
      await getStableLinksStore().update(ref, fields);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (ref: string) => {
      await getStableLinksStore().remove(ref);
      await reload();
    },
    [reload],
  );

  return { links, loading, add, update, remove };
}
