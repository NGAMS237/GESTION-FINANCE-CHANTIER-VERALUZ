import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { deleteCategory } from "./lib/cascade";
import { must, nullable } from "./lib/rows";

const fields = {
  name: v.string(),
  description: nullable(v.string()),
  color: nullable(v.string()),
};

export const create = mutation({
  args: { project_id: v.id("projects"), ...fields },
  handler: async (ctx, data) => {
    await requireUser(ctx);
    must(await ctx.db.get(data.project_id), "Projet");
    const siblings = await ctx.db
      .query("project_categories")
      .withIndex("by_project", (q) => q.eq("project_id", data.project_id))
      .collect();
    return await ctx.db.insert("project_categories", { ...data, position: siblings.length + 1 });
  },
});

export const update = mutation({
  args: { id: v.id("project_categories"), ...fields },
  handler: async (ctx, { id, ...data }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Catégorie");
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("project_categories") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await deleteCategory(ctx, id);
  },
});
