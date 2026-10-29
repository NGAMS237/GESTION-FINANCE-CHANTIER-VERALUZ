import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { deletePhase } from "./lib/cascade";
import { must, nullable } from "./lib/rows";

const fields = {
  category_id: v.id("project_categories"),
  name: v.string(),
  description: nullable(v.string()),
  status: nullable(v.string()),
};

export const create = mutation({
  args: fields,
  handler: async (ctx, data) => {
    await requireUser(ctx);
    must(await ctx.db.get(data.category_id), "Catégorie");
    const siblings = await ctx.db
      .query("project_phases")
      .withIndex("by_category", (q) => q.eq("category_id", data.category_id))
      .collect();
    return await ctx.db.insert("project_phases", { ...data, position: siblings.length + 1 });
  },
});

export const update = mutation({
  args: { id: v.id("project_phases"), ...fields },
  handler: async (ctx, { id, ...data }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Phase");
    must(await ctx.db.get(data.category_id), "Catégorie");
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("project_phases") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await deletePhase(ctx, id);
  },
});
