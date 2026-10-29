import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import { isEmailAllowed, normalizeEmail } from "./lib/access";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return { email: normalizeEmail(String(params.email ?? "")) };
      },
      validatePasswordRequirements(password) {
        if (password.length < 10) {
          throw new Error("Le mot de passe doit contenir au moins 10 caractères");
        }
      },
    }),
  ],
  callbacks: {
    // Refuse la création d'un compte pour une adresse hors liste blanche.
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId !== null) return existingUserId;
      const email = normalizeEmail(profile.email ?? "");
      // Le callback reçoit un contexte non typé ; le schéma est bien celui de l'app.
      if (!(await isEmailAllowed(ctx as unknown as MutationCtx, email))) {
        throw new Error("Adresse e-mail non autorisée");
      }
      return await ctx.db.insert("users", { email });
    },
  },
});
