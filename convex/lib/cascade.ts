import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// Suppressions en cascade, exécutées dans la transaction de la mutation appelante.

export async function deleteQuote(ctx: MutationCtx, quoteId: Id<"project_quotes">) {
  const payments = await ctx.db
    .query("project_payments")
    .withIndex("by_quote", (q) => q.eq("quote_id", quoteId))
    .collect();
  for (const p of payments) await ctx.db.delete(p._id);
  await ctx.db.delete(quoteId);
}

export async function deletePhase(ctx: MutationCtx, phaseId: Id<"project_phases">) {
  const quotes = await ctx.db
    .query("project_quotes")
    .withIndex("by_phase", (q) => q.eq("phase_id", phaseId))
    .collect();
  for (const q of quotes) await deleteQuote(ctx, q._id);
  await ctx.db.delete(phaseId);
}

export async function deleteCategory(ctx: MutationCtx, categoryId: Id<"project_categories">) {
  const phases = await ctx.db
    .query("project_phases")
    .withIndex("by_category", (q) => q.eq("category_id", categoryId))
    .collect();
  for (const p of phases) await deletePhase(ctx, p._id);
  await ctx.db.delete(categoryId);
}

export async function deleteDocument(ctx: MutationCtx, documentId: Id<"project_documents">) {
  const doc = await ctx.db.get(documentId);
  if (doc === null) return;
  await ctx.storage.delete(doc.storage_id);
  await ctx.db.delete(documentId);
}

/** Détache un fournisseur supprimé de ses devis et documents. */
export async function detachSupplier(ctx: MutationCtx, supplierId: Id<"project_suppliers">) {
  const quotes = await ctx.db
    .query("project_quotes")
    .withIndex("by_supplier", (q) => q.eq("supplier_id", supplierId))
    .collect();
  for (const q of quotes) await ctx.db.patch(q._id, { supplier_id: null });
  const docs = await ctx.db
    .query("project_documents")
    .withIndex("by_supplier", (q) => q.eq("supplier_id", supplierId))
    .collect();
  for (const d of docs) await ctx.db.patch(d._id, { supplier_id: null });
}
