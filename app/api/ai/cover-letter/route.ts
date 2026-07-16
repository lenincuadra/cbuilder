import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildContextBlock, buildCoverLetterPrompt } from "@/core/ai/prompt";
import { DEFAULT_AI_MODEL, isAiModel } from "@/core/ai/models";
import type { Language } from "@/core/types";
import { readProfileBackground } from "@/lib/storage/profileContext";
import { readSpecCache } from "@/lib/storage/specCache";

// Calls the Anthropic API live — never statically cached.
export const dynamic = "force-dynamic";

const MAX_TOKENS = 700;

interface RequestBody {
  company?: unknown;
  role?: unknown;
  who?: unknown;
  focus?: unknown;
  jobContext?: unknown;
  languages?: unknown;
  model?: unknown;
}

function sanitizeLanguages(input: unknown): Language[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is Language => value === "EN" || value === "ES");
}

/**
 * Draft a cover letter body per requested language, grounded in the AI context
 * pack (data/profile/background.md) plus focus-specific portfolio proof points.
 * 501 = ANTHROPIC_API_KEY absent or context pack missing (feature off, same
 * contract as the gdocs/cvs sinks). Body lands in the wizard's editable
 * textarea — nothing here is persisted directly.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Error strings here surface directly in UI toasts → Spanish (product content).
    return NextResponse.json(
      { error: "IA no configurada: falta ANTHROPIC_API_KEY en el servidor." },
      { status: 501 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const who = typeof body.who === "string" ? body.who.trim() : undefined;
  const focus = typeof body.focus === "string" && body.focus !== "" ? body.focus : undefined;
  const jobContext = typeof body.jobContext === "string" ? body.jobContext : undefined;
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
        const { system, user } = buildCoverLetterPrompt({ context, company, role, who, language });
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
    const bodies = Object.fromEntries(entries) as Partial<Record<Language, string>>;
    // Echo the model actually used — traceability for a paid call, and lets
    // the client confirm its selection was honored (not silently defaulted).
    return NextResponse.json({ bodies, model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falló la generación con IA." },
      { status: 502 },
    );
  }
}
