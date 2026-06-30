"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { getRegistryStore } from "@/lib/storage";

export interface UseRegistry {
  rows: RegistryRow[];
  loading: boolean;
  add: (row: RegistryRow) => Promise<void>;
  update: (code: string, fields: EditableFields) => Promise<void>;
  reload: () => Promise<void>;
}

/** React access to the registry store: holds the rows in state and keeps them in sync. */
export function useRegistry(): UseRegistry {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setRows(await getRegistryStore().list());
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

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

  return { rows, loading, add, update, reload };
}
