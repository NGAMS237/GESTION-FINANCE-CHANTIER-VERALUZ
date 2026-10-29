import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/access";
import { deleteDocument } from "./lib/cascade";
import { must, nullable } from "./lib/rows";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Enregistre une fiche document, avec le fichier déjà téléversé via `generateUploadUrl` s'il y en a un. */
export const create = mutation({
  args: {
    project_id: v.id("projects"),
    cat_id: nullable(v.id("project_categories")),
    storage_id: nullable(v.id("_storage")),
    file_name: nullable(v.string()),
    name: nullable(v.string()),
    doc_type: nullable(v.string()),
    supplier_id: nullable(v.id("project_suppliers")),
    doc_date: nullable(v.string()),
    amount: nullable(v.number()),
    description: nullable(v.string()),
  },
  handler: async (ctx, data) => {
    await requireUser(ctx);
    must(await ctx.db.get(data.project_id), "Projet");
    if (data.supplier_id) must(await ctx.db.get(data.supplier_id), "Fournisseur");
    if (data.cat_id) must(await ctx.db.get(data.cat_id), "Catégorie");
    if (!data.storage_id) {
      return await ctx.db.insert("project_documents", { ...data, file_size: null, mime_type: null });
    }
    // Taille et type viennent des métadonnées du stockage, pas du client.
    const file = must(await ctx.db.system.get(data.storage_id), "Fichier");
    if (file.size > MAX_FILE_SIZE) {
      await ctx.storage.delete(data.storage_id);
      throw new ConvexError("Fichier trop volumineux (20 Mo maximum)");
    }
    return await ctx.db.insert("project_documents", {
      ...data,
      file_size: file.size,
      mime_type: file.contentType ?? null,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("project_documents") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await deleteDocument(ctx, id);
  },
});
