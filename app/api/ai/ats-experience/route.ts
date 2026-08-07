import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildAtsExperiencePrompt, type ExperienceVariant } from "@/core/ai/prompt";
import { stripEmDashes } from "@/core/ai/sanitize";
import { DEFAULT_AI_MODEL, isAiModel } from "@/core/ai/models";
import { cvDataFor } from "@/core/cvData";
import type { ThematicGroup } from "@/core/cvData/docx";
import type { ExperienceEntry } from "@/core/cvData/types";
import type { ParsedJd } from "@/core/jdParse/types";
import type { Language } from "@/core/types";

// Calls the Anthropic API live — never statically cached.
export const dynamic = "force-dynamic";

const MAX_TOKENS = 2000;

interface RequestBody {
  variant?: unknown;
  parsedJd?: unknown;
  language?: unknown;
  model?: unknown;
}

/** Extract a JSON array from the model text (tolerates fences / prose). */
function extractJsonArray(text: string): unknown[] {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(stripped);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const start = stripped.indexOf("[");
    const end = stripped.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(stripped.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Coerce the model's chronological JSON into ExperienceEntry[], guarding shape. */
function parseChrono(raw: unknown[]): ExperienceEntry[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const role = typeof o.role === "string" ? o.role : "";
      const company = typeof o.company === "string" ? o.company : "";
      const dates = typeof o.dates === "string" ? o.dates : "";
      if (!role || !company) return null;
      return {
        role,
        company,
        dates,
        context: asStringArray(o.context),
        bullets: asStringArray(o.bullets),
      } satisfies ExperienceEntry;
    })
    .filter((e): e is ExperienceEntry => e !== null);
}

/** Coerce the model's thematic JSON into ThematicGroup[], guarding shape. */
function parseThematic(raw: unknown[]): ThematicGroup[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const header = typeof o.header === "string" ? o.header : "";
      if (!header || !Array.isArray(o.bullets)) return null;
      const bullets = o.bullets
        .map((b) => {
          if (!b || typeof b !== "object") return null;
          const bo = b as Record<string, unknown>;
          const text = typeof bo.text === "string" ? bo.text : "";
          if (!text) return null;
          return {
            text,
            company: typeof bo.company === "string" ? bo.company : "",
            dates: typeof bo.dates === "string" ? bo.dates : "",
          };
        })
        .filter((b): b is ThematicGroup["bullets"][number] => b !== null);
      if (bullets.length === 0) return null;
      return { header, bullets } satisfies ThematicGroup;
    })
    .filter((g): g is ThematicGroup => g !== null);
}

/**
 * Restructure Lenin's real experience for a JD (ATS mode), grounded in the
 * structured cvData for the language. Returns `chrono` (ExperienceEntry[]) or
 * `thematic` (ThematicGroup[]) depending on the variant. 501 = API key absent.
 * Nothing persisted — the draft lands in the gate for Lenin to edit/verify.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IA no configurada: falta ANTHROPIC_API_KEY en el servidor." },
      { status: 501 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const variant: ExperienceVariant = body.variant === "thematic" ? "thematic" : "chronological";
  const language: Language = body.language === "ES" ? "ES" : "EN";
  const parsedJd = body.parsedJd && typeof body.parsedJd === "object" ? (body.parsedJd as ParsedJd) : null;
  const model = isAiModel(body.model) ? body.model : DEFAULT_AI_MODEL;

  if (!parsedJd) {
    return NextResponse.json({ error: "Falta la descripción analizada." }, { status: 400 });
  }

  const experience = cvDataFor(language).experience;
  const { system, user } = buildAtsExperiencePrompt({ experience, parsedJd, variant, language });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? stripEmDashes(textBlock.text) : "";
    const arr = extractJsonArray(raw);
    if (variant === "thematic") {
      return NextResponse.json({ variant, thematic: parseThematic(arr), model });
    }
    return NextResponse.json({ variant, chrono: parseChrono(arr), model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falló la generación con IA." },
      { status: 502 },
    );
  }
}
