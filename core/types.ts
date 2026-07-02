/** Concrete CV language (one master each). */
export type Language = "EN" | "ES";

/** What the user can pick in the wizard: a concrete language or both. */
export type LanguageChoice = Language | "Ambos";

/** Display label for a language choice — "Ambos" shows both languages (EN · ES). */
export function languageLabel(language?: LanguageChoice): string {
  if (!language) return "—";
  return language === "Ambos" ? "EN · ES" : language;
}
