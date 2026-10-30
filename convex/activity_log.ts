import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { project_id: v.id("projects") },
  handler: async (ctx, { project_id }) => {
    return await ctx.db.query("activity_log").withIndex("by_project", q => q.eq("project_id", project_id)).order("desc").take(50);
  },
});

export const log = mutation({
  args: {
    project_id: v.id("projects"),
    action: v.string(),
    entity_type: v.string(),
    entity_label: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activity_log", args);
  },
});
