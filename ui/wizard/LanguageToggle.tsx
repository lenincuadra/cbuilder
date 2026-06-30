"use client";

import { Button } from "@/components/ui/button";
import type { LanguageChoice } from "@/core/types";

const OPTIONS: LanguageChoice[] = ["EN", "ES", "Ambos"];

export interface LanguageToggleProps {
  value: LanguageChoice;
  onChange: (value: LanguageChoice) => void;
}

/** Three-state segmented toggle: EN / ES / Ambos. Visible at a glance, not a dropdown. */
export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1">
      {OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={value === option ? "default" : "ghost"}
          onClick={() => onChange(option)}
          aria-pressed={value === option}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
