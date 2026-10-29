import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { TableNames } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

// Import des données Supabase (scripts/import-supabase.mjs). Fonctions internes :
// appelables seulement par `npx convex run`, jamais depuis le navigateur.

type Spec = { fields: string[]; fks: Record<string, TableNames> };
const TABLES: Record<string, Spec> = {
  projects: {
    fields: ["name", "location", "owner_name", "budget", "start_date", "description", "color", "position"],
    fks: {},
  },
  project_categories: {
    fields: ["name", "description", "color", "position"],
    fks: { project_id: "projects" },
  },
  project_phases: {
    fields: ["name", "description", "status", "position"],
    fks: { category_id: "project_categories" },
  },
  project_suppliers: {
    fields: ["name", "speciality", "phone", "email", "address", "notes"],
    fks: { project_id: "projects" },
  },
  project_quotes: {
    fields: ["number", "description", "date", "amount", "status", "notes"],
    fks: { phase_id: "project_phases", supplier_id: "project_suppliers" },
  },
  project_payments: {
    fields: ["date", "amount", "method", "reference", "note"],
    fks: { quote_id: "project_quotes" },
  },
  project_documents: {
    fields: ["name", "doc_type", "doc_date", "amount", "description", "file_name", "file_size", "mime_type", "created_at"],
    fks: { project_id: "projects", supplier_id: "project_suppliers", cat_id: "project_categories" },
  },
};
const NUMERIC = new Set(["budget", "position", "amount", "file_size"]);
const REQUIRED_NUMBER = new Set(["budget", "position", "amount"]);

const tableArg = v.union(...Object.keys(TABLES).map((t) => v.literal(t)));

/** Insère des lignes Supabase ; ignore celles déjà importées (relançable). */
export const importRows = internalMutation({
  args: { table: tableArg, rows: v.array(v.any()) },
  handler: async (ctx, { table, rows }) => {
    const spec = TABLES[table]!;
    let inserted = 0, skipped = 0;
    for (const row of rows) {
      const legacyId = String(row.id);
      const existing = await ctx.db
        .query(table as any)
        .withIndex("by_legacy_id", (q: any) => q.eq("legacy_id", legacyId))
        .first();
      if (existing) { skipped++; continue; }

      const doc: Record<string, unknown> = { legacy_id: legacyId };
      for (const f of spec.fields) {
        let value = row[f];
        if (value === undefined || (value === null && f === "created_at")) continue;
        if (NUMERIC.has(f) && value !== null) value = Number(value);
        if (f === "created_at") value = String(value);
        doc[f] = value;
      }
      for (const f of REQUIRED_NUMBER) {
        if (spec.fields.includes(f) && (doc[f] === undefined || doc[f] === null)) doc[f] = 0;
      }
      for (const [f, target] of Object.entries(spec.fks)) {
        if (row[f] === null || row[f] === undefined) { doc[f] = null; continue; }
        const parent = await ctx.db
          .query(target as any)
          .withIndex("by_legacy_id", (q: any) => q.eq("legacy_id", String(row[f])))
          .first();
        if (!parent) {
          // Fournisseur ou catégorie disparus : on détache. Parent obligatoire : erreur.
          if (f === "supplier_id" || f === "cat_id") { doc[f] = null; continue; }
          throw new ConvexError(`${table} ${legacyId} : ${f}=${row[f]} introuvable dans ${target}`);
        }
        doc[f] = parent._id;
      }
      await ctx.db.insert(table as any, doc as any);
      inserted++;
    }
    return { inserted, skipped };
  },
});

/** Télécharge un fichier du bucket Supabase public et le rattache à son document. */
export const importFile = internalAction({
  args: { legacyId: v.string(), url: v.string() },
  handler: async (ctx, { legacyId, url }) => {
    const already = await ctx.runQuery(internal.migration.documentHasFile, { legacyId });
    if (already) return "déjà importé";
    const res = await fetch(url);
    if (!res.ok) throw new ConvexError(`Téléchargement impossible (${res.status}) : ${url}`);
    const storageId = await ctx.storage.store(await res.blob());
    await ctx.runMutation(internal.migration.attachFile, { legacyId, storageId });
    return "importé";
  },
});

export const documentHasFile = internalQuery({
  args: { legacyId: v.string() },
  handler: async (ctx, { legacyId }) => {
    const doc = await ctx.db
      .query("project_documents")
      .withIndex("by_legacy_id", (q) => q.eq("legacy_id", legacyId))
      .first();
    if (!doc) throw new ConvexError(`Document ${legacyId} non importé`);
    return !!doc.storage_id;
  },
});

export const attachFile = internalMutation({
  args: { legacyId: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { legacyId, storageId }) => {
    const doc = await ctx.db
      .query("project_documents")
      .withIndex("by_legacy_id", (q) => q.eq("legacy_id", legacyId))
      .first();
    if (!doc) throw new ConvexError(`Document ${legacyId} non importé`);
    const file = await ctx.db.system.get(storageId);
    await ctx.db.patch(doc._id, {
      storage_id: storageId,
      file_size: file?.size ?? null,
      mime_type: file?.contentType ?? doc.mime_type ?? null,
    });
  },
});

/** Totaux par projet (UUID Supabase) pour comparer avant/après l'import. */
export const totals = internalQuery({
  args: {},
  handler: async (ctx) => {
    const out: Record<string, { budget: number; quotes: number; engage: number; paid: number; payments: number; documents: number }> = {};
    const quotesByPhase = new Map<string, { amount: number; id: string }[]>();
    for (const q of await ctx.db.query("project_quotes").collect()) {
      const list = quotesByPhase.get(q.phase_id) ?? [];
      list.push({ amount: q.amount, id: q._id });
      quotesByPhase.set(q.phase_id, list);
    }
    const paidByQuote = new Map<string, { sum: number; n: number }>();
    for (const p of await ctx.db.query("project_payments").collect()) {
      const cur = paidByQuote.get(p.quote_id) ?? { sum: 0, n: 0 };
      paidByQuote.set(p.quote_id, { sum: cur.sum + p.amount, n: cur.n + 1 });
    }
    const phases = await ctx.db.query("project_phases").collect();
    const categories = await ctx.db.query("project_categories").collect();
    const documents = await ctx.db.query("project_documents").collect();
    for (const project of await ctx.db.query("projects").collect()) {
      const t = { budget: project.budget, quotes: 0, engage: 0, paid: 0, payments: 0, documents: 0 };
      for (const c of categories.filter((c) => c.project_id === project._id)) {
        for (const ph of phases.filter((ph) => ph.category_id === c._id)) {
          for (const q of quotesByPhase.get(ph._id) ?? []) {
            t.quotes++; t.engage += q.amount;
            const p = paidByQuote.get(q.id);
            if (p) { t.paid += p.sum; t.payments += p.n; }
          }
        }
      }
      t.documents = documents.filter((d) => d.project_id === project._id).length;
      out[project.legacy_id ?? project._id] = t;
    }
    return out;
  },
});
