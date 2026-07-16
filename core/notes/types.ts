/**
 * General notes: free-standing markdown notes about the job search as a
 * whole, NOT tied to any application row (compare `RegistryRow.notes`, a
 * single per-row field). Several independent notes, each with a title.
 */
export interface GeneralNote {
  /** Stable unique id (generated at creation). */
  id: string;
  title: string;
  /** Markdown body. */
  body: string;
  /** Creation timestamp (ISO). */
  createdAt?: string;
}

/** Fields editable after creation — everything except identity/timestamps. */
export type EditableGeneralNoteFields = Partial<Omit<GeneralNote, "id" | "createdAt">>;

/**
 * Storage for the notes list. Same triple-store pattern as the registry:
 * file store locally, Supabase on deploy, API store in the browser.
 */
export interface GeneralNotesStore {
  list(): Promise<GeneralNote[]>;
  add(note: GeneralNote): Promise<void>;
  update(id: string, fields: EditableGeneralNoteFields): Promise<void>;
  remove(id: string): Promise<void>;
}
