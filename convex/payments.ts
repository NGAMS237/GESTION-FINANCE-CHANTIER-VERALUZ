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

export const listByProject = query({
  args: { project_id: v.id("projects") },
  handler: async (ctx, { project_id }) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_project", (q) => q.eq("project_id", project_id))
      .collect();
    const catIds = new Set(categories.map((c) => c._id));
    const phases = await ctx.db.query("phases").collect();
    const phaseIds = new Set(phases.filter((p) => catIds.has(p.category_id)).map((p) => p._id));
    const quotes = await ctx.db.query("quotes").collect();
    const quoteIds = new Set(quotes.filter((q) => phaseIds.has(q.phase_id)).map((q) => q._id));
    const all = await ctx.db.query("payments").collect();
    return all.filter((p) => quoteIds.has(p.quote_id));
  },
});
