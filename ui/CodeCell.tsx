"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tracking code cell. Codes are fixed-length, so they never need to truncate
 * on their own — it was the copy icon's reserved layout width that pushed
 * the cell past the column and triggered the table's ellipsis. The icon now
 * overlays the code on hover instead (absolutely positioned, no width of its
 * own), so the column never truncates.
 */
export function CodeCell({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(event: React.MouseEvent) {
    event.stopPropagation(); // don't open the row's detail panel
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar código"
      aria-label={`Copiar código ${code}`}
      className="group/code relative inline-flex items-center rounded font-mono text-xs hover:text-foreground"
    >
      {code}
      <span
        className={cn(
          "absolute inset-y-0 right-0 flex items-center rounded bg-background pl-1 opacity-0 transition-opacity",
          "group-hover/code:opacity-100",
        )}
      >
        {copied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3 text-muted-foreground" />
        )}
      </span>
    </button>
  );
}
