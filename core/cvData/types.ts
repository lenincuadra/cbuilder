import type { Language } from "../types";

/**
 * Structured source of truth for Lenin's CV content, bootstrapped from the
 * `.docx` masters (one file per language in `assets/cv-data/`). This is the
 * input to the "ATS máximo" mode, which assembles a fresh CV per application
 * from this data + the parsed JD — never editing the master.
 *
 * Privacy note: unlike the registry (who Lenin applied to), CV content is NOT
 * private (the masters already live committed in `assets/`), so these files
 * are committed.
 */
export interface CvData {
  language: Language;
  name: string;
  /**
   * Default headline (e.g. "Senior Product Designer · AI Adoption Lead"). In
   * the ATS mode this is replaced by the JD's exact job title when verified.
   */
  title: string;
  /** Location + availability line, e.g. "Córdoba, Argentina · Open to Remote & Hybrid". */
  location: string;
  /** Display text for the three tracked links; the tracked URLs are baked at generation time. */
  links: {
    portfolio: string;
    github: string;
    linkedin: string;
  };
  contact: {
    email: string;
    phone: string;
  };
  summary: string;
  experience: ExperienceEntry[];
  skills: SkillCategory[];
  certifications: Certification[];
  education: EducationEntry[];
  /** Localized section headers (the masters differ EN/ES). Includes the two ATS-mode sections. */
  sectionTitles: SectionTitles;
}

export interface ExperienceEntry {
  /** e.g. "Product Designer · AI Adoption Lead". */
  role: string;
  company: string;
  /** e.g. "Mar 2024 – Present". */
  dates: string;
  /** Context lines shown between the role header and the bullets (client, scope…). */
  context: string[];
  bullets: string[];
}

export interface SkillCategory {
  /** e.g. "AI & Emerging Tools". */
  category: string;
  items: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  dates: string;
}

export interface SectionTitles {
  summary: string;
  experience: string;
  skills: string;
  certifications: string;
  education: string;
  /** ATS mode only — verbatim JD keywords Lenin has. */
  coreCompetencies: string;
  /** ATS mode only — company values from the JD paired with real facts. */
  valuesAlignment: string;
}
