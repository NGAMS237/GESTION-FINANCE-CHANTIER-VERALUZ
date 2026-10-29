import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/access";
import { toRow } from "./lib/rows";

async function loadCategoryTree(ctx: QueryCtx, category: Doc<"project_categories">) {
  const phases = await ctx.db
    .query("project_phases")
    .withIndex("by_category", (q) => q.eq("category_id", category._id))
    .collect();
  const project_phases = await Promise.all(
    phases.map(async (phase) => {
      const quotes = await ctx.db
        .query("project_quotes")
        .withIndex("by_phase", (q) => q.eq("phase_id", phase._id))
        .collect();
      const project_quotes = await Promise.all(
        quotes.map(async (quote) => {
          const payments = await ctx.db
            .query("project_payments")
            .withIndex("by_quote", (q) => q.eq("quote_id", quote._id))
            .collect();
          return { ...toRow(quote), project_payments: payments.map(toRow) };
        }),
      );
      return { ...toRow(phase), project_quotes };
    }),
  );
  return { ...toRow(category), project_phases };
}

/**
 * Tout ce que l'écran affiche pour le projet actif, en une requête réactive
 * (remplace les 4 requêtes de `loadAll()`). Sans `projectId`, prend le premier projet.
 */
export const load = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, { projectId }) => {
    await requireUser(ctx);
    const projects = (await ctx.db.query("projects").collect()).sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
    const active = projects.find((p) => p._id === projectId) ?? projects[0] ?? null;
    if (active === null) {
      return { projects: [], activeProjectId: null, categories: [], suppliers: [], documents: [] };
    }

    const categories = await ctx.db
      .query("project_categories")
      .withIndex("by_project", (q) => q.eq("project_id", active._id))
      .collect();
    const suppliers = await ctx.db
      .query("project_suppliers")
      .withIndex("by_project", (q) => q.eq("project_id", active._id))
      .collect();
    const documents = await ctx.db
      .query("project_documents")
      .withIndex("by_project", (q) => q.eq("project_id", active._id))
      .collect();

    return {
      projects: projects.map(toRow),
      activeProjectId: active._id,
      categories: await Promise.all(categories.map((c) => loadCategoryTree(ctx, c))),
      suppliers: suppliers.map(toRow),
      documents: (
        await Promise.all(
          documents.map(async (d) => ({
            ...toRow(d),
            created_at: d.created_at ?? new Date(d._creationTime).toISOString(),
            file_url: await ctx.storage.getUrl(d.storage_id),
          })),
        )
      ).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  },
});
