import type { ApplicationStatus, MilestoneKey, RegistryRow } from "./registry/types";
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
  /**
   * Label the process timeline (MilestoneTimeline) uses instead of `label`, when
   * a stage should read differently there than in the funnel. The funnel keeps
   * its growth vocabulary (`label`, e.g. "CV enviado" = Acquisition); the timeline
   * uses this when set so the first hito's title fits inbound and outbound alike.
   * Falls back to `label`.
   */
  timelineLabel?: string;
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
    // Timeline reads neutral on who initiated: in inbound the CV still ships (you
    // reply with it), in outbound you send it first. Direction lives in `reach`.
    timelineLabel: "CV compartido",
    marketing: "¿Cuántos visitan tu sitio? El primer contacto real con tu producto.",
    jobHunt: "Aplicaciones donde el CV efectivamente salió: la empresa ya te tiene en la mano.",
    milestone: "sent",
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

/**
 * Rows that reached a stage, split by their outcome (= `status`), so each stage
 * bar can be colored/stacked by state. Order matches the funnel stack:
 * accepted (verde) → active (ámbar) → rejected (rojo) → draft (gris).
 */
export interface StatusBreakdown {
  /** Aceptado — terminó bien. */
  accepted: number;
  /** Activo — en curso. */
  active: number;
  /** Rechazado — terminó mal. */
  rejected: number;
  /** Borrador — registrada sin CV. */
  draft: number;
}

/** Bucket order for stacking/legends (green → amber → red → gray). */
export const STATUS_BUCKETS = ["accepted", "active", "rejected", "draft"] as const;

export type StatusBucket = (typeof STATUS_BUCKETS)[number];

/** Which breakdown bucket a row's status falls into. */
const STATUS_BUCKET: Record<ApplicationStatus, StatusBucket> = {
  Aceptado: "accepted",
  Activo: "active",
  Rechazado: "rejected",
  Borrador: "draft",
};

/** A funnel stage with its computed counts for a given set of rows. */
export interface FunnelStage extends FunnelStageSpec {
  count: number;
  /** The `count` split by outcome/status of the rows that reached this stage. */
  byStatus: StatusBreakdown;
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

/**
 * `funnelRanks` for the "flecha a la diana" animation in `mode="funnel"`
 * (docs/animations.md §2 "Modo funnel") — one rank 0-4 per row, same
 * order/length as `rows`. Clamps `milestoneRank`'s -1 ("no milestone yet")
 * up to 0: the caller is expected to already have scoped `rows` to sent CVs
 * (`!cvPending`), which is itself the `sent` milestone (rank 0), so nothing
 * in-scope should actually read as "less than sent".
 */
export function funnelRanksFor(rows: readonly RegistryRow[]): number[] {
  return rows.map((row) => Math.max(0, milestoneRank(row)));
}

/**
 * Whether the row reached the funnel stage at `index` (0 = Awareness).
 * Milestones map to stages 1..5 (`sent`→Acquisition … `referral`→Referral), so
 * stage `i` is reached when `milestoneRank >= i - 1`.
 */
function reachedStage(row: RegistryRow, index: number): boolean {
  if (index === 0) return true;
  // Aceptado = terminó bien = llegó hasta el final: cuenta en todas las etapas,
  // haya o no hitos marcados. Es el único estado que llega al fondo del embudo.
  if (row.status === "Aceptado") return true;
  // Acquisition ("CV enviado"): the `sent` milestone (auto-set on generation).
  // Fallback to status for legacy generated rows without the milestone, and a
  // Borrador with a later milestone (recruiter reached out) — monotonicity guard.
  if (index === 1) return milestoneRank(row) >= 0 || row.status !== "Borrador";
  return milestoneRank(row) >= index - 1;
}

/** Compute the funnel over all given rows (all-time; archived rows included). */
export function computeFunnel(rows: RegistryRow[]): FunnelStage[] {
  const reachedByStage = FUNNEL_STAGES.map((_, index) =>
    rows.filter((row) => reachedStage(row, index)),
  );
  const counts = reachedByStage.map((reached) => reached.length);
  const total = counts[0];
  return FUNNEL_STAGES.map((spec, index) => {
    const prev = index > 0 ? counts[index - 1] : null;
    const byStatus: StatusBreakdown = { accepted: 0, active: 0, rejected: 0, draft: 0 };
    for (const row of reachedByStage[index]) byStatus[STATUS_BUCKET[row.status]] += 1;
    return {
      ...spec,
      count: counts[index],
      byStatus,
      pctOfTotal: total > 0 ? Math.round((counts[index] / total) * 100) : null,
      pctOfPrev: prev ? Math.round((counts[index] / prev) * 100) : null,
    };
  });
}
