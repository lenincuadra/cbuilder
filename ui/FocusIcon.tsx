import { CreditCard, Sparkles, Target, TrendingUp } from "lucide-react";

/**
 * Representative icon for a portfolio focus profile (monochrome, currentColor).
 * The profile list is spec-driven, so this is a cosmetic mapping for the known
 * ids with a generic fallback (`Target`) for any new profile.
 */
export function FocusIcon({ focus, className = "size-4" }: { focus: string; className?: string }) {
  switch (focus) {
    case "payments":
      return <CreditCard className={className} />;
    case "ai":
      return <Sparkles className={className} />;
    case "conversion":
      return <TrendingUp className={className} />;
    default:
      return <Target className={className} />;
  }
}
