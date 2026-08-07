"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "date-fns/locale";

import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value: Date;
  onChange: (value: Date) => void;
  /**
   * Portal target for the calendar popup. Pass the drawer node when rendered
   * inside a drawer so the calendar (and its month/year dropdowns) stay in the
   * drawer's pointer-events scope — otherwise vaul's `pointer-events: none` kills
   * them. Omit outside a drawer (wizard); the popup then portals to <body>.
   */
  container?: HTMLElement | null;
}

/** Date picker for the application date. Defaults are set by the caller (today). */
export function DatePicker({ value, onChange, container }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-start gap-2 font-normal",
        )}
      >
        <CalendarIcon className="size-4" />
        {value.toLocaleDateString("es-AR")}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" container={container}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (date) {
              onChange(date);
              setOpen(false);
            }
          }}
          locale={es}
          captionLayout="dropdown"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
