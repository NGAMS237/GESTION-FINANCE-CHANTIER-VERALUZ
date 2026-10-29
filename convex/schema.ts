import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    budget: v.number(),
    currency: v.string(),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    status: v.string(),
    color: v.string(),
    owner_name: v.optional(v.string()),
    position: v.number(),
  }),

  categories: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.string(),
    position: v.number(),
  }).index("by_project", ["project_id"]),

  phases: defineTable({
    category_id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    status: v.string(),
  }).index("by_category", ["category_id"]),

  quotes: defineTable({
    phase_id: v.id("phases"),
    supplier_id: v.optional(v.id("suppliers")),
    number: v.optional(v.string()),
    description: v.string(),
    date: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_phase", ["phase_id"])
    .index("by_supplier", ["supplier_id"]),

  payments: defineTable({
    quote_id: v.id("quotes"),
    date: v.string(),
    amount: v.number(),
    method: v.string(),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  }).index("by_quote", ["quote_id"]),

  suppliers: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    speciality: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["project_id"]),
});
