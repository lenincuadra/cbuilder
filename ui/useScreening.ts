"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableScreeningFields, ScreeningQuestion } from "@/core/screening/types";
import { getScreeningStore } from "@/lib/storage";

export interface UseScreening {
  entries: ScreeningQuestion[];
  loading: boolean;
  /** Creates the entry and returns its generated id. */
  add: (entry: Pick<ScreeningQuestion, "question" | "answer" | "codes" | "draft">) => Promise<string>;
  update: (id: string, fields: EditableScreeningFields) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** React access to the screening-questions bank: list + CRUD, kept in sync. */
export function useScreening(): UseScreening {
  const [entries, setEntries] = useState<ScreeningQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const value = await getScreeningStore().list();
    setEntries(value);
  }, []);

  useEffect(() => {
    let active = true;
    getScreeningStore()
      .list()
      .then((value) => {
        if (active) setEntries(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = useCallback(
    async (entry: Pick<ScreeningQuestion, "question" | "answer" | "codes">) => {
      const id = crypto.randomUUID();
      await getScreeningStore().add({ id, ...entry });
      await reload();
      return id;
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, fields: EditableScreeningFields) => {
      await getScreeningStore().update(id, fields);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await getScreeningStore().remove(id);
      await reload();
    },
    [reload],
  );

  return { entries, loading, add, update, remove };
}
