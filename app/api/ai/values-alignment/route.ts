import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildContextBlock, buildValuesAlignmentPrompt } from "@/core/ai/prompt";
import { stripEmDashes } from "@/core/ai/sanitize";
import { DEFAULT_AI_MODEL, isAiModel } from "@/core/ai/models";
import type { Language } from "@/core/types";
import { readProfileBackground } from "@/lib/storage/profileContext";
import { readSpecCache } from "@/lib/storage/specCache";

// Calls the Anthropic API live — never statically cached.
export const dynamic = "force-dynamic";

const MAX_TOKENS = 500;

interface RequestBody {
  values?: unknown;
  focus?: unknown;
  jobContext?: unknown;
  language?: unknown;
  model?: unknown;
}

interface ValueEvidence {
  value: string;
  evidence: string;
}

function sanitizeValues(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

/** Parse the AI JSON array, tolerating fences; keep only rows matching a requested value. */
function parseResponse(text: string, values: string[]): ValueEvidence[] {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    const arr = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(arr)) return [];
    const byValue = new Map<string, string>();
    for (const item of arr) {
      if (item && typeof item === "object" && "value" in item && "evidence" in item) {
        const v = String((item as ValueEvidence).value);
        const e = String((item as ValueEvidence).evidence ?? "");
        byValue.set(v.toLowerCase(), e);
      }
    }
    // Return in the requested order, so evidence maps back to each value.
    return values.map((value) => ({ value, evidence: byValue.get(value.toLowerCase()) ?? "" }));
  } catch {
    return values.map((value) => ({ value, evidence: "" }));
  }
}

/**
 * Draft a grounded "Values Alignment" evidence line per company value (ATS mode).
 * 501 = API key or context pack absent (feature off). Nothing is persisted here —
 * the drafts land in the wizard gate, where Lenin edits/approves each one.
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
  const values = sanitizeValues(body.values);
  const focus = typeof body.focus === "string" && body.focus !== "" ? body.focus : undefined;
  const jobContext = typeof body.jobContext === "string" ? body.jobContext : undefined;
  const language: Language = body.language === "ES" ? "ES" : "EN";
  const model = isAiModel(body.model) ? body.model : DEFAULT_AI_MODEL;

  if (values.length === 0) {
    return NextResponse.json({ error: "No hay valores para alinear." }, { status: 400 });
  }

  const background = await readProfileBackground();
  if (!background) {
    return NextResponse.json(
      { error: "Falta el context pack de IA (data/profile/background.md)." },
      { status: 501 },
    );
  }
  const spec = await readSpecCache();
  const context = buildContextBlock(background, spec, focus, language, jobContext);
  const { system, user } = buildValuesAlignmentPrompt({ context, values, language });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = message.content.find((block) => block.type === "text");
    const raw = text && "text" in text ? stripEmDashes(text.text) : "";
    return NextResponse.json({ alignments: parseResponse(raw, values), model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falló la generación con IA." },
      { status: 502 },
    );
  }
}
