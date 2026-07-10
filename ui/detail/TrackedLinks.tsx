"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildTrackedLinks, type TrackedLinks as TrackedLinksT } from "@/core/spec/links";
import { profileLabel } from "@/core/spec/profiles";
import { FocusIcon } from "@/ui/FocusIcon";
import { useSpec } from "@/ui/useSpec";

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

/**
 * The row's tracked links (portfolio + LinkedIn + GitHub), read-only. Prefers the
 * links stored on the row (faithful record of what was sent); for older rows
 * without them, rebuilds from the current spec.
 */
export function TrackedLinks({
  code,
  focus,
  links: stored,
}: {
  code: string;
  focus?: string;
  links?: TrackedLinksT;
}) {
  const { spec } = useSpec();
  const links = stored ?? (spec ? buildTrackedLinks(spec, code, focus) : null);
  const focusName = focus && spec ? profileLabel(spec, focus) : focus;

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Links de tracking</span>
      {focus && (
        <div className="flex items-center gap-1.5 text-xs">
          <FocusIcon focus={focus} className="size-3.5 shrink-0 text-muted-foreground" />
          <span>
            <span className="text-muted-foreground">Foco:</span> {focusName}
          </span>
        </div>
      )}
      {links ? (
        <>
          <LinkRow label="Portfolio" url={links.portfolio} />
          <LinkRow label="LinkedIn" url={links.linkedin} />
          <LinkRow label="GitHub" url={links.github} />
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Cargando el spec…</span>
      )}
    </div>
  );
}
