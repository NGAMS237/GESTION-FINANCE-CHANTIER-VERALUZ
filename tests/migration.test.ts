import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./setup";

const rows = {
  projects: [{ id: "p1", name: "Résidence", budget: "150000000", position: 1, location: "Kribi", created_at: "2025-01-01" }],
  project_categories: [{ id: "c1", project_id: "p1", name: "Gros œuvre", position: 1 }],
  project_phases: [{ id: "ph1", category_id: "c1", name: "Fondations", status: "en_cours", position: null }],
  project_suppliers: [{ id: "s1", project_id: "p1", name: "BTP Kribi" }],
  project_quotes: [
    { id: "q1", phase_id: "ph1", supplier_id: "s1", description: "Béton", amount: "2000000", status: "approved" },
    { id: "q2", phase_id: "ph1", supplier_id: "s-supprime", description: "Fer", amount: 500000 },
  ],
  project_payments: [{ id: "pay1", quote_id: "q1", date: "2026-10-01", amount: 1000000, note: "Acompte" }],
  project_documents: [{ id: "d1", project_id: "p1", name: "Devis", file_name: "devis.pdf", file_path: "p1/devis.pdf", created_at: "2026-09-01T10:00:00+00:00" }],
} as const;

async function importAll(t: ReturnType<typeof convexTest>) {
  const results: Record<string, unknown> = {};
  for (const [table, list] of Object.entries(rows)) {
    results[table] = await t.mutation(internal.migration.importRows, { table: table as any, rows: list as any });
  }
  return results;
}

describe("import Supabase", () => {
  it("importe les tables en résolvant les UUID et vérifie les totaux", async () => {
    const t = convexTest(schema, modules);
    await importAll(t);
    const totals = await t.query(internal.migration.totals, {});
    expect(totals).toEqual({
      p1: { budget: 150000000, quotes: 2, engage: 2500000, paid: 1000000, payments: 1, documents: 1 },
    });
    const q2 = await t.run((ctx) => ctx.db.query("project_quotes").withIndex("by_legacy_id", (q) => q.eq("legacy_id", "q2")).first());
    expect(q2?.supplier_id).toBeNull();
  });

  it("peut être relancé sans créer de doublons", async () => {
    const t = convexTest(schema, modules);
    await importAll(t);
    const second = await importAll(t);
    expect(second.project_quotes).toEqual({ inserted: 0, skipped: 2 });
  });

  it("refuse une ligne dont le parent obligatoire manque", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.migration.importRows, {
      table: "project_payments", rows: [{ id: "x", quote_id: "absent", date: "2026-01-01", amount: 1 }],
    })).rejects.toThrow("introuvable");
  });

  it("rattache le fichier téléchargé au document", async () => {
    const t = convexTest(schema, modules);
    await importAll(t);
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["%PDF"], { type: "application/pdf" })));
    await t.mutation(internal.migration.attachFile, { legacyId: "d1", storageId });
    const doc = await t.run((ctx) => ctx.db.query("project_documents").first());
    expect(doc).toMatchObject({ storage_id: storageId, file_size: 4, mime_type: "application/pdf", created_at: "2026-09-01T10:00:00+00:00" });
    expect(await t.query(internal.migration.documentHasFile, { legacyId: "d1" })).toBe(true);
  });
});
