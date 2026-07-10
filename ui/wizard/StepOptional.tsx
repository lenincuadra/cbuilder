"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHANNELS, type Channel } from "@/core/registry/types";
import { ChannelIcon } from "@/ui/ChannelIcon";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";
import type { StepProps } from "./StepCompany";
import { CHANNEL_OMIT } from "./types";

/** "Omitir" + one option per channel, each with its table icon. */
export const CHANNEL_OPTIONS: IconSelectOption<string>[] = [
  { value: CHANNEL_OMIT, label: "Omitir" },
  ...CHANNELS.map((channel) => ({
    value: channel,
    label: channel,
    icon: <ChannelIcon channel={channel} className="size-4 text-muted-foreground" />,
  })),
];

/** Step 3 — Optional fields: rol, canal, quién, link del puesto. None are required. */
export function StepOptional({ data, set, container }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <Input
          id="role"
          value={data.role}
          onChange={(event) => set({ role: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Canal</Label>
        <IconSelect
          id="channel"
          aria-label="Canal"
          value={data.channel === "" ? CHANNEL_OMIT : data.channel}
          onChange={(value) =>
            set({ channel: value === CHANNEL_OMIT ? "" : (value as Channel) })
          }
          options={CHANNEL_OPTIONS}
          container={container}
        />
      </div>

      {data.channel === "Email" && (
        <div className="space-y-2">
          <Label htmlFor="email">
            Email al que aplicaste <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="recruiter@empresa.com"
            value={data.email}
            onChange={(event) => set({ email: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Requerido porque elegiste el canal Email.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="who">Quién</Label>
        <Input
          id="who"
          placeholder="Recruiter o contacto"
          value={data.who}
          onChange={(event) => set({ who: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobUrl">Link del puesto</Label>
        <Input
          id="jobUrl"
          type="url"
          placeholder="https://…"
          value={data.jobUrl}
          onChange={(event) => set({ jobUrl: event.target.value })}
        />
      </div>
    </div>
  );
}
