import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByQuote = query({
  args: { quote_id: v.id("quotes") },
  handler: async (ctx, { quote_id }) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_quote", (q) => q.eq("quote_id", quote_id))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("payments").collect();
  },
});

export const create = mutation({
  args: {
    quote_id: v.id("quotes"),
    date: v.string(),
    amount: v.number(),
    method: v.string(),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("payments"),
    date: v.optional(v.string()),
    amount: v.optional(v.number()),
    method: v.optional(v.string()),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
