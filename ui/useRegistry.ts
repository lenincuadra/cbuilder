"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { getRegistryStore } from "@/lib/storage";

export interface UseRegistry {
  rows: RegistryRow[];
  loading: boolean;
  add: (row: RegistryRow) => Promise<void>;
  update: (code: string, fields: EditableFields) => Promise<void>;
  remove: (code: string) => Promise<void>;
  reload: () => Promise<void>;
}

/** React access to the registry store: holds the rows in state and keeps them in sync. */
export function useRegistry(): UseRegistry {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setRows(await getRegistryStore().list());
  }, []);

  // Initial load on mount. Inlined (not routed through `reload`) so the setState
  // lives in an async callback, and guarded so it can't set state after unmount.
  useEffect(() => {
    let active = true;
    getRegistryStore()
      .list()
      .then((initial) => {
        if (active) setRows(initial);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = useCallback(
    async (row: RegistryRow) => {
      await getRegistryStore().add(row);
      await reload();
    },
    [reload],
  );

  const update = useCallback(
    async (code: string, fields: EditableFields) => {
      await getRegistryStore().update(code, fields);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (code: string) => {
      await getRegistryStore().remove(code);
      await reload();
    },
    [reload],
  );

  return { rows, loading, add, update, remove, reload };
}
