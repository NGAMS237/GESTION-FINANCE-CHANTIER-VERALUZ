import { getAuthUserId } from "@convex-dev/auth/server";
import type { DatabaseReader, QueryCtx } from "../_generated/server";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isEmailAllowed(
  ctx: { db: DatabaseReader },
  email: string,
): Promise<boolean> {
  if (!email) return false;
  const row = await ctx.db
    .query("allowed_emails")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  return row !== null;
}

/**
 * Vérifie que l'appelant est connecté et que son adresse figure toujours dans
 * la liste blanche : retirer une adresse coupe l'accès immédiatement.
 */
export async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Non authentifié");
  const user = await ctx.db.get(userId);
  if (!user?.email || !(await isEmailAllowed(ctx, normalizeEmail(user.email)))) {
    throw new Error("Accès refusé");
  }
  return user;
}
