import type { Language } from "../types";
import type { CvData } from "./types";
import enData from "../../assets/cv-data/en.json";
import esData from "../../assets/cv-data/es.json";

// The `as CvData` casts give a compile-time check that each JSON conforms to
// the type — a missing field or wrong shape fails the build.
const DATA: Record<Language, CvData> = {
  EN: enData as CvData,
  ES: esData as CvData,
};

/** The structured CV content for a language — source of truth for the ATS mode. */
export function cvDataFor(language: Language): CvData {
  return DATA[language];
}

export type { CvData } from "./types";
