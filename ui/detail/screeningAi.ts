import type { AiModel } from "@/core/ai/models";

/** Application context sent along with a screening question to the AI pipeline. */
export interface AiAnswerContext {
  company?: string;
  role?: string;
  focus?: string;
  jobContext?: string;
  model: AiModel;
}

/** Ask the AI pipeline for a draft answer, grounded in the profile context pack. */
export async function requestAiAnswer(
  question: string,
  context: AiAnswerContext,
): Promise<string> {
  const response = await fetch("/api/ai/screening-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, ...context }),
  });
  const payload = (await response.json()) as { answer?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `AI generation failed (HTTP ${response.status}).`);
  }
  return payload.answer ?? "";
}
