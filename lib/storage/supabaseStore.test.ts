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
});
