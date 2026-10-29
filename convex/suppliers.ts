import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { project_id: v.id("projects") },
  handler: async (ctx, { project_id }) => {
    return await ctx.db
      .query("suppliers")
      .withIndex("by_project", (q) => q.eq("project_id", project_id))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("suppliers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    project_id: v.id("projects"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    speciality: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("suppliers", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    speciality: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
