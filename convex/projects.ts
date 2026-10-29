import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    budget: v.number(),
    currency: v.string(),
    start_date: v.optional(v.string()),
    status: v.string(),
    color: v.string(),
    owner_name: v.optional(v.string()),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    budget: v.optional(v.number()),
    currency: v.optional(v.string()),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    status: v.optional(v.string()),
    color: v.optional(v.string()),
    owner_name: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
