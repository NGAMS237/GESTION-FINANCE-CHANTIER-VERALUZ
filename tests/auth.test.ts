import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { modules } from "./setup";

// Clés JWT jetables, comme celles que `npx @convex-dev/auth` génère pour un déploiement.
beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  process.env.JWT_PRIVATE_KEY = (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " ");
  process.env.JWKS = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(publicKey)) }] });
  process.env.SITE_URL = "http://localhost";
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
});

const signUp = (email: string, password = "motdepasse-solide") =>
  ({ provider: "password", params: { email, password, flow: "signUp" } });

describe("connexion e-mail + mot de passe", () => {
  it("refuse la création d'un compte hors liste blanche", async () => {
    const t = convexTest(schema, modules);
    await expect(t.action(api.auth.signIn, signUp("inconnu@exemple.com"))).rejects.toThrow("non autorisée");
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(0);
  });

  it("crée le compte d'une adresse autorisée puis permet de se reconnecter", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.users.allowEmail, { email: "Chef@Veraluz.cm" });

    const created = await t.action(api.auth.signIn, signUp(" chef@veraluz.cm "));
    expect(created.tokens?.token).toBeTruthy();

    const again = await t.action(api.auth.signIn, {
      provider: "password", params: { email: "chef@veraluz.cm", password: "motdepasse-solide", flow: "signIn" },
    });
    expect(again.tokens?.refreshToken).toBeTruthy();

    await expect(t.action(api.auth.signIn, {
      provider: "password", params: { email: "chef@veraluz.cm", password: "mauvais-mot-de-passe", flow: "signIn" },
    })).rejects.toThrow();
  });

  it("refuse un mot de passe trop court", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.users.allowEmail, { email: "chef@veraluz.cm" });
    await expect(t.action(api.auth.signIn, signUp("chef@veraluz.cm", "court"))).rejects.toThrow("10 caractères");
  });
});
