import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v, type Validator } from "convex/values";

// Les champs gardent les noms snake_case des tables Supabase : le frontend
// existant les lit tels quels. `legacy_id` conserve l'UUID Supabase pour l'import.
const nullable = <T extends Validator<any, "required", any>>(t: T) =>
  v.optional(v.union(t, v.null()));

export default defineSchema({
  ...authTables,

  // Seules ces adresses peuvent créer un compte et appeler les fonctions.
  allowed_emails: defineTable({
    email: v.string(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    location: nullable(v.string()),
    owner_name: nullable(v.string()),
    budget: v.number(),
    start_date: nullable(v.string()),
    description: nullable(v.string()),
    color: nullable(v.string()),
    position: v.number(),
    legacy_id: v.optional(v.string()),
  }).index("by_legacy_id", ["legacy_id"]),

  project_categories: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    description: nullable(v.string()),
    color: nullable(v.string()),
    position: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_project", ["project_id", "position"])
    .index("by_legacy_id", ["legacy_id"]),

  project_phases: defineTable({
    category_id: v.id("project_categories"),
    name: v.string(),
    description: nullable(v.string()),
    status: nullable(v.string()),
    position: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_category", ["category_id", "position"])
    .index("by_legacy_id", ["legacy_id"]),

  project_suppliers: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    speciality: nullable(v.string()),
    phone: nullable(v.string()),
    email: nullable(v.string()),
    address: nullable(v.string()),
    notes: nullable(v.string()),
    legacy_id: v.optional(v.string()),
  })
    .index("by_project", ["project_id"])
    .index("by_legacy_id", ["legacy_id"]),

  project_quotes: defineTable({
    phase_id: v.id("project_phases"),
    supplier_id: nullable(v.id("project_suppliers")),
    number: nullable(v.string()),
    description: v.string(),
    date: nullable(v.string()),
    amount: v.number(),
    status: nullable(v.string()),
    notes: nullable(v.string()),
    legacy_id: v.optional(v.string()),
  })
    .index("by_phase", ["phase_id"])
    .index("by_supplier", ["supplier_id"])
    .index("by_legacy_id", ["legacy_id"]),

  project_payments: defineTable({
    quote_id: v.id("project_quotes"),
    date: v.string(),
    amount: v.number(),
    method: nullable(v.string()),
    reference: nullable(v.string()),
    note: nullable(v.string()),
    legacy_id: v.optional(v.string()),
  })
    .index("by_quote", ["quote_id"])
    .index("by_legacy_id", ["legacy_id"]),

  project_documents: defineTable({
    project_id: v.id("projects"),
    cat_id: nullable(v.id("project_categories")),
    // Absent pour une fiche sans fichier joint.
    storage_id: nullable(v.id("_storage")),
    name: nullable(v.string()),
    doc_type: nullable(v.string()),
    supplier_id: nullable(v.id("project_suppliers")),
    doc_date: nullable(v.string()),
    amount: nullable(v.number()),
    description: nullable(v.string()),
    file_name: nullable(v.string()),
    file_size: nullable(v.number()),
    mime_type: nullable(v.string()),
    // Date de création Supabase, conservée à l'import ; sinon _creationTime.
    created_at: v.optional(v.string()),
    legacy_id: v.optional(v.string()),
  })
    .index("by_project", ["project_id"])
    .index("by_supplier", ["supplier_id"])
    .index("by_legacy_id", ["legacy_id"]),
});
