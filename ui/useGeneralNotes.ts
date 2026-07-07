"use client";

import { useCallback, useEffect, useState } from "react";
import { getGeneralNotesStore } from "@/lib/storage";

export interface UseGeneralNotes {
  notes: string;
  loading: boolean;
  /** Persist the notes (undefined/empty clears them). */
  save: (notes: string | undefined) => Promise<void>;
}

/** React access to the general-notes store: holds the value in state and keeps it in sync. */
export function useGeneralNotes(): UseGeneralNotes {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getGeneralNotesStore()
      .get()
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

  const save = useCallback(async (next: string | undefined) => {
    const value = next ?? "";
    await getGeneralNotesStore().set(value);
    setNotes(value);
  }, []);

  return { notes, loading, save };
}
