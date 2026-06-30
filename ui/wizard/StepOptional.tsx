"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNELS, type Channel } from "@/core/registry/types";
import type { StepProps } from "./StepCompany";
import { CHANNEL_OMIT } from "./types";

/** Step 3 — Optional fields: rol, canal, quién, link del puesto. None are required. */
export function StepOptional({ data, set }: StepProps) {
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
        <Select
          value={data.channel === "" ? CHANNEL_OMIT : data.channel}
          onValueChange={(value) =>
            set({ channel: value == null || value === CHANNEL_OMIT ? "" : (value as Channel) })
          }
        >
          <SelectTrigger id="channel" className="w-full">
            <SelectValue>
              {(value: unknown) =>
                value && value !== CHANNEL_OMIT ? (value as string) : "Omitir"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CHANNEL_OMIT}>Omitir</SelectItem>
            {CHANNELS.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {channel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
