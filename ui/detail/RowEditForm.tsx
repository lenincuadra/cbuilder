"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { DrawerBody } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toISODate } from "@/core/dates";
import {
  DEFAULT_ROLE,
  type Channel,
  type EditableFields,
  type ReachType,
  type RegistryRow,
} from "@/core/registry/types";
import { languageLabel } from "@/core/types";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { IconSelect } from "@/ui/IconSelect";
import { REACH_EDIT_OPTIONS, REACH_OMIT } from "@/ui/reachMeta";
import { DatePicker } from "@/ui/wizard/DatePicker";
import { CHANNEL_OPTIONS } from "@/ui/wizard/StepOptional";
import { CHANNEL_OMIT } from "@/ui/wizard/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function cleaned(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export interface RowEditFormProps {
  row: RegistryRow;
  onSave: (fields: EditableFields) => void | Promise<void>;
  onCancel: () => void;
  /** Node the Select popup portals into (the drawer) so it stays in its focus/pe scope. */
  portalContainer?: HTMLElement | null;
}

/**
 * Edit a row's metadata (everything except the tracking code). Registry only.
 * Takes over the whole drawer below the header: fields in the scrollable
 * DrawerBody, Cancelar/Guardar pinned in the DrawerFooter.
 */
export function RowEditForm({ row, onSave, onCancel, portalContainer }: RowEditFormProps) {
  const [company, setCompany] = useState(row.company);
  const [role, setRole] = useState(row.role);
  const [channel, setChannel] = useState<Channel | "">(row.channel ?? "");
  const [reach, setReach] = useState<ReachType | "">(row.reach ?? "");
  const [email, setEmail] = useState(row.email ?? "");
  const [date, setDate] = useState<Date>(parseDate(row.date));
  const [who, setWho] = useState(row.who ?? "");
  const [jobUrl, setJobUrl] = useState(row.jobUrl ?? "");
  const [jobContext, setJobContext] = useState(row.jobContext ?? "");
  const [saving, setSaving] = useState(false);

  // A process is identified by empresa OR contacto — empresa becomes required
  // only at CV generation (see the wizard). Keep at least one so the row isn't
  // anonymous.
  const identityOk = company.trim() !== "" || who.trim() !== "";
  const emailOk = channel !== "Email" || EMAIL_RE.test(email.trim());
  const canSave = identityOk && emailOk;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        company: company.trim(),
        role: cleaned(role) ?? DEFAULT_ROLE,
        channel: channel === "" ? undefined : channel,
        reach: reach === "" ? undefined : reach,
        email: channel === "Email" ? cleaned(email) : undefined,
        date: toISODate(date),
        who: cleaned(who),
        jobUrl: cleaned(jobUrl),
        jobContext: cleaned(jobContext),
        // language is intentionally not editable: the CV is already generated.
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DrawerBody>
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-company">Empresa</Label>
            <Input
              id="edit-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Empresa o contacto (al menos uno). Hace falta para generar el CV.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Rol</Label>
            <Input id="edit-role" value={role} onChange={(event) => setRole(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-channel">Canal</Label>
            {/* Same IconSelect as the wizard; `container` = the drawer node keeps the
                menu in the drawer's focus / pointer-events scope (non-modal internally). */}
            <IconSelect
              id="edit-channel"
              aria-label="Canal"
              value={channel === "" ? CHANNEL_OMIT : channel}
              onChange={(value) => setChannel(value === CHANNEL_OMIT ? "" : (value as Channel))}
              options={CHANNEL_OPTIONS}
              container={portalContainer}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-reach">Reach</Label>
            <IconSelect
              id="edit-reach"
              aria-label="Reach"
              value={reach === "" ? REACH_OMIT : reach}
              onChange={(value) => setReach(value === REACH_OMIT ? "" : (value as ReachType))}
              options={REACH_EDIT_OPTIONS}
              container={portalContainer}
            />
          </div>

          {channel === "Email" && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="recruiter@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div className="space-y-1.5">
            <Label>Idioma</Label>
            <Tooltip>
              <TooltipTrigger render={<div className="cursor-default" />}>
                <InputGroup>
                  <InputGroupInput
                    value={languageLabel(row.language)}
                    readOnly
                    disabled
                    aria-label="Idioma"
                  />
                  <InputGroupAddon align="inline-end">
                    <Lock />
                  </InputGroupAddon>
                </InputGroup>
              </TooltipTrigger>
              <TooltipContent>No editable · el CV ya está generado</TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-who">Quién</Label>
            <Input id="edit-who" value={who} onChange={(event) => setWho(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-jobUrl">Link del puesto</Label>
            <Input
              id="edit-jobUrl"
              type="url"
              value={jobUrl}
              onChange={(event) => setJobUrl(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-jobContext">Contexto extra del puesto</Label>
            <Textarea
              id="edit-jobContext"
              placeholder="Requisitos o highlights relevantes del posting (opcional)."
              value={jobContext}
              rows={4}
              className="text-xs"
              onChange={(event) => setJobContext(event.target.value)}
            />
          </div>
        </div>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onCancel}
        onSubmit={save}
        canSubmit={canSave}
        saving={saving}
        submitLabel="Guardar"
        savingLabel="Guardando…"
      />
    </>
  );
}
