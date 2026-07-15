/**
 * Pre-screening questions bank: the unique, thought-demanding questions that
 * applications ask ("Project you are most proud of", "How well does your
 * portfolio reflect your skills…") and the answers given. One global bank —
 * reuse is the point: a past answer is one copy away — with each entry
 * referencing the applications (tracking codes) where it was asked, so "how
 * did that one go" reads straight from those rows' status.
 */
export interface ScreeningQuestion {
  /** Stable unique id (generated at creation). */
  id: string;
  /** The question as asked (free text). */
  question: string;
  /** The answer given. Empty = question recorded, answer still pending. */
  answer: string;
  /** Tracking codes of the applications where this question was asked. */
  codes: string[];
  /**
   * True when `answer` was AI-generated and hasn't been human-reviewed since
   * (set by "Sugerir y guardar", cleared by a manual edit in the Preguntas
   * card). Doesn't affect reuse — a draft answer is still fully linkable/
   * copyable, just flagged as "not confirmed yet" wherever it's shown.
   */
  draft?: boolean;
  /** Creation timestamp (ISO). */
  createdAt?: string;
}

/** Fields editable after creation — everything except identity/timestamps. */
export type EditableScreeningFields = Partial<Omit<ScreeningQuestion, "id" | "createdAt">>;

/** Trimmed non-empty unique codes from untrusted input; drop anything else. */
export function sanitizeCodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const codes: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const code = value.trim();
    if (code !== "" && code.length <= 64 && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

/**
 * Storage for the bank. Same triple-store pattern as the registry:
 * file store locally, Supabase on deploy, API store in the browser.
 */
export interface ScreeningStore {
  list(): Promise<ScreeningQuestion[]>;
  add(entry: ScreeningQuestion): Promise<void>;
  update(id: string, fields: EditableScreeningFields): Promise<void>;
  remove(id: string): Promise<void>;
}
