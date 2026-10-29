import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { must, nullable } from "./lib/rows";

export const paymentFields = {
  date: v.string(),
  amount: v.number(),
  method: nullable(v.string()),
  reference: nullable(v.string()),
  note: nullable(v.string()),
};

export const create = mutation({
  args: { quote_id: v.id("project_quotes"), ...paymentFields },
  handler: async (ctx, data) => {
    await requireUser(ctx);
    must(await ctx.db.get(data.quote_id), "Devis");
    if (!(data.amount > 0)) throw new Error("Le montant doit être positif");
    return await ctx.db.insert("project_payments", data);
  },
});

export const setAmount = mutation({
  args: { id: v.id("project_payments"), amount: v.number() },
  handler: async (ctx, { id, amount }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Versement");
    if (!(amount > 0)) throw new Error("Le montant doit être positif");
    await ctx.db.patch(id, { amount });
  },
});

export const remove = mutation({
  args: { id: v.id("project_payments") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await ctx.db.delete(id);
  },
});
