import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { project_id: v.id("projects") },
  handler: async (ctx, { project_id }) => {
    return await ctx.db.query("members").withIndex("by_project", q => q.eq("project_id", project_id)).collect();
  },
});

export const create = mutation({
  args: {
    project_id: v.id("projects"),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("members", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("members"),
    role: v.string(),
  },
  handler: async (ctx, { id, role }) => {
    await ctx.db.patch(id, { role });
  },
});

export const remove = mutation({
  args: { id: v.id("members") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
