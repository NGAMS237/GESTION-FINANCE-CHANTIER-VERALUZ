/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../convex/schema";

export const modules = import.meta.glob("../convex/**/*.ts");

/** Déploiement de test avec un utilisateur connecté, autorisé ou non. */
export async function setup({ allowed = true, email = "chef@veraluz.cm" } = {}) {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => {
    if (allowed) await ctx.db.insert("allowed_emails", { email });
    return await ctx.db.insert("users", { email });
  });
  // getAuthUserId lit l'identifiant utilisateur avant le « | » du subject.
  const as = t.withIdentity({ subject: `${userId}|session-test` });
  return { t, as, userId };
}
