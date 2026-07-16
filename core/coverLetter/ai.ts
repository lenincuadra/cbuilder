import type { AiModel } from "../ai/models";
import type { Language } from "../types";
import type { CoverLetterBodies } from "./types";

/** Grounding fields for a cover letter draft — same shape whether they come
 * from in-progress wizard state or an already-registered application row. */
export interface CoverLetterAiInput {
  company: string;
  role: string;
  who?: string;
  focus?: string;
  jobContext?: string;
}

/**
 * Ask the AI pipeline for a draft body per active language, grounded in the
 * profile context pack + the application's focus + the shared context panel
 * (job link/context + chosen model). Used both by the wizard's cover-letter
 * step and the post-hoc "generate a letter for an already-shipped
 * application" flow.
 */
export async function requestAiDraft(
  input: CoverLetterAiInput,
  languages: Language[],
  model: AiModel,
): Promise<CoverLetterBodies> {
  const response = await fetch("/api/ai/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: input.company,
      role: input.role,
      who: input.who,
      focus: input.focus,
      jobContext: input.jobContext,
      model,
      languages,
    }),
  });
  const payload = (await response.json()) as { bodies?: CoverLetterBodies; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `AI generation failed (HTTP ${response.status}).`);
  }
  return payload.bodies ?? {};
}
