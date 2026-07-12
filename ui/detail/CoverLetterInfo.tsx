"use client";

import type { RegistryRow } from "@/core/registry/types";
import { MarkdownView } from "./MarkdownView";

/**
 * The cover letter that shipped with this application: template name + the
 * final per-language markdown that went into the .docx. Read-only, like the
 * tracked links — the letter was already sent; editing the record would lie.
 */
export function CoverLetterInfo({ row }: { row: RegistryRow }) {
  const letter = row.coverLetter;
  if (!letter) return null;
  const bodies = Object.entries(letter.bodies) as Array<[string, string]>;
  if (bodies.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Cover letter</span>
        {letter.templateName && (
          <span className="truncate text-xs text-muted-foreground">{letter.templateName}</span>
        )}
      </div>
      {bodies.map(([language, body]) => (
        <div key={language} className="space-y-0.5">
          {bodies.length > 1 && (
            <span className="font-mono text-xs text-muted-foreground">{language}</span>
          )}
          <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 px-2.5 py-1.5">
            <MarkdownView source={body} />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Enviada con el CV — registro fiel, solo lectura.
      </p>
    </div>
  );
}
