import { describe, expect, it } from "vitest";
import { dbToRow, editableToDb, rowToDb } from "./supabaseStore";
import type { RegistryRow } from "../../core/registry/types";

const fullRow: RegistryRow = {
  code: "0628a2",
  company: "GlobalLogic",
  role: "UX/UI Designer",
  channel: "LinkedIn",
  date: "2026-06-28",
  notes: "2da entrevista",
  status: "Activo",
  who: "Jane",
  jobUrl: "https://jobs.example/123",
  language: "Ambos",
  createdAt: "2026-06-28T12:00:00.000Z",
  updates: [{ at: "2026-06-28T13:00:00.000Z", message: "2da entrevista agendada" }],
  archived: false,
};

describe("supabase row mapping", () => {
  it("round-trips a full row through db and back", () => {
    expect(dbToRow(rowToDb(fullRow))).toEqual(fullRow);
  });

  it("maps camelCase to snake_case columns", () => {
    const db = rowToDb(fullRow);
    expect(db.job_url).toBe("https://jobs.example/123");
    expect(db.created_at).toBe("2026-06-28T12:00:00.000Z");
  });

  it("converts undefined optionals to null for the db", () => {
    const minimal: RegistryRow = {
      code: "0628b3",
      company: "Acme",
      role: "UX/UI Designer",
      date: "2026-06-28",
      status: "Activo",
    };
    const db = rowToDb(minimal);
    expect(db.channel).toBeNull();
    expect(db.notes).toBeNull();
    expect(db.job_url).toBeNull();
    // and back to undefined
    expect(dbToRow(db).channel).toBeUndefined();
    expect(dbToRow(db).notes).toBeUndefined();
  });

  it("builds a partial update for editable fields only", () => {
    expect(editableToDb({ status: "Rechazado" })).toEqual({ status: "Rechazado" });
    expect(editableToDb({ notes: undefined })).toEqual({ notes: null });
    expect(editableToDb({ notes: "x", status: "Activo" })).toEqual({ notes: "x", status: "Activo" });
    expect(editableToDb({ archived: true })).toEqual({ archived: true });
    const updates = [{ at: "2026-06-28T13:00:00.000Z", message: "ok" }];
    expect(editableToDb({ updates })).toEqual({ updates });
  });

  it("round-trips a pending row and its deferred-generation clear", () => {
    const pending: RegistryRow = {
      code: "0712c4",
      company: "Acme",
      role: "UX/UI Designer",
      date: "2026-07-12",
      status: "Activo",
      cvPending: true,
    };
    const db = rowToDb(pending);
    expect(db.cv_pending).toBe(true);
    expect(db.delivery_files).toBeNull();
    expect(dbToRow(db).cvPending).toBe(true);

    // Clearing the flag maps to false in the db and back to "absent" on the row.
    expect(editableToDb({ cvPending: false })).toEqual({ cv_pending: false });
    expect(dbToRow({ ...db, cv_pending: false }).cvPending).toBeUndefined();
  });

  it("maps the archived delivery files", () => {
    const files = ["EN_acme_0628a2/Lenin_Cuadra_CV.docx"];
    expect(editableToDb({ deliveryFiles: files })).toEqual({ delivery_files: files });
    const db = rowToDb({ ...fullRow, deliveryFiles: files });
    expect(db.delivery_files).toEqual(files);
    expect(dbToRow(db).deliveryFiles).toEqual(files);
  });
});
