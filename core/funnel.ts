import type { MilestoneKey, RegistryRow } from "./registry/types";
import { MILESTONE_KEYS } from "./registry/types";

/**
 * AARRR ("pirate funnel") stages mapped to the job hunt. The first two stages
 * derive from data the app already has (rows and their status); the last four
 * come from the manually-set `milestones` on each row.
 */
export interface FunnelStageSpec {
  id: "awareness" | "acquisition" | "activation" | "retention" | "revenue" | "referral";
  /** Stage initial in the classic AARRR graphic: A A A R R R. */
  letter: "A" | "R";
  /** Canonical AARRR term (EN) — kept in English on purpose, it's the model's vocabulary. */
  name: string;
  /** Job-hunt label (ES, product copy). */
  label: string;
  /** What the stage means in growth marketing (ES, educational copy). */
  marketing: string;
  /** Its translation to the job hunt (ES, educational copy). */
  jobHunt: string;
  /** Milestone that marks the stage as reached (stages 3–6 only). */
  milestone?: MilestoneKey;
}

export const FUNNEL_STAGES: readonly FunnelStageSpec[] = [
  {
    id: "awareness",
    letter: "A",
    name: "Awareness",
    label: "Vacantes registradas",
    marketing: "¿A cuánta gente llegás? El tope del embudo: todos los que podrían conocerte.",
    jobHunt: "Cada vacante que registrás acá: el universo al que apuntás, con o sin CV enviado.",
  },
  {
    id: "acquisition",
    letter: "A",
    name: "Acquisition",
    label: "CV enviado",
    marketing: "¿Cuántos visitan tu sitio? El primer contacto real con tu producto.",
    jobHunt: "Aplicaciones donde el CV efectivamente salió: la empresa ya te tiene en la mano.",
  },
  {
    id: "activation",
    letter: "A",
    name: "Activation",
    label: "Respuesta recibida",
    marketing: "¿Cuántos dan el primer paso importante y prueban el valor de tu producto?",
    jobHunt: "La empresa respondió: dejaste de ser un CV en la pila y arrancó la conversación.",
    milestone: "responded",
  },
  {
    id: "retention",
    letter: "R",
    name: "Retention",
    label: "Entrevista",
    marketing: "¿Cuántos vuelven? El interés se repite, no fue un contacto aislado.",
    jobHunt: "Hubo entrevista: la empresa invierte su tiempo en vos, el proceso avanza.",
    milestone: "interview",
  },
  {
    id: "revenue",
    letter: "R",
    name: "Revenue",
    label: "Oferta",
    marketing: "¿Cuántos empiezan a pagar, y cuánto? El interés se convierte en plata.",
    jobHunt: "Te hicieron una oferta: están dispuestos a pagar por tu trabajo.",
    milestone: "offer",
  },
  {
    id: "referral",
    letter: "R",
    name: "Referral",
    label: "Referido",
    marketing: "¿Cuántos te recomiendan a otros? Crecimiento que se alimenta solo.",
    jobHunt: "Alguien te refirió o te recomendó: tu red trabaja para vos.",
    milestone: "referral",
  },
];

/** A funnel stage with its computed counts for a given set of rows. */
export interface FunnelStage extends FunnelStageSpec {
  count: number;
  /** % of Awareness (rounded), null when there are no rows. */
  pctOfTotal: number | null;
  /** % of the previous stage (rounded), null for Awareness or when it counted 0. */
  pctOfPrev: number | null;
}

/**
 * Index of the row's furthest milestone in MILESTONE_KEYS, -1 if none.
 * Counting is cumulative: reaching milestone i implies every stage up to i,
 * even if earlier milestones were never marked (the funnel stays monotonic).
 */
function milestoneRank(row: RegistryRow): number {
  const milestones = row.milestones ?? {};
  for (let i = MILESTONE_KEYS.length - 1; i >= 0; i--) {
    if (milestones[MILESTONE_KEYS[i]]) return i;
  }
  return -1;
}

/** Whether the row reached the funnel stage at `index` (0 = Awareness). */
function reachedStage(row: RegistryRow, index: number): boolean {
  if (index === 0) return true;
  // A Borrador row with a milestone (e.g. a recruiter reached out before any CV
  // went out) still counts as acquired — monotonicity guard.
  if (index === 1) return row.status !== "Borrador" || milestoneRank(row) >= 0;
  return milestoneRank(row) >= index - 2;
}

/** Compute the funnel over all given rows (all-time; archived rows included). */
export function computeFunnel(rows: RegistryRow[]): FunnelStage[] {
  const counts = FUNNEL_STAGES.map(
    (_, index) => rows.filter((row) => reachedStage(row, index)).length,
  );
  const total = counts[0];
  return FUNNEL_STAGES.map((spec, index) => {
    const prev = index > 0 ? counts[index - 1] : null;
    return {
      ...spec,
      count: counts[index],
      pctOfTotal: total > 0 ? Math.round((counts[index] / total) * 100) : null,
      pctOfPrev: prev ? Math.round((counts[index] / prev) * 100) : null,
    };
  });
}
