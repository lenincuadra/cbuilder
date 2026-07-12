"use client";

import { Mail } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  resolveTemplateVars,
  type CoverLetterBodies,
  type CoverLetterTemplate,
} from "@/core/coverLetter/types";
import type { Language } from "@/core/types";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";
import { COVER_LETTER_NONE, languagesFor, type WizardData } from "./types";

/**
 * Resolve a template's bodies for the languages this generation will produce,
 * using the wizard fields as variables. Pure — also used by the wizard when
 * entering the step, to keep an unedited preview fresh after field changes.
 */
export function resolveBodiesFor(
  template: CoverLetterTemplate,
  data: Pick<WizardData, "language" | "company" | "role" | "who">,
): CoverLetterBodies {
  const bodies: CoverLetterBodies = {};
  for (const language of languagesFor(data.language)) {
    const body = template.bodies[language];
    if (body) {
      bodies[language] = resolveTemplateVars(body, {
        company: data.company,
        role: data.role,
        who: data.who,
      });
    }
  }
  return bodies;
}

const LANGUAGE_TITLES: Record<Language, string> = { EN: "Cuerpo (inglés)", ES: "Cuerpo (español)" };

export interface StepCoverLetterProps {
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
  container?: HTMLElement | null;
  templates: CoverLetterTemplate[];
}

/**
 * Step 4 — Cover letter (optional). Pick a template; its body arrives with
 * {company}/{role}/{who} already resolved and stays editable per application —
 * what you see here is exactly what ships in the .docx.
 */
export function StepCoverLetter({ data, set, container, templates }: StepCoverLetterProps) {
  const languages = languagesFor(data.language);
  const selected = templates.find((template) => template.id === data.coverLetterTemplateId);

  const options: IconSelectOption<string>[] = [
    { value: COVER_LETTER_NONE, label: "Sin cover letter" },
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
      icon: <Mail className="size-4 text-muted-foreground" />,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cover-letter">Cover letter</Label>
        <IconSelect
          id="cover-letter"
          aria-label="Cover letter"
          value={data.coverLetterTemplateId === "" ? COVER_LETTER_NONE : data.coverLetterTemplateId}
          onChange={(value) => {
            if (value === COVER_LETTER_NONE) {
              set({ coverLetterTemplateId: "", coverLetterBodies: {}, coverLetterEdited: false });
              return;
            }
            const template = templates.find((candidate) => candidate.id === value);
            if (!template) return;
            set({
              coverLetterTemplateId: template.id,
              coverLetterBodies: resolveBodiesFor(template, data),
              coverLetterEdited: false,
            });
          }}
          options={options}
          container={container}
        />
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay templates todavía. Crealos desde la card <strong>Cover letters</strong>.
          </p>
        )}
      </div>

      {selected &&
        languages.map((language) => {
          const body = data.coverLetterBodies[language];
          if (body === undefined) {
            return (
              <p key={language} className="text-xs text-amber-500">
                El template no tiene cuerpo en {language === "EN" ? "inglés" : "español"} — esa
                carpeta va sin carta.
              </p>
            );
          }
          return (
            <div key={language} className="space-y-2">
              <Label htmlFor={`cl-body-${language}`}>{LANGUAGE_TITLES[language]}</Label>
              <Textarea
                id={`cl-body-${language}`}
                value={body}
                rows={languages.length > 1 ? 7 : 12}
                className="font-mono text-xs"
                onChange={(event) =>
                  set({
                    coverLetterBodies: { ...data.coverLetterBodies, [language]: event.target.value },
                    coverLetterEdited: true,
                  })
                }
              />
            </div>
          );
        })}

      {selected && (
        <p className="text-xs text-muted-foreground">
          Variables ya resueltas con los datos de esta aplicación. Lo que ves acá es exactamente
          lo que va en el .docx — editalo libremente para esta aplicación.
        </p>
      )}
    </div>
  );
}
