import { CreditCard, Sparkles, TrendingUp } from "lucide-react";
import type { FocusProfileId } from "@/core/links";

/** Representative icon for a portfolio focus profile. Monochrome (currentColor). */
export function FocusIcon({
  focus,
  className = "size-4",
}: {
  focus: FocusProfileId;
  className?: string;
}) {
  switch (focus) {
    case "payments":
      return <CreditCard className={className} />;
    case "ai":
      return <Sparkles className={className} />;
    case "conversion":
      return <TrendingUp className={className} />;
    default:
      return null;
  }
}
