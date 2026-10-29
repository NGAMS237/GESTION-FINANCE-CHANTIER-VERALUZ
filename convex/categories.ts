import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { project_id: v.id("projects") },
  handler: async (ctx, { project_id }) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_project", (q) => q.eq("project_id", project_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    project_id: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.string(),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    position: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
