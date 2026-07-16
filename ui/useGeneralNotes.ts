"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableGeneralNoteFields, GeneralNote } from "@/core/notes/types";
import { getGeneralNotesStore } from "@/lib/storage";

export interface UseGeneralNotes {
  notes: GeneralNote[];
  loading: boolean;
  add: (note: Pick<GeneralNote, "title" | "body">) => Promise<void>;
  update: (id: string, fields: EditableGeneralNoteFields) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** React access to the general notes list: holds it in state and keeps it in sync. */
export function useGeneralNotes(): UseGeneralNotes {
  const [notes, setNotes] = useState<GeneralNote[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const value = await getGeneralNotesStore().list();
    setNotes(value);
  }, []);

  useEffect(() => {
    let active = true;
    getGeneralNotesStore()
      .list()
      .then((value) => {
        if (active) setNotes(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = useCallback(
    async (note: Pick<GeneralNote, "title" | "body">) => {
      await getGeneralNotesStore().add({ id: crypto.randomUUID(), ...note });
      await reload();
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, fields: EditableGeneralNoteFields) => {
      await getGeneralNotesStore().update(id, fields);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await getGeneralNotesStore().remove(id);
      await reload();
    },
    [reload],
  );

  return { notes, loading, add, update, remove };
}
