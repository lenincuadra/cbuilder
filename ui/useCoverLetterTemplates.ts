"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CoverLetterTemplate,
  EditableTemplateFields,
} from "@/core/coverLetter/types";
import { getCoverLetterTemplatesStore } from "@/lib/storage";

export interface UseCoverLetterTemplates {
  templates: CoverLetterTemplate[];
  loading: boolean;
  add: (template: Pick<CoverLetterTemplate, "name" | "bodies">) => Promise<void>;
  update: (id: string, fields: EditableTemplateFields) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** React access to the cover-letter templates store: list + CRUD, kept in sync. */
export function useCoverLetterTemplates(): UseCoverLetterTemplates {
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const value = await getCoverLetterTemplatesStore().list();
    setTemplates(value);
  }, []);

  useEffect(() => {
    let active = true;
    getCoverLetterTemplatesStore()
      .list()
      .then((value) => {
        if (active) setTemplates(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = useCallback(
    async (template: Pick<CoverLetterTemplate, "name" | "bodies">) => {
      await getCoverLetterTemplatesStore().add({
        id: crypto.randomUUID(),
        name: template.name,
        bodies: template.bodies,
      });
      await reload();
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, fields: EditableTemplateFields) => {
      await getCoverLetterTemplatesStore().update(id, fields);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await getCoverLetterTemplatesStore().remove(id);
      await reload();
    },
    [reload],
  );

  return { templates, loading, add, update, remove };
}
