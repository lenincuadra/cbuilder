import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildJdParsePrompt, parseJdResponse } from "@/core/jdParse/prompt";

// Calls the Anthropic API live — never statically cached.
export const dynamic = "force-dynamic";

const MAX_TOKENS = 800;

/**
 * Structured extraction of a job description's key elements — title, required
 * and preferred keywords, tools, section headers, and company values — using
 * Claude Haiku (cheapest, sufficient for deterministic extraction).
 *
 * Input: `{ text: string }` — raw JD text (from URL auto-detect or hand-paste).
 * Output: `{ parsed: ParsedJd | null }`.
 *
 * Returns `parsed: null` when the API key is absent (same graceful-degradation
 * contract as other AI features) or when parsing fails — never errors.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ parsed: null });
  }

  const body = (await request.json()) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 20) {
    return NextResponse.json({ parsed: null });
  }

  try {
    const client = new Anthropic({ apiKey });
    const { system, user } = buildJdParsePrompt(text);
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    return NextResponse.json({ parsed: parseJdResponse(raw) });
  } catch {
    return NextResponse.json({ parsed: null });
  }
}
