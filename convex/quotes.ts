import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPhase = query({
  args: { phase_id: v.id("phases") },
  handler: async (ctx, { phase_id }) => {
    return await ctx.db
      .query("quotes")
      .withIndex("by_phase", (q) => q.eq("phase_id", phase_id))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("quotes").collect();
  },
});

export const get = query({
  args: { id: v.id("quotes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    phase_id: v.id("phases"),
    supplier_id: v.optional(v.id("suppliers")),
    number: v.optional(v.string()),
    description: v.string(),
    date: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quotes", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("quotes"),
    supplier_id: v.optional(v.id("suppliers")),
    number: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("quotes") },
  handler: async (ctx, { id }) => {
    // Delete associated payments first
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_quote", (q) => q.eq("quote_id", id))
      .collect();
    for (const p of payments) {
      await ctx.db.delete(p._id);
    }
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
    const all = await ctx.db.query("quotes").collect();
    return all.filter((q) => phaseIds.has(q.phase_id));
  },
});
