import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { normalizeEmail, requireUser } from "./lib/access";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return { email: user.email ?? null };
  },
});

// Gestion de la liste blanche, réservée au tableau de bord Convex ou à la CLI :
//   npx convex run users:allowEmail '{"email":"nom@exemple.com"}'

export const allowEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Adresse invalide");
    const existing = await ctx.db
      .query("allowed_emails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing === null) await ctx.db.insert("allowed_emails", { email });
  },
});

export const revokeEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("allowed_emails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing !== null) await ctx.db.delete(existing._id);
  },
});
