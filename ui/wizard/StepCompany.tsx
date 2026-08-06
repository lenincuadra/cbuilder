"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconSelect } from "@/ui/IconSelect";
import { REACH_OPTIONS } from "@/ui/reachMeta";
import { DatePicker } from "./DatePicker";
import type { WizardData } from "./types";

export interface StepProps {
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
  /** Portal target for popouts (dropdowns) when the wizard runs inside a drawer. */
  container?: HTMLElement | null;
  /** The link contract — supplies the focus profiles (StepLanguage). Null while loading. */
  spec?: import("@/core/spec/types").LinkSpec | null;
}

/**
 * Step 1 — Empresa y contacto (+ fecha). At least one of empresa/contacto
 * identifies the process: a recruiter can reach out before the company is known
 * ("sé quién es pero no para qué empresa"). Empresa is required only later, to
 * generate the CV (it names the delivery folder). Fecha defaults to hoy.
 */
export function StepCompany({ data, set, container }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="company">Empresa</Label>
        <Input
          id="company"
          autoFocus
          placeholder="GlobalLogic"
          value={data.company}
          onChange={(event) => set({ company: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="who">Quién</Label>
        <Input
          id="who"
          placeholder="Recruiter o contacto"
          value={data.who}
          onChange={(event) => set({ who: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Registrá con al menos empresa o contacto. La empresa se puede completar
          después — hace falta solo al generar el CV.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reach">Reach</Label>
        <IconSelect
          id="reach"
          aria-label="Reach"
          value={data.reach}
          onChange={(reach) => set({ reach })}
          options={REACH_OPTIONS}
          container={container}
        />
        <p className="text-xs text-muted-foreground">
          Outbound: aplicaste o escribiste vos. Inbound: te contactaron.
        </p>
      </div>

      <div className="space-y-2">
        <Label>
          Fecha de aplicación <span className="text-destructive">*</span>
        </Label>
        <DatePicker value={data.date} onChange={(date) => set({ date })} />
        <p className="text-xs text-muted-foreground">
          Forma parte del código de tracking. Default: hoy.
        </p>
      </div>
    </div>
  );
}
