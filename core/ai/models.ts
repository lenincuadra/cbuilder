/**
 * Selectable models for the AI pipeline — real Anthropic model ids, no
 * "fast/quality" abstraction. Curated to the current generation (skips
 * superseded dated snapshots like opus-4-1/4-5/4-6/4-7, sonnet-4-5/4-6) so the
 * picker stays short; extend this list directly if a newer model ships.
 */
export const AI_MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
  "claude-fable-5",
] as const;

export type AiModel = (typeof AI_MODELS)[number];

export const DEFAULT_AI_MODEL: AiModel = "claude-opus-4-8";

export function isAiModel(value: unknown): value is AiModel {
  return typeof value === "string" && (AI_MODELS as readonly string[]).includes(value);
}
