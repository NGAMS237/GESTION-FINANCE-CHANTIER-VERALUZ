import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { deleteCategory, deleteDocument } from "./lib/cascade";
import { must, nullable } from "./lib/rows";

const fields = {
  name: v.string(),
  location: nullable(v.string()),
  owner_name: nullable(v.string()),
  budget: v.number(),
  start_date: nullable(v.string()),
  description: nullable(v.string()),
  color: nullable(v.string()),
};

export const create = mutation({
  args: fields,
  handler: async (ctx, data) => {
    await requireUser(ctx);
    const count = (await ctx.db.query("projects").collect()).length;
    return await ctx.db.insert("projects", { ...data, position: count + 1 });
  },
});

export const update = mutation({
  args: { id: v.id("projects"), ...fields },
  handler: async (ctx, { id, ...data }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Projet");
    await ctx.db.patch(id, data);
  },
});

export const setBudget = mutation({
  args: { id: v.id("projects"), budget: v.number() },
  handler: async (ctx, { id, budget }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Projet");
    await ctx.db.patch(id, { budget });
  },
});

/** Supprime le projet et tout ce qui en dépend, fichiers compris. */
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const categories = await ctx.db
      .query("project_categories")
      .withIndex("by_project", (q) => q.eq("project_id", id))
      .collect();
    for (const c of categories) await deleteCategory(ctx, c._id);
    const documents = await ctx.db
      .query("project_documents")
      .withIndex("by_project", (q) => q.eq("project_id", id))
      .collect();
    for (const d of documents) await deleteDocument(ctx, d._id);
    const suppliers = await ctx.db
      .query("project_suppliers")
      .withIndex("by_project", (q) => q.eq("project_id", id))
      .collect();
    for (const s of suppliers) await ctx.db.delete(s._id);
    await ctx.db.delete(id);
  },
});
