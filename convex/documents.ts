import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { project_id: v.id("projects") },
  handler: async (ctx, { project_id }) => {
    return await ctx.db.query("documents").withIndex("by_project", q => q.eq("project_id", project_id)).collect();
  },
});

export const create = mutation({
  args: {
    project_id: v.id("projects"),
    name: v.string(),
    storage_id: v.optional(v.string()),
    url: v.optional(v.string()),
    file_type: v.string(),
    size: v.optional(v.number()),
    category: v.string(),
    linked_to_type: v.optional(v.string()),
    linked_to_id: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", args);
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});
