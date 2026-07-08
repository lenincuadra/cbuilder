"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { focusLabel, type FocusProfileId } from "@/core/links";
import { cn } from "@/lib/utils";
import { FocusIcon } from "@/ui/FocusIcon";

/** Tracking code cell: hover reveals a copy affordance; click copies it.
 *  When the row has a portfolio focus, a per-profile icon (with tooltip) follows the code. */
export function CodeCell({ code, focus }: { code: string; focus?: FocusProfileId }) {
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
    <span className="inline-flex items-center gap-1.5">
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
      {focus && (
        <span
          // shrink-0: inside the fixed 9% truncating cell the flex layout would
          // otherwise squash the icon horizontally into an unreadable glyph.
          className="inline-flex shrink-0 text-muted-foreground"
          title={`Foco: ${focusLabel(focus)}`}
          aria-label={`Foco: ${focusLabel(focus)}`}
        >
          <FocusIcon focus={focus} className="size-3.5" />
        </span>
      )}
    </span>
  );
}
