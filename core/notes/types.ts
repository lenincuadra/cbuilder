/**
 * Storage abstraction for the app's general notes — a single free-text
 * (markdown) document that is NOT tied to any application row. Cross-cutting
 * notes about the job search as a whole.
 *
 * Mirrors RegistryStore: local file/API now, Supabase later, without touching
 * core/ or ui/. Modeled as its own table/document (not a registry row) so it
 * maps cleanly onto a future DB.
 */
export interface GeneralNotesStore {
  /** The current notes markdown; empty string when nothing has been saved yet. */
  get(): Promise<string>;
  /** Replace the notes markdown (empty string clears it). */
  set(notes: string): Promise<void>;
}
