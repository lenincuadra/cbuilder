"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Render markdown (GFM) as formatted content. No raw HTML — safe by default. */
export function MarkdownView({ source, className }: { source: string; className?: string }) {
  if (!source.trim()) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nada todavía. Lo que escribas arriba se ve acá.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words prose-headings:mt-2 prose-headings:mb-1",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
