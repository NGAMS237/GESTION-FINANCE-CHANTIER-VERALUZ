import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import { setup } from "./setup";

async function seed(as: Awaited<ReturnType<typeof setup>>["as"]) {
  const projectId = await as.mutation(api.projects.create, {
    name: "Résidence Veraluz", budget: 150_000_000, location: "Kribi",
  });
  const categoryId = await as.mutation(api.categories.create, {
    project_id: projectId, name: "Gros œuvre",
  });
  const phaseId = await as.mutation(api.phases.create, {
    category_id: categoryId, name: "Fondations", status: "en_cours",
  });
  const supplierId = await as.mutation(api.suppliers.create, {
    project_id: projectId, name: "BTP Kribi",
  });
  const quoteId = await as.mutation(api.quotes.create, {
    phase_id: phaseId, supplier_id: supplierId, description: "Béton", amount: 2_000_000, status: "approved",
  });
  return { projectId, categoryId, phaseId, supplierId, quoteId };
}

describe("accès", () => {
  it("refuse un appel sans connexion", async () => {
    const { t } = await setup();
    await expect(t.query(api.workspace.load, {})).rejects.toThrow("Non authentifié");
  });

  it("refuse un utilisateur hors liste blanche", async () => {
    const { as } = await setup({ allowed: false });
    await expect(as.query(api.workspace.load, {})).rejects.toThrow("Accès refusé");
    await expect(as.mutation(api.projects.create, { name: "X", budget: 0 })).rejects.toThrow("Accès refusé");
  });

  it("coupe l'accès dès que l'adresse est retirée", async () => {
    const { t, as } = await setup({ email: "Chef@Veraluz.cm".toLowerCase() });
    await as.query(api.workspace.load, {});
    await t.mutation(internal.users.revokeEmail, { email: " CHEF@veraluz.cm " });
    await expect(as.query(api.workspace.load, {})).rejects.toThrow("Accès refusé");
  });
});

describe("données du chantier", () => {
  it("renvoie l'arbre catégorie → phase → devis → versements avec des id", async () => {
    const { as } = await setup();
    const { projectId, phaseId, quoteId, supplierId } = await seed(as);

    await as.mutation(api.quotes.update, {
      id: quoteId, phase_id: phaseId, supplier_id: supplierId, description: "Béton armé",
      amount: 2_500_000, status: "approved",
      payment: { date: "2026-10-01", amount: 1_000_000, method: "virement", note: "Acompte" },
    });

    const ws = await as.query(api.workspace.load, {});
    expect(ws.activeProjectId).toBe(projectId);
    const quote = ws.categories[0]?.project_phases[0]?.project_quotes[0];
    expect(quote?.id).toBe(quoteId);
    expect(quote?.description).toBe("Béton armé");
    expect(quote?.project_payments).toMatchObject([{ amount: 1_000_000, note: "Acompte" }]);
    expect(ws.suppliers.map((s) => s.name)).toEqual(["BTP Kribi"]);
  });

  it("n'enregistre ni le devis ni le versement si le versement est invalide", async () => {
    const { as } = await setup();
    const { phaseId, quoteId } = await seed(as);
    await expect(as.mutation(api.quotes.update, {
      id: quoteId, phase_id: phaseId, description: "Modifié", amount: 1,
      payment: { date: "2026-10-01", amount: 0 },
    })).rejects.toThrow("positif");
    const ws = await as.query(api.workspace.load, {});
    expect(ws.categories[0]?.project_phases[0]?.project_quotes[0]?.description).toBe("Béton");
  });

  it("supprime un projet et toutes ses données", async () => {
    const { t, as } = await setup();
    const { projectId, quoteId } = await seed(as);
    await as.mutation(api.payments.create, { quote_id: quoteId, date: "2026-10-02", amount: 500 });
    await as.mutation(api.projects.remove, { id: projectId });

    const counts = await t.run(async (ctx) => {
      const n = async (table: "projects" | "project_categories" | "project_phases" | "project_quotes" | "project_payments" | "project_suppliers") =>
        (await ctx.db.query(table).collect()).length;
      return [await n("projects"), await n("project_categories"), await n("project_phases"),
        await n("project_quotes"), await n("project_payments"), await n("project_suppliers")];
    });
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("détache le fournisseur supprimé de ses devis", async () => {
    const { as } = await setup();
    const { supplierId } = await seed(as);
    await as.mutation(api.suppliers.remove, { id: supplierId });
    const ws = await as.query(api.workspace.load, {});
    expect(ws.categories[0]?.project_phases[0]?.project_quotes[0]?.supplier_id).toBeNull();
  });

  it("refuse un versement nul ou négatif", async () => {
    const { as } = await setup();
    const { quoteId } = await seed(as);
    await expect(as.mutation(api.payments.create, { quote_id: quoteId, date: "2026-10-02", amount: -5 }))
      .rejects.toThrow("positif");
  });
});

describe("documents", () => {
  it("enregistre un fichier téléversé avec sa taille réelle et une URL", async () => {
    const { t, as } = await setup();
    const { projectId } = await seed(as);
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["%PDF-1.4 devis"], { type: "application/pdf" })));
    await as.mutation(api.documents.create, {
      project_id: projectId, storage_id: storageId, file_name: "devis.pdf", doc_type: "devis",
    });
    const ws = await as.query(api.workspace.load, {});
    expect(ws.documents[0]).toMatchObject({ file_name: "devis.pdf", file_size: 14, mime_type: "application/pdf" });
    expect(ws.documents[0]?.file_url).toBeTruthy();
  });
});
