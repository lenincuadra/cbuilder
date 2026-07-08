"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { focusLabel, trackedLinks, type FocusProfileId } from "@/core/links";
import { FocusIcon } from "@/ui/FocusIcon";

/** One tracked link shown as plain text (never an <a>, so clicking never fires the
 *  tracker) with a copy button to grab it without visiting. */
function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 font-mono text-xs break-all select-all">{url}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={copy}
          title="Copiar link"
          aria-label={`Copiar link de ${label}`}
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

/** The row's tracked links (portfolio + LinkedIn), read-only. */
export function TrackedLinks({ code, focus }: { code: string; focus?: FocusProfileId }) {
  const links = trackedLinks(code, focus);
  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Links de tracking</span>
      {focus && (
        <div className="flex items-center gap-1.5 text-xs">
          <FocusIcon focus={focus} className="size-3.5 shrink-0 text-muted-foreground" />
          <span>
            <span className="text-muted-foreground">Foco:</span> {focusLabel(focus)}
          </span>
        </div>
      )}
      <LinkRow label="Portfolio" url={links.portfolio} />
      <LinkRow label="LinkedIn" url={links.linkedin} />
    </div>
  );
}
