"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tracking code cell: hover reveals a copy affordance; click copies it. */
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
      className="group/code inline-flex items-center gap-1.5 rounded font-mono text-xs hover:text-foreground"
    >
      {code}
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy
          className={cn(
            "size-3 text-muted-foreground opacity-0 transition-opacity",
            "group-hover/code:opacity-70",
          )}
        />
      )}
    </button>
  );
}
