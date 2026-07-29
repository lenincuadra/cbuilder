import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildContextBlock, buildCvSummaryPrompt } from "@/core/ai/prompt";
import { DEFAULT_AI_MODEL, isAiModel } from "@/core/ai/models";
import type { Language } from "@/core/types";
import type { ParsedJd } from "@/core/jdParse/types";
import { readProfileBackground } from "@/lib/storage/profileContext";
import { readSpecCache } from "@/lib/storage/specCache";

// Calls the Anthropic API live — never statically cached.
export const dynamic = "force-dynamic";

const MAX_TOKENS = 300;

interface RequestBody {
  company?: unknown;
  role?: unknown;
  focus?: unknown;
  jobContext?: unknown;
  parsedJd?: unknown;
  languages?: unknown;
  model?: unknown;
}

function sanitizeLanguages(input: unknown): Language[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is Language => value === "EN" || value === "ES");
}

function sanitizeParsedJd(input: unknown): ParsedJd | undefined {
  if (!input || typeof input !== "object") return undefined;
  return input as ParsedJd;
}

/**
 * Draft a professional summary paragraph per requested language, tailored to
 * the job description. Output is plain text (no markdown) — it slots directly
 * into the CV's Professional Summary paragraph via `fillMaster`.
 *
 * 501 = API key or context pack absent (feature off).
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
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const focus = typeof body.focus === "string" && body.focus !== "" ? body.focus : undefined;
  const jobContext = typeof body.jobContext === "string" ? body.jobContext : undefined;
  const parsedJd = sanitizeParsedJd(body.parsedJd);
  const model = isAiModel(body.model) ? body.model : DEFAULT_AI_MODEL;
  const languages = sanitizeLanguages(body.languages);

  if (company === "" || role === "" || languages.length === 0) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const background = await readProfileBackground();
  if (!background) {
    return NextResponse.json(
      { error: "Falta el context pack de IA (data/profile/background.md)." },
      { status: 501 },
    );
  }
  const spec = await readSpecCache();
  const client = new Anthropic({ apiKey });

  try {
    const entries = await Promise.all(
      languages.map(async (language) => {
        const context = buildContextBlock(background, spec, focus, language, jobContext);
        const { system, user } = buildCvSummaryPrompt({ context, company, role, language, parsedJd });
        const message = await client.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
        });
        const text = message.content.find((block) => block.type === "text");
        return [language, text && "text" in text ? text.text.trim() : ""] as const;
      }),
    );
    const summaries = Object.fromEntries(entries) as Partial<Record<Language, string>>;
    return NextResponse.json({ summaries, model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falló la generación con IA." },
      { status: 502 },
    );
  }
}
