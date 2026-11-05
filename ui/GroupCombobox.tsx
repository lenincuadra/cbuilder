"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type Option = { value: string; create?: boolean };

export interface GroupComboboxProps {
  id?: string;
  /** Current group ("" = Sin grupo). */
  value: string;
  onChange: (group: string) => void;
  /** Existing group names to pick from. */
  groups: string[];
  /** Node the popup portals into (the drawer) so it stays in its focus scope. */
  container?: HTMLElement | null;
}

/**
 * Pick an existing group or create one by typing a new name ("Crear «…»" item).
 * Clearing the input (×) sets Sin grupo. A row lives in one group at a time.
 */
export function GroupCombobox({ id, value, onChange, groups, container }: GroupComboboxProps) {
  const [query, setQuery] = useState(value);
  const typed = query.trim();
  const exists = groups.some(
    (group) => group.localeCompare(typed, "es", { sensitivity: "base" }) === 0,
  );
  const options: Option[] = groups.map((group) => ({ value: group }));
  if (typed !== "" && !exists) options.push({ value: typed, create: true });
  const selected = value ? (options.find((option) => option.value === value) ?? { value }) : null;

  return (
    <Combobox<Option>
      items={options}
      value={selected}
      onValueChange={(option) => onChange(option?.value ?? "")}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringLabel={(option) => option.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxInput id={id} placeholder="Sin grupo" className="w-full" showClear={value !== ""} />
      <ComboboxContent container={container}>
        <ComboboxEmpty>Escribí un nombre para crear un grupo.</ComboboxEmpty>
        <ComboboxList>
          {(option: Option) => (
            <ComboboxItem key={`${option.create ? "new:" : ""}${option.value}`} value={option}>
              {option.create ? (
                <>
                  <Plus className="text-muted-foreground" />
                  Crear «{option.value}»
                </>
              ) : (
                option.value
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
