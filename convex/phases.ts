import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByCategory = query({
  args: { category_id: v.id("categories") },
  handler: async (ctx, { category_id }) => {
    return await ctx.db
      .query("phases")
      .withIndex("by_category", (q) => q.eq("category_id", category_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    category_id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("phases", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("phases"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    position: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("phases") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("phases").collect();
  },
});
