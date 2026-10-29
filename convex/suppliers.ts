import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { detachSupplier } from "./lib/cascade";
import { must, nullable } from "./lib/rows";

const fields = {
  name: v.string(),
  speciality: nullable(v.string()),
  phone: nullable(v.string()),
  email: nullable(v.string()),
  address: nullable(v.string()),
  notes: nullable(v.string()),
};

export const create = mutation({
  args: { project_id: v.id("projects"), ...fields },
  handler: async (ctx, data) => {
    await requireUser(ctx);
    must(await ctx.db.get(data.project_id), "Projet");
    return await ctx.db.insert("project_suppliers", data);
  },
});

export const update = mutation({
  args: { id: v.id("project_suppliers"), ...fields },
  handler: async (ctx, { id, ...data }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Fournisseur");
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("project_suppliers") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await detachSupplier(ctx, id);
    await ctx.db.delete(id);
  },
});
