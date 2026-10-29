import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { deleteQuote } from "./lib/cascade";
import { must, nullable } from "./lib/rows";
import { paymentFields } from "./payments";

const fields = {
  phase_id: v.id("project_phases"),
  supplier_id: nullable(v.id("project_suppliers")),
  number: nullable(v.string()),
  description: v.string(),
  date: nullable(v.string()),
  amount: v.number(),
  status: nullable(v.string()),
  notes: nullable(v.string()),
};

export const create = mutation({
  args: fields,
  handler: async (ctx, data) => {
    await requireUser(ctx);
    must(await ctx.db.get(data.phase_id), "Phase");
    if (data.supplier_id) must(await ctx.db.get(data.supplier_id), "Fournisseur");
    return await ctx.db.insert("project_quotes", data);
  },
});

/**
 * Met à jour le devis et, si fourni, enregistre un versement dans la même
 * transaction : plus de devis modifié avec un versement perdu.
 */
export const update = mutation({
  args: { id: v.id("project_quotes"), ...fields, payment: v.optional(v.object(paymentFields)) },
  handler: async (ctx, { id, payment, ...data }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Devis");
    must(await ctx.db.get(data.phase_id), "Phase");
    if (data.supplier_id) must(await ctx.db.get(data.supplier_id), "Fournisseur");
    await ctx.db.patch(id, data);
    if (payment) {
      if (!(payment.amount > 0)) throw new ConvexError("Le montant du versement doit être positif");
      await ctx.db.insert("project_payments", { ...payment, quote_id: id });
    }
  },
});

export const setAmount = mutation({
  args: { id: v.id("project_quotes"), amount: v.number() },
  handler: async (ctx, { id, amount }) => {
    await requireUser(ctx);
    must(await ctx.db.get(id), "Devis");
    await ctx.db.patch(id, { amount });
  },
});

export const remove = mutation({
  args: { id: v.id("project_quotes") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await deleteQuote(ctx, id);
  },
});
