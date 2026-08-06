import type { CoverLetterTemplatesStore } from "@/core/coverLetter/types";
import type { GeneralNotesStore } from "@/core/notes/types";
import type { PortfolioCvStore } from "@/core/portfolioCv/types";
import type { RegistryStore } from "@/core/registry/types";
import type { ScreeningStore } from "@/core/screening/types";
import type { StableLinksStore } from "@/core/stableLinks/types";
import { ApiCoverLetterTemplatesStore } from "./apiCoverLetterTemplatesStore";
import { ApiGeneralNotesStore } from "./apiNotesStore";
import { ApiPortfolioCvStore } from "./apiPortfolioCvStore";
import { ApiScreeningStore } from "./apiScreeningStore";
import { ApiStableLinksStore } from "./apiStableLinksStore";
import { ApiRegistryStore } from "./apiStore";

let store: RegistryStore | null = null;
let notesStore: GeneralNotesStore | null = null;
let stableLinksStore: StableLinksStore | null = null;
let coverLetterTemplatesStore: CoverLetterTemplatesStore | null = null;
let screeningStore: ScreeningStore | null = null;
let portfolioCvStore: PortfolioCvStore | null = null;

/**
 * Single entry point to the registry store (client side). The browser **always**
 * goes through the app's own API routes (`ApiRegistryStore` → `/api/registry`);
 * the durable backend lives behind the server (`getServerRegistryStore`: Supabase
 * with a service key on deploy, file store locally), so the private registry is
 * never exposed to the client via a public anon key. See docs/deploy.md.
 */
export function getRegistryStore(): RegistryStore {
  if (store) return store;
  store = new ApiRegistryStore();
  return store;
}

/** Single entry point to the general-notes store (API path; durable backend server-side). */
export function getGeneralNotesStore(): GeneralNotesStore {
  if (notesStore) return notesStore;
  notesStore = new ApiGeneralNotesStore();
  return notesStore;
}

/** Single entry point to the stable-links store (local file/API path for now). */
export function getStableLinksStore(): StableLinksStore {
  if (stableLinksStore) return stableLinksStore;
  stableLinksStore = new ApiStableLinksStore();
  return stableLinksStore;
}

/** Single entry point to the cover-letter-templates store (API path; durable backend server-side). */
export function getCoverLetterTemplatesStore(): CoverLetterTemplatesStore {
  if (coverLetterTemplatesStore) return coverLetterTemplatesStore;
  coverLetterTemplatesStore = new ApiCoverLetterTemplatesStore();
  return coverLetterTemplatesStore;
}

/** Single entry point to the screening-questions store (API path; durable backend server-side). */
export function getScreeningStore(): ScreeningStore {
  if (screeningStore) return screeningStore;
  screeningStore = new ApiScreeningStore();
  return screeningStore;
}

/** Single entry point to the portfolio-CV publication store (API path; durable backend server-side). */
export function getPortfolioCvStore(): PortfolioCvStore {
  if (portfolioCvStore) return portfolioCvStore;
  portfolioCvStore = new ApiPortfolioCvStore();
  return portfolioCvStore;
}
