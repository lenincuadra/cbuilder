import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildContextBlock, buildScreeningAnswerPrompt } from "@/core/ai/prompt";
import { DEFAULT_AI_MODEL, isAiModel } from "@/core/ai/models";
import { readProfileBackground } from "@/lib/storage/profileContext";
import { readSpecCache } from "@/lib/storage/specCache";

// Calls the Anthropic API live — never statically cached.
export const dynamic = "force-dynamic";

const MAX_TOKENS = 400;

interface RequestBody {
  question?: unknown;
  company?: unknown;
  role?: unknown;
  focus?: unknown;
  jobContext?: unknown;
  model?: unknown;
}

/**
 * Suggest an answer to a pre-screening question, grounded in the AI context
 * pack plus (if known) the asking application's focus. 501 = ANTHROPIC_API_KEY
 * absent or context pack missing. Answer lands in the Preguntas tab's editable
 * textarea for review — nothing here is persisted directly.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI pipeline not configured." }, { status: 501 });
  }

  const body = (await request.json()) as RequestBody;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : undefined;
  const role = typeof body.role === "string" ? body.role.trim() : undefined;
  const focus = typeof body.focus === "string" && body.focus !== "" ? body.focus : undefined;
  const jobContext = typeof body.jobContext === "string" ? body.jobContext : undefined;
  const model = isAiModel(body.model) ? body.model : DEFAULT_AI_MODEL;
  if (question === "") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const background = await readProfileBackground();
  if (!background) {
    return NextResponse.json(
      { error: "No AI context pack found (data/profile/background.md)." },
      { status: 501 },
    );
  }
  const spec = await readSpecCache();
  // No target language up front for a screening answer — the focus case
  // context defaults to English; the model still answers in the question's language.
  const context = buildContextBlock(background, spec, focus, "EN", jobContext);
  const { system, user } = buildScreeningAnswerPrompt({ context, question, company, role });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = message.content.find((block) => block.type === "text");
    // Echo the model actually used — traceability for a paid call, and lets
    // the client confirm its selection was honored (not silently defaulted).
    return NextResponse.json({ answer: text && "text" in text ? text.text.trim() : "", model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI generation failed." },
      { status: 502 },
    );
  }
}
