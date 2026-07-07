"use client";

import { useState } from "react";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { GenerateCvInput } from "@/core/generateCv";
import { Wizard } from "@/ui/wizard/Wizard";

export interface GenerateCardProps {
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** True while a generation is in flight. */
  generating: boolean;
  /** Runs the generation; rejects on error (the caller surfaces the message). */
  onGenerate: (input: GenerateCvInput) => Promise<void>;
}

/**
 * Right-column CV generator. Shows an empty state first (the entry point); the
 * wizard opens in place on demand and collapses back to the empty state on
 * cancel or after a successful generation.
 */
export function GenerateCard({ existingCodes, generating, onGenerate }: GenerateCardProps) {
  const [open, setOpen] = useState(false);

  async function handleGenerate(input: GenerateCvInput) {
    // Throws on error → the wizard stays on the confirm step showing the message.
    await onGenerate(input);
    // Success → back to the empty state, ready for the next one.
    setOpen(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {open ? (
          <Wizard
            existingCodes={existingCodes}
            generating={generating}
            onGenerate={handleGenerate}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <Empty className="border-0 p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilePlus2 />
              </EmptyMedia>
              <EmptyTitle>Generar un CV</EmptyTitle>
              <EmptyDescription>Creá un CV trackeado y sumalo al registro.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setOpen(true)}>
                <FilePlus2 className="size-4" />
                Generar CV
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
