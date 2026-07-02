"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toISODate } from "@/core/dates";
import {
  CHANNELS,
  DEFAULT_ROLE,
  type Channel,
  type EditableFields,
  type RegistryRow,
} from "@/core/registry/types";
import { languageLabel } from "@/core/types";
import { DatePicker } from "@/ui/wizard/DatePicker";
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
}

/** Edit a row's metadata (everything except the tracking code). Registry only. */
export function RowEditForm({ row, onSave, onCancel }: RowEditFormProps) {
  const [company, setCompany] = useState(row.company);
  const [role, setRole] = useState(row.role);
  const [channel, setChannel] = useState<Channel | "">(row.channel ?? "");
  const [email, setEmail] = useState(row.email ?? "");
  const [date, setDate] = useState<Date>(parseDate(row.date));
  const [who, setWho] = useState(row.who ?? "");
  const [jobUrl, setJobUrl] = useState(row.jobUrl ?? "");
  const [saving, setSaving] = useState(false);

  const companyOk = company.trim() !== "";
  const emailOk = channel !== "Email" || EMAIL_RE.test(email.trim());
  const canSave = companyOk && emailOk;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        company: company.trim(),
        role: cleaned(role) ?? DEFAULT_ROLE,
        channel: channel === "" ? undefined : channel,
        email: channel === "Email" ? cleaned(email) : undefined,
        date: toISODate(date),
        who: cleaned(who),
        jobUrl: cleaned(jobUrl),
        // language is intentionally not editable: the CV is already generated.
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="edit-company">
          Empresa <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-role">Rol</Label>
        <Input id="edit-role" value={role} onChange={(event) => setRole(event.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-channel">Canal</Label>
        <Select
          value={channel === "" ? CHANNEL_OMIT : channel}
          onValueChange={(value) =>
            setChannel(value == null || value === CHANNEL_OMIT ? "" : (value as Channel))
          }
        >
          <SelectTrigger id="edit-channel" className="w-full">
            <SelectValue>
              {(value: unknown) => (value && value !== CHANNEL_OMIT ? (value as string) : "Omitir")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CHANNEL_OMIT}>Omitir</SelectItem>
            {CHANNELS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <InputGroup>
          <InputGroupInput
            value={languageLabel(row.language)}
            readOnly
            disabled
            aria-label="Idioma"
          />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger tabIndex={-1} className="cursor-default text-muted-foreground">
                <Lock className="size-4" />
              </TooltipTrigger>
              <TooltipContent>No editable · el CV ya está generado</TooltipContent>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
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

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !canSave}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
