"use client";

import { Loader2, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiModel } from "@/core/ai/models";
import {
  COVER_LETTER_AI,
  COVER_LETTER_NONE,
  resolveBodiesFor,
  type CoverLetterBodies,
  type CoverLetterTemplate,
} from "@/core/coverLetter/types";
import type { Language, LanguageChoice } from "@/core/types";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";

const LANGUAGE_TITLES: Record<Language, string> = { EN: "Cuerpo (inglés)", ES: "Cuerpo (español)" };

export interface CoverLetterFieldsProps {
  templates: CoverLetterTemplate[];
  /** "" = sin cover letter, COVER_LETTER_AI = compartir contexto, or a template id. */
  templateId: string;
  onTemplateIdChange: (templateId: string, bodies: CoverLetterBodies) => void;
  bodies: CoverLetterBodies;
  onBodiesChange: (bodies: CoverLetterBodies) => void;
  language: LanguageChoice;
  company: string;
  role: string;
  who?: string;
  jobUrl: string;
  onJobUrlChange: (value: string) => void;
  jobContext: string;
  onJobContextChange: (value: string) => void;
  model: AiModel;
  onModelChange: (model: AiModel) => void;
  generating: boolean;
  onGenerateWithAi: () => void;
  /** Portal target for popouts (the drawer/wizard node). */
  container?: HTMLElement | null;
  /** Prefix for field ids so multiple instances on one page don't collide. */
  idPrefix: string;
}

/**
 * Cover letter picker + editor: a real template ({company}/{role}/{who}
 * resolved, no AI) or "Compartir contexto" (generated with AI from the shared
 * context panel), then a per-language editable body. Pure UI over primitive
 * props — no wizard or registry-row coupling — shared by the wizard's cover-
 * letter step and the post-hoc "generate a letter for an already-shipped
 * application" takeover.
 */
export function CoverLetterFields({
  templates,
  templateId,
  onTemplateIdChange,
  bodies,
  onBodiesChange,
  language,
  company,
  role,
  who,
  jobUrl,
  onJobUrlChange,
  jobContext,
  onJobContextChange,
  model,
  onModelChange,
  generating,
  onGenerateWithAi,
  container,
  idPrefix,
}: CoverLetterFieldsProps) {
  const languages = language === "Ambos" ? (["EN", "ES"] as const) : ([language] as const);
  const selected = templates.find((template) => template.id === templateId);
  const isAiMode = templateId === COVER_LETTER_AI;

  const options: IconSelectOption<string>[] = [
    { value: COVER_LETTER_NONE, label: "Sin cover letter" },
    { value: COVER_LETTER_AI, label: "Compartir contexto", icon: <Sparkles className="size-4 text-muted-foreground" /> },
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
      icon: <Mail className="size-4 text-muted-foreground" />,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cover-letter`}>Cover letter</Label>
        <IconSelect
          id={`${idPrefix}-cover-letter`}
          aria-label="Cover letter"
          value={templateId === "" ? COVER_LETTER_NONE : templateId}
          onChange={(value) => {
            if (value === COVER_LETTER_NONE) {
              onTemplateIdChange("", {});
              return;
            }
            if (value === COVER_LETTER_AI) {
              onTemplateIdChange(COVER_LETTER_AI, {});
              return;
            }
            const template = templates.find((candidate) => candidate.id === value);
            if (!template) return;
            onTemplateIdChange(template.id, resolveBodiesFor(template, { language, company, role, who }));
          }}
          options={options}
          container={container}
        />
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay templates todavía. Crealos desde la card <strong>Cover letters</strong>, o elegí
            <strong> Compartir contexto</strong> para generar sin uno.
          </p>
        )}
      </div>

      {isAiMode && (
        <>
          <AiContextPanel
            jobUrl={jobUrl}
            onJobUrlChange={onJobUrlChange}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
            model={model}
            onModelChange={onModelChange}
            idPrefix={idPrefix}
            container={container}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateWithAi}
            disabled={generating || company.trim() === "" || role.trim() === ""}
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generar con IA
          </Button>
        </>
      )}

      {(selected || isAiMode) &&
        languages.map((language) => {
          const body = bodies[language];
          if (body === undefined) {
            if (isAiMode) return null; // nothing yet — "Generar con IA" above is the next step
            return (
              <p key={language} className="text-xs text-amber-500">
                El template no tiene cuerpo en {language === "EN" ? "inglés" : "español"} — esa
                carpeta va sin carta.
              </p>
            );
          }
          return (
            <div key={language} className="space-y-2">
              <Label htmlFor={`${idPrefix}-body-${language}`}>{LANGUAGE_TITLES[language]}</Label>
              <Textarea
                id={`${idPrefix}-body-${language}`}
                value={body}
                rows={languages.length > 1 ? 7 : 12}
                className="font-mono text-xs"
                onChange={(event) => onBodiesChange({ ...bodies, [language]: event.target.value })}
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

      {isAiMode && Object.keys(bodies).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Generado por IA a partir del contexto que compartiste — editalo libremente para esta
          aplicación.
        </p>
      )}
    </div>
  );
}
