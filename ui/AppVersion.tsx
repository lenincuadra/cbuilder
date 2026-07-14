import { formatAppVersionLabel } from "@/lib/version";

export function AppVersion() {
  return (
    <span className="text-xs font-normal tabular-nums text-muted-foreground">
      {formatAppVersionLabel()}
    </span>
  );
}
