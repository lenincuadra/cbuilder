/**
 * Strip em-dashes (—) from anything the app generates with AI — cover letters,
 * CV summaries, screening answers, and the ATS/values JSON. It's a product rule:
 * em-dashes read as an AI tell, so drafts never ship with them. The prompts
 * already ask the model to avoid them (see VOICE_PREAMBLE); this is the
 * deterministic net so the guarantee holds even when the model slips.
 *
 * An em-dash (plus any spaces/tabs hugging it) becomes a spaced hyphen, which
 * reads correctly in every position an em-dash can appear. Only horizontal
 * whitespace is consumed, so paragraph breaks survive. En-dashes (–), used for
 * ranges and dates, are intentionally left alone.
 */
export function stripEmDashes(text: string): string {
  return text.replace(/[ \t]*—[ \t]*/g, " - ");
}
